import { FaceLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { LandmarkPoint, BoundaryVector } from '../types/payloads';
import type { ResolvedConfig } from '../types/config';

// The 36 boundary landmark indices (jawline + hairline perimeter)
// Used to calculate the average motion of the fringe region (hair/neck)
const BOUNDARY_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;

  /**
   * Initializes the MediaPipe FaceLandmarker WASM module and model.
   */
  async initialize(config: ResolvedConfig): Promise<void> {
    const filesetResolver = await FilesetResolver.forVisionTasks(config.wasmFilePath);
    this.landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: config.faceLandmarkerModelPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: config.minDetectionConfidence,
      minFacePresenceConfidence: config.minDetectionConfidence,
      minTrackingConfidence: config.minTrackingConfidence,
    });
  }

  /**
   * Extracts face landmarks from a video frame.
   *
   * @param videoFrame - The current video frame element or canvas
   * @param timestampMs - Frame timestamp in milliseconds
   * @returns Array of landmarks, or null if no face is detected
   */
  getLandmarks(
    videoFrame: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    timestampMs: number
  ): NormalizedLandmark[] | null {
    if (!this.landmarker) throw new Error('FaceTracker not initialized');

    // detectForVideo expects HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
    const result = this.landmarker.detectForVideo(videoFrame as any, timestampMs);

    return result.faceLandmarks && result.faceLandmarks.length > 0
      ? result.faceLandmarks[0]!
      : null;
  }

  /**
   * Serializes MediaPipe landmarks to the network payload format.
   */
  serializeLandmarks(landmarks: NormalizedLandmark[]): LandmarkPoint[] {
    return landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }));
  }

  /**
   * Deserializes network payload landmarks back to MediaPipe format.
   */
  deserializeLandmarks(data: LandmarkPoint[]): NormalizedLandmark[] {
    return data.map((lm) => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: 1.0,
      presence: 1.0,
    }));
  }

  /**
   * Calculates the average motion vector of the face boundary between two frames.
   * This drives the motion of the background/hair area in the decoder.
   */
  getBoundaryMotion(prev: NormalizedLandmark[], curr: NormalizedLandmark[]): BoundaryVector {
    if (!prev || !curr) return { dx: 0, dy: 0 };

    let dxSum = 0;
    let dySum = 0;

    for (const idx of BOUNDARY_INDICES) {
      dxSum += curr[idx]!.x - prev[idx]!.x;
      dySum += curr[idx]!.y - prev[idx]!.y;
    }

    const len = BOUNDARY_INDICES.length;
    return { dx: dxSum / len, dy: dySum / len };
  }
}
