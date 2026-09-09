import { describe, it, expect, vi } from 'vitest';
import { Encoder } from '../src/core/Encoder';

// Mock the MediaPipe classes
vi.mock('@mediapipe/tasks-vision', () => {
  return {
    FaceLandmarker: {
      createFromOptions: vi.fn().mockResolvedValue({
        detectForVideo: vi.fn().mockReturnValue({ faceLandmarks: [] }) // No faces by default
      })
    },
    ImageSegmenter: {
      createFromOptions: vi.fn().mockResolvedValue({
        segmentForVideo: vi.fn().mockReturnValue({ categoryMasks: [new Uint8Array(100)] })
      })
    },
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({})
    }
  };
});

describe('Encoder', () => {
  it('constructs with default config', () => {
    const encoder = new Encoder();
    expect(encoder).toBeInstanceOf(Encoder);
  });

  it('throws error if encode called before initialize', async () => {
    const encoder = new Encoder();
    const frame = new ImageData(10, 10);
    await expect(encoder.encode(frame, 0)).rejects.toThrow(/not initialized/);
  });

  it('returns null when no face is detected', async () => {
    const encoder = new Encoder();
    await encoder.initialize();
    
    const frame = new ImageData(10, 10);
    const result = await encoder.encode(frame, 0);
    expect(result).toBeNull();
  });

  it('resets frame state properly', () => {
    const encoder = new Encoder();
    // Cannot directly access private variables, but calling reset should not throw
    expect(() => encoder.reset()).not.toThrow();
  });
});
