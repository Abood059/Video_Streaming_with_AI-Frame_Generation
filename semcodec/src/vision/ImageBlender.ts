import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { BoundaryVector } from '../types/payloads';
import type { ResolvedConfig } from '../types/config';

export class ImageBlender {
  private prevLandmarks: NormalizedLandmark[] | null = null;
  private prevNoise: Float32Array | null = null;
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  private width: number;
  private height: number;

  constructor(width: number, height: number, private readonly config: ResolvedConfig) {
    this.width = width > 0 ? width : 1;
    this.height = height > 0 ? height : 1;
    this.canvas = new OffscreenCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  private updateDimensions(width: number, height: number) {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Applies the semantic motion and temporal noise to generate the reconstructed frame.
   * Uses native HTML5 Canvas transforms to approximate OpenCV's warpPerspective/warpAffine.
   */
  applyHybridMotion(
    referenceFrame: ImageData,
    baseLandmarks: NormalizedLandmark[],
    targetLandmarks: NormalizedLandmark[],
    fringeMask: ImageData,
    boundaryVec: BoundaryVector
  ): ImageData {
    this.updateDimensions(referenceFrame.width, referenceFrame.height);

    // 1. Adaptive Motion Smoothing for face landmarks
    let finalPts = targetLandmarks;
    if (this.prevLandmarks) {
      // Simplistic adaptive smoothing approximation
      const dynamicAlpha = Math.min(0.8, this.config.motionSmoothingFactor * 2);
      finalPts = targetLandmarks.map((pt, i) => ({
        x: pt.x * dynamicAlpha + this.prevLandmarks![i]!.x * (1 - dynamicAlpha),
        y: pt.y * dynamicAlpha + this.prevLandmarks![i]!.y * (1 - dynamicAlpha),
        z: pt.z * dynamicAlpha + this.prevLandmarks![i]!.z * (1 - dynamicAlpha),
        visibility: pt.visibility,
        presence: pt.presence
      }));
    }
    this.prevLandmarks = finalPts;

    // 2. Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 3. Draw Fringe (Background/Hair) with boundary vector shift
    // Emulates cv2.warpAffine for the fringe area
    this.ctx.save();
    this.ctx.translate(boundaryVec.dx * this.width, boundaryVec.dy * this.height);
    this.ctx.putImageData(referenceFrame, 0, 0); // Put reference directly
    // To apply transform to ImageData, we must draw it to a temp canvas first
    const tempCanvas = new OffscreenCanvas(this.width, this.height);
    tempCanvas.getContext('2d')!.putImageData(referenceFrame, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(tempCanvas, 0, 0);
    this.ctx.restore();

    // 4. Draw Face Area
    // Simplified homography: compute bounding box translation and scale for the face
    this.ctx.save();
    
    // Create face mask cutout
    const faceMaskCanvas = new OffscreenCanvas(this.width, this.height);
    const faceCtx = faceMaskCanvas.getContext('2d')!;
    faceCtx.putImageData(referenceFrame, 0, 0);
    faceCtx.globalCompositeOperation = 'destination-in';
    
    // Invert the fringe mask to get the face mask
    const invertedFringe = new OffscreenCanvas(this.width, this.height);
    const invCtx = invertedFringe.getContext('2d')!;
    invCtx.putImageData(fringeMask, 0, 0);
    invCtx.globalCompositeOperation = 'source-in';
    invCtx.fillStyle = 'white';
    invCtx.fillRect(0, 0, this.width, this.height);
    invCtx.globalCompositeOperation = 'difference';
    invCtx.fillStyle = 'white';
    invCtx.fillRect(0, 0, this.width, this.height); // Now inverted

    faceCtx.drawImage(invertedFringe, 0, 0); // Apply face mask

    // Calculate centroid offset for basic motion
    const baseCx = baseLandmarks.reduce((sum, lm) => sum + lm.x, 0) / baseLandmarks.length;
    const baseCy = baseLandmarks.reduce((sum, lm) => sum + lm.y, 0) / baseLandmarks.length;
    const targetCx = finalPts.reduce((sum, lm) => sum + lm.x, 0) / finalPts.length;
    const targetCy = finalPts.reduce((sum, lm) => sum + lm.y, 0) / finalPts.length;
    
    const dx = (targetCx - baseCx) * this.width;
    const dy = (targetCy - baseCy) * this.height;

    // Draw the warped/translated face over the fringe
    this.ctx.translate(dx, dy);
    this.ctx.drawImage(faceMaskCanvas, 0, 0);
    this.ctx.restore();

    // 5. Temporal Noise Injection (Simulated with simple Canvas noise/grain)
    if (this.config.enableTemporalNoise) {
       // High performance noise approximation (skipping full per-pixel iteration for speed)
       this.ctx.fillStyle = `rgba(128, 128, 128, ${this.config.noiseStdDev / 100})`;
       this.ctx.globalCompositeOperation = 'overlay';
       this.ctx.fillRect(0, 0, this.width, this.height);
       this.ctx.globalCompositeOperation = 'source-over';
    }

    return this.ctx.getImageData(0, 0, this.width, this.height);
  }

  /**
   * Encodes ImageData to a Base64 string (JPEG or PNG).
   */
  async encodeToBase64(imageData: ImageData, quality: number = 85, format: 'image/jpeg'|'image/png' = 'image/jpeg'): Promise<string> {
    this.updateDimensions(imageData.width, imageData.height);
    this.ctx.putImageData(imageData, 0, 0);
    
    const blob = await this.canvas.convertToBlob({ type: format, quality: quality / 100 });
    const buffer = await blob.arrayBuffer();
    
    // Convert ArrayBuffer to Base64 (browser compatible)
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  /**
   * Decodes a Base64 string back to ImageData.
   */
  async decodeFromBase64(base64: string, format: 'image/jpeg'|'image/png' = 'image/jpeg'): Promise<ImageData> {
    const response = await fetch(`data:${format};base64,${base64}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    
    this.updateDimensions(bitmap.width, bitmap.height);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(bitmap, 0, 0);
    
    return this.ctx.getImageData(0, 0, this.width, this.height);
  }
}
