import type { SemCodecPayload, FullPayload, MotionPayload, EncoderStats } from '../types/payloads';
import type { SemCodecConfig, ResolvedConfig } from '../types/config';
import { resolveConfig } from '../utils/config';
import { FaceTracker } from '../vision/FaceTracker';
import { SemanticSegmenter } from '../vision/SemanticSegmenter';
import { ImageBlender } from '../vision/ImageBlender';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type OnStatsCallback = (stats: EncoderStats) => void;

export class Encoder {
  private readonly config: ResolvedConfig;
  private tracker: FaceTracker;
  private segmenter: SemanticSegmenter;
  private blender: ImageBlender;
  
  private frameIndex = 0;
  private totalKeyframes = 0;
  private totalMotionFrames = 0;
  
  private lastLandmarks: NormalizedLandmark[] | null = null;
  private onStats?: OnStatsCallback;
  
  private initialized = false;

  constructor(config?: SemCodecConfig) {
    this.config = resolveConfig(config);
    this.tracker = new FaceTracker();
    this.segmenter = new SemanticSegmenter();
    // Default size 1x1, updates dynamically on first encode
    this.blender = new ImageBlender(1, 1, this.config);
  }

  /**
   * Initializes the encoder by downloading and loading MediaPipe WASM models.
   * Must be called once before encode().
   */
  async initialize(): Promise<void> {
    await this.tracker.initialize(this.config);
    await this.segmenter.initialize(this.config);
    this.initialized = true;
  }

  /**
   * Encodes a single video frame.
   *
   * @param frame - Raw ImageData from a canvas or video element capture.
   * @param timestampMs - Frame timestamp in milliseconds.
   * @returns A SemCodecPayload to transmit, or null if no face is detected.
   */
  async encode(
    frame: ImageData | HTMLVideoElement | HTMLCanvasElement | ImageBitmap, 
    timestampMs: number
  ): Promise<SemCodecPayload | null> {
    if (!this.initialized) throw new Error('Encoder not initialized. Call initialize() first.');
    
    const t0 = performance.now();
    this.frameIndex++;

    const landmarks = this.tracker.getLandmarks(frame, timestampMs);
    if (!landmarks) {
      // No face detected, skip frame
      return null;
    }

    let payload: SemCodecPayload;
    const isKeyframe = 
      this.frameIndex === 1 || 
      this.lastLandmarks === null || 
      this.frameIndex % this.config.keyframeInterval === 0;

    if (isKeyframe) {
      const { fringeMask } = this.segmenter.getMasks(frame, landmarks, timestampMs);
      
      // Ensure we have an ImageData object for Blender
      let frameImageData: ImageData;
      if (frame instanceof ImageData) {
        frameImageData = frame;
      } else {
        const w = (frame as HTMLVideoElement).videoWidth || frame.width;
        const h = (frame as HTMLVideoElement).videoHeight || frame.height;
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(frame as any, 0, 0);
        frameImageData = ctx.getImageData(0, 0, w, h);
      }

      payload = {
        type: 'FULL',
        frameIndex: this.frameIndex,
        frame: await this.blender.encodeToBase64(frameImageData, this.config.jpegQuality, 'image/jpeg'),
        fringeMask: await this.blender.encodeToBase64(fringeMask, 100, 'image/png'),
        landmarks: this.tracker.serializeLandmarks(landmarks),
      } satisfies FullPayload;
      
      this.totalKeyframes++;
    } else {
      const boundaryVector = this.tracker.getBoundaryMotion(this.lastLandmarks!, landmarks);
      payload = {
        type: 'MOTION',
        frameIndex: this.frameIndex,
        targetLandmarks: this.tracker.serializeLandmarks(landmarks),
        boundaryVector,
      } satisfies MotionPayload;
      
      this.totalMotionFrames++;
    }

    this.lastLandmarks = landmarks;

    const processingTimeMs = performance.now() - t0;
    const payloadStr = JSON.stringify(payload);

    this.onStats?.({
      frameIndex: this.frameIndex,
      payloadType: payload.type,
      payloadSizeBytes: payloadStr.length, // Rough byte size estimate
      processingTimeMs,
      totalKeyframes: this.totalKeyframes,
      totalMotionFrames: this.totalMotionFrames,
    });

    return payload;
  }

  /**
   * Registers a callback to receive per-frame encoding statistics.
   */
  onFrameStats(callback: OnStatsCallback): this {
    this.onStats = callback;
    return this;
  }

  /**
   * Resets the encoder state. Call when switching video sources or handling reconnections.
   */
  reset(): void {
    this.frameIndex = 0;
    this.totalKeyframes = 0;
    this.totalMotionFrames = 0;
    this.lastLandmarks = null;
  }
}
