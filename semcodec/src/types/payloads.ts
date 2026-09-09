/**
 * @file payloads.ts
 * @description All data-contract types exchanged between SemCodec Encoder and Decoder.
 *
 * The core design uses a discriminated union (SemCodecPayload) with a literal
 * `type` field, enabling exhaustive type narrowing on the receiver side without
 * any runtime instanceof checks.
 */

// ---------------------------------------------------------------------------
// Primitive Data Structures
// ---------------------------------------------------------------------------

/**
 * A serialized 3D facial landmark point.
 * Coordinates are normalized in the range [0.0, 1.0] relative to frame dimensions.
 */
export interface LandmarkPoint {
  /** Normalized X coordinate (0.0 = left, 1.0 = right) */
  readonly x: number;
  /** Normalized Y coordinate (0.0 = top, 1.0 = bottom) */
  readonly y: number;
  /** Normalized Z coordinate (depth relative to face) */
  readonly z: number;
}

/**
 * 2D motion displacement vector for the fringe region (hair and neck area).
 * Values are normalized in the same coordinate space as LandmarkPoint.
 * Computed as the mean displacement of the 36 boundary landmark indices.
 */
export interface BoundaryVector {
  /** Normalized horizontal displacement */
  readonly dx: number;
  /** Normalized vertical displacement */
  readonly dy: number;
}

// ---------------------------------------------------------------------------
// Payload Types
// ---------------------------------------------------------------------------

/**
 * Full reference frame payload.
 *
 * Emitted by the Encoder at the configured `keyframeInterval` or when
 * face tracking is first acquired. Contains all data required to establish
 * a new reconstruction baseline on the receiver side.
 *
 * The `frame` and `fringeMask` fields carry Base64-encoded JPEG/PNG data.
 * In a production integration, the host application may transmit these as
 * binary buffers to reduce overhead.
 */
export interface FullPayload {
  /** Discriminant — always 'FULL' */
  readonly type: 'FULL';
  /** Sequential frame index, starting from 1 */
  readonly frameIndex: number;
  /** Base64-encoded JPEG of the full reference frame */
  readonly frame: string;
  /**
   * Base64-encoded grayscale PNG of the fringe mask.
   * The fringe region = (full head mask) − (inner face mask).
   * This mask drives the boundary area motion during reconstruction.
   */
  readonly fringeMask: string;
  /** Complete set of 478 serialized MediaPipe Face Mesh landmarks */
  readonly landmarks: LandmarkPoint[];
}

/**
 * Semantic motion delta payload.
 *
 * Emitted for all frames that are NOT keyframes. Contains no pixel data —
 * only the target landmark positions and a 2D boundary vector.
 * The receiver uses these to warp the cached reference frame and generate
 * the intermediate frame.
 *
 * This is the payload type that drives the ~70% bandwidth savings.
 */
export interface MotionPayload {
  /** Discriminant — always 'MOTION' */
  readonly type: 'MOTION';
  /** Sequential frame index */
  readonly frameIndex: number;
  /** Target landmark positions for the current frame */
  readonly targetLandmarks: LandmarkPoint[];
  /** Displacement vector for the fringe (hair/neck) region */
  readonly boundaryVector: BoundaryVector;
}

/**
 * The primary discriminated union type produced by the Encoder.
 *
 * @example
 * ```typescript
 * const payload = await encoder.encode(frame, timestamp);
 * if (payload?.type === 'FULL') {
 *   // TypeScript knows payload is FullPayload here
 *   transmit(payload.frame);
 * } else if (payload?.type === 'MOTION') {
 *   // TypeScript knows payload is MotionPayload here
 *   transmit(payload.boundaryVector);
 * }
 * ```
 */
export type SemCodecPayload = FullPayload | MotionPayload;

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

/**
 * Per-frame encoding statistics emitted via the `onFrameStats` callback.
 * Use these to implement adaptive bitrate control, monitoring dashboards,
 * or bandwidth measurement in the host application.
 */
export interface EncoderStats {
  /** The frame index this stat corresponds to */
  readonly frameIndex: number;
  /** Whether a FULL or MOTION packet was emitted for this frame */
  readonly payloadType: 'FULL' | 'MOTION';
  /** Approximate serialized size of the payload in bytes (JSON length) */
  readonly payloadSizeBytes: number;
  /** Total encoder processing time for this frame in milliseconds */
  readonly processingTimeMs: number;
  /** Number of FULL payloads sent since encoder initialization */
  readonly totalKeyframes: number;
  /** Number of MOTION payloads sent since encoder initialization */
  readonly totalMotionFrames: number;
}

/**
 * Per-frame decoding statistics emitted via the `onFrameStats` callback.
 */
export interface DecoderStats {
  /** The frame index this stat corresponds to */
  readonly frameIndex: number;
  /** The payload type received */
  readonly payloadType: 'FULL' | 'MOTION';
  /** Total decoder reconstruction time for this frame in milliseconds */
  readonly processingTimeMs: number;
}
