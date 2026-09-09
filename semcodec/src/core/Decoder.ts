import type { SemCodecPayload, DecoderStats } from '../types/payloads';
import type { SemCodecConfig, ResolvedConfig } from '../types/config';
import { resolveConfig } from '../utils/config';
import { FaceTracker } from '../vision/FaceTracker';
import { ImageBlender } from '../vision/ImageBlender';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type OnDecoderStatsCallback = (stats: DecoderStats) => void;

export class Decoder {
  private readonly config: ResolvedConfig;
  private tracker: FaceTracker;
  private blender: ImageBlender;
  
  private refFrame: ImageData | null = null;
  private refLandmarks: NormalizedLandmark[] | null = null;
  private fringeMask: ImageData | null = null;
  private lastFrame: ImageData | null = null;

  private initialized = false;
  private onStats?: OnDecoderStatsCallback;

  constructor(config?: SemCodecConfig) {
    this.config = resolveConfig(config);
    this.tracker = new FaceTracker();
    this.blender = new ImageBlender(1, 1, this.config);
  }

  /**
   * Initializes the decoder by loading MediaPipe WASM models.
   * Required for FaceTracker deserialization mapping if needed.
   */
  async initialize(): Promise<void> {
    await this.tracker.initialize(this.config);
    this.initialized = true;
  }

  /**
   * Decodes a received payload into a displayable frame.
   *
   * @param payload - A SemCodecPayload received from the network.
   * @returns Reconstructed ImageData ready to draw to a canvas.
   */
  async decode(payload: SemCodecPayload): Promise<ImageData | null> {
    if (!this.initialized) throw new Error('Decoder not initialized. Call initialize() first.');
    
    const t0 = performance.now();

    if (payload.type === 'FULL') {
      const frame = await this.blender.decodeFromBase64(payload.frame, 'image/jpeg');
      const mask = await this.blender.decodeFromBase64(payload.fringeMask, 'image/png');
      
      this.refFrame = frame;
      this.refLandmarks = this.tracker.deserializeLandmarks(payload.landmarks);
      this.fringeMask = mask;
      this.lastFrame = frame;
      
      this.emitStats(payload.frameIndex, payload.type, performance.now() - t0);
      return frame;
    }

    if (payload.type === 'MOTION') {
      if (!this.refFrame || !this.refLandmarks || !this.fringeMask) {
        // We received a motion payload but don't have a reference frame yet.
        // Wait for the next FULL keyframe.
        return null;
      }
      
      const targetLandmarks = this.tracker.deserializeLandmarks(payload.targetLandmarks);
      const generated = this.blender.applyHybridMotion(
        this.refFrame, 
        this.refLandmarks, 
        targetLandmarks,
        this.fringeMask, 
        payload.boundaryVector
      );

      // Temporal blending with previous frame for visual consistency
      const final = this.blendWithPrev(generated, this.lastFrame);
      this.lastFrame = final;
      
      this.emitStats(payload.frameIndex, payload.type, performance.now() - t0);
      return final;
    }

    return null;
  }

  private blendWithPrev(current: ImageData, prev: ImageData | null): ImageData {
    if (!prev) return current;
    
    const w = this.config.blendWeight;
    if (w >= 1.0) return current;
    if (w <= 0.0) return prev;
    
    const out = new ImageData(current.width, current.height);
    for (let i = 0; i < current.data.length; i++) {
      // Alpha channel remains 255
      if ((i + 1) % 4 === 0) {
          out.data[i] = 255;
          continue;
      }
      out.data[i] = (current.data[i]! * w + prev.data[i]! * (1 - w));
    }
    return out;
  }

  /**
   * Registers a callback to receive per-frame decoding statistics.
   */
  onFrameStats(callback: OnDecoderStatsCallback): this {
    this.onStats = callback;
    return this;
  }

  private emitStats(frameIndex: number, type: 'FULL'|'MOTION', time: number) {
      this.onStats?.({
          frameIndex,
          payloadType: type,
          processingTimeMs: time
      });
  }

  /**
   * Resets decoder state. Call when reconnecting or switching stream.
   */
  reset(): void {
    this.refFrame = null;
    this.refLandmarks = null;
    this.fringeMask = null;
    this.lastFrame = null;
  }
}
