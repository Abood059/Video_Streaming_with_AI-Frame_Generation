import { describe, it, expect, vi } from 'vitest';
import { Decoder } from '../src/core/Decoder';
import type { MotionPayload } from '../src/types';

// Mock dependencies
vi.mock('@mediapipe/tasks-vision', () => {
  return {
    FaceLandmarker: {
      createFromOptions: vi.fn().mockResolvedValue({})
    },
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({})
    }
  };
});

describe('Decoder', () => {
  it('constructs without error', () => {
    const decoder = new Decoder();
    expect(decoder).toBeInstanceOf(Decoder);
  });

  it('throws error if decode called before initialize', async () => {
    const decoder = new Decoder();
    const motionPayload: MotionPayload = {
      type: 'MOTION',
      frameIndex: 2,
      targetLandmarks: [],
      boundaryVector: { dx: 0, dy: 0 },
    };
    await expect(decoder.decode(motionPayload)).rejects.toThrow(/not initialized/);
  });

  it('returns null on MOTION payload before any FULL payload', async () => {
    const decoder = new Decoder();
    await decoder.initialize();
    
    const motionPayload: MotionPayload = {
      type: 'MOTION',
      frameIndex: 2,
      targetLandmarks: [],
      boundaryVector: { dx: 0, dy: 0 },
    };
    
    // Should return null because refFrame is null
    const result = await decoder.decode(motionPayload);
    expect(result).toBeNull();
  });
});
