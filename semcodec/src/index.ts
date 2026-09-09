// Core codec classes
export { Encoder } from './core/Encoder';
export { Decoder } from './core/Decoder';

// Type definitions (payload contracts)
export type {
  SemCodecPayload,
  FullPayload,
  MotionPayload,
  LandmarkPoint,
  BoundaryVector,
  EncoderStats,
  DecoderStats
} from './types/payloads';

// Configuration interface
export type { SemCodecConfig } from './types/config';
