import { ImageSegmenter, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { ResolvedConfig } from '../types/config';

export interface MaskResult {
  /** Binary mask of the hair/neck (fringe) area */
  fringeMask: ImageData;
}

export class SemanticSegmenter {
  private segmenter: ImageSegmenter | null = null;
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  private width: number = 1;
  private height: number = 1;

  constructor() {
    this.canvas = new OffscreenCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Initializes the MediaPipe ImageSegmenter WASM module and model.
   */
  async initialize(config: ResolvedConfig): Promise<void> {
    const filesetResolver = await FilesetResolver.forVisionTasks(config.wasmFilePath);
    this.segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: config.selfieSegmenterModelPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
    });
  }

  /**
   * Adjusts internal canvas size if the video stream dimensions change.
   */
  private updateDimensions(width: number, height: number): void {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Extracts the "fringe" mask: the person's head/hair/neck minus the inner face.
   *
   * Replaces Python's `cv2.bitwise_and(full_head, cv2.bitwise_not(face_mask))`
   * with HTML5 Canvas `globalCompositeOperation = 'destination-out'`.
   */
  getMasks(
    frame: ImageData | HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    landmarks: NormalizedLandmark[],
    timestampMs: number
  ): MaskResult {
    if (!this.segmenter) throw new Error('SemanticSegmenter not initialized');

    let w: number;
    let h: number;
    if (frame instanceof ImageData || frame instanceof ImageBitmap) {
      w = frame.width;
      h = frame.height;
    } else {
      w = (frame as HTMLVideoElement).videoWidth || frame.width;
      h = (frame as HTMLVideoElement).videoHeight || frame.height;
    }
    this.updateDimensions(w, h);

    // 1. Get the full head/body mask from MediaPipe (Selfie Segmentation)
    const result = this.segmenter.segmentForVideo(frame as any, timestampMs);
    const categoryMask = result.categoryMasks?.[0];
    
    if (!categoryMask) {
      return { fringeMask: new ImageData(this.width, this.height) };
    }

    // Clear canvas
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw the full head mask.
    // MediaPipe's WebGL mask can usually be drawn directly, or we create an ImageData
    if (categoryMask instanceof WebGLTexture || categoryMask instanceof ImageBitmap) {
       this.ctx.drawImage(categoryMask as ImageBitmap, 0, 0, this.width, this.height);
    } else {
       // Fallback for Uint8Array category mask where 255 is person, 0 is background
       const maskData = categoryMask.getAsUint8Array();
       const imgData = this.ctx.createImageData(this.width, this.height);
       for (let i = 0; i < maskData.length; i++) {
         const val = maskData[i]! === 255 || maskData[i]! > 0 ? 255 : 0;
         const idx = i * 4;
         imgData.data[idx] = val;
         imgData.data[idx + 1] = val;
         imgData.data[idx + 2] = val;
         imgData.data[idx + 3] = val; // fully opaque or fully transparent
       }
       this.ctx.putImageData(imgData, 0, 0);
    }

    // 2. Cut out the inner face using destination-out composite mode
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    this.ctx.beginPath();
    
    // Calculate the convex hull of the face (simplification: we just draw the polygon of landmarks)
    // MediaPipe face mesh has an outer perimeter (silhouette) which we can use
    if (landmarks.length > 0) {
      const startPoint = landmarks[0]!;
      this.ctx.moveTo(startPoint.x * this.width, startPoint.y * this.height);
      // We could compute a real convex hull, but drawing the facial points roughly 
      // masks out the center face. For precision, let's use the bounding points.
      // (Simplified: just tracing all landmarks will fill the interior)
      // A proper convex hull in JS would be better, but tracing points works reasonably well.
      // We'll draw the entire set of points and let canvas fill handle the interior.
      for (const lm of landmarks) {
        this.ctx.lineTo(lm.x * this.width, lm.y * this.height);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill(); // Removes the inner face from the full mask

    // 3. Extract the final fringe mask
    const fringeMask = this.ctx.getImageData(0, 0, this.width, this.height);

    return { fringeMask };
  }
}
