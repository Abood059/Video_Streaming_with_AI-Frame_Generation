/**
 * @file config.ts
 * @description SemCodec library configuration interfaces.
 *
 * All settings have carefully chosen defaults that balance quality
 * and bandwidth reduction out-of-the-box. Developers may override
 * any subset of these values at construction time.
 */

/**
 * SemCodec library configuration.
 *
 * Pass a partial config object to the `Encoder` or `Decoder` constructor.
 * Any omitted fields will fall back to their documented defaults.
 *
 * @example
 * ```typescript
 * // High-compression configuration
 * const encoder = new Encoder({
 *   keyframeInterval: 10,
 *   jpegQuality: 75,
 *   enableTemporalNoise: false,
 * });
 *
 * // High-quality configuration
 * const encoder = new Encoder({
 *   keyframeInterval: 3,
 *   jpegQuality: 95,
 *   blendWeight: 0.9,
 * });
 * ```
 */
export interface SemCodecConfig {
  /**
   * Keyframe interval: send one FULL reference frame every N frames.
   *
   * - Lower values → higher reconstruction quality, higher bandwidth usage.
   * - Higher values → stronger compression, lower bandwidth usage.
   *
   * At the default of 5, bandwidth savings are approximately 70–80%
   * compared to full-frame streaming.
   *
   * @default 5
   * @minimum 1
   */
  keyframeInterval?: number;

  /**
   * JPEG compression quality applied to reference frame payloads (0–100).
   *
   * This only affects FULL payloads. MOTION payloads contain no image data
   * and are unaffected by this setting.
   *
   * @default 85
   * @minimum 0
   * @maximum 100
   */
  jpegQuality?: number;

  /**
   * MediaPipe Face Landmarker minimum detection confidence threshold.
   *
   * Frames where the detected face confidence falls below this value are
   * treated as "no face detected" and the encoder returns null.
   *
   * @default 0.5
   * @minimum 0.0
   * @maximum 1.0
   */
  minDetectionConfidence?: number;

  /**
   * MediaPipe Face Landmarker minimum tracking confidence threshold.
   *
   * When tracking confidence falls below this value, MediaPipe re-triggers
   * detection from scratch, which may cause a brief latency spike.
   *
   * @default 0.5
   * @minimum 0.0
   * @maximum 1.0
   */
  minTrackingConfidence?: number;

  /**
   * Adaptive motion smoothing base factor.
   *
   * Controls how aggressively landmark positions are smoothed between frames.
   * The actual smoothing factor is dynamic: it scales up during fast motion
   * and scales down during stillness to prevent the "frozen" artifact.
   *
   * Formula: `alpha = clamp(baseFactor + (avgDist * 45), 0, 0.8)`
   *
   * @default 0.15
   * @minimum 0.0
   * @maximum 1.0
   */
  motionSmoothingFactor?: number;

  /**
   * Enable temporal noise injection for visual realism.
   *
   * Adds low-amplitude, temporally-correlated random noise to generated frames
   * to prevent them from appearing "too smooth" or "frozen" compared to the
   * reference frames. Disable for cleaner output at the cost of realism.
   *
   * @default true
   */
  enableTemporalNoise?: boolean;

  /**
   * Standard deviation of the temporal noise signal.
   *
   * Higher values add more visible grain. Only effective when
   * `enableTemporalNoise` is true.
   *
   * @default 2.2
   */
  noiseStdDev?: number;

  /**
   * Temporal frame blending weight.
   *
   * When the decoder generates a new frame, it blends it with the previous
   * frame for visual consistency:
   *   `final = (generated × blendWeight) + (previous × (1 − blendWeight))`
   *
   * - 1.0 = no blending (raw generated frame)
   * - 0.5 = equal blend between new and previous frame
   *
   * @default 0.7
   * @minimum 0.0
   * @maximum 1.0
   */
  blendWeight?: number;

  /**
   * Path or URL to the MediaPipe WASM runtime bundle directory.
   *
   * Override this when self-hosting the WASM files (recommended for
   * production to avoid CDN dependency).
   *
   * @default "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
   */
  wasmFilePath?: string;

  /**
   * Path or URL to the MediaPipe Face Landmarker model file (.task).
   *
   * Override this when self-hosting model files.
   *
   * @default "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
   */
  faceLandmarkerModelPath?: string;

  /**
   * Path or URL to the MediaPipe Image Segmenter model file (.task).
   *
   * Override this when self-hosting model files.
   *
   * @default "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task"
   */
  selfieSegmenterModelPath?: string;

  /**
   * Gaussian blur kernel radius for fringe mask softening (pixels).
   *
   * Higher values create a softer, more natural boundary between the
   * face and fringe regions. Must be odd.
   *
   * @default 25
   */
  maskBlurRadius?: number;

  /**
   * Noise temporal correlation factor (0.0–1.0).
   *
   * Controls blending between current and previous noise frame:
   *   `noise = (prevNoise × correlation) + (newNoise × (1 − correlation))`
   *
   * Higher values = smoother, slower-changing noise.
   *
   * @default 0.4
   */
  noiseTemporalCorrelation?: number;
}

/**
 * Fully resolved configuration with all defaults applied.
 * Used internally by the library — not exposed in the public API.
 *
 * @internal
 */
export type ResolvedConfig = Required<SemCodecConfig>;
