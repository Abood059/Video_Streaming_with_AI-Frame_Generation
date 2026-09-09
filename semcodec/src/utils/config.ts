import type { SemCodecConfig, ResolvedConfig } from '../types/config';

const DEFAULTS: ResolvedConfig = {
  keyframeInterval: 5,
  jpegQuality: 85,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  motionSmoothingFactor: 0.15,
  enableTemporalNoise: true,
  noiseStdDev: 2.2,
  blendWeight: 0.7,
  wasmFilePath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  faceLandmarkerModelPath:
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  selfieSegmenterModelPath:
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.task',
  maskBlurRadius: 25,
  noiseTemporalCorrelation: 0.4,
};

/**
 * Resolves a partial user configuration against the library's defaults.
 *
 * @param config - Optional partial configuration provided by the user.
 * @returns A fully resolved configuration object.
 */
export function resolveConfig(config?: SemCodecConfig): ResolvedConfig {
  return { ...DEFAULTS, ...config };
}
