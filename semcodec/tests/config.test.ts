import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/utils/config';

describe('resolveConfig', () => {
  it('applies all defaults when no config is provided', () => {
    const config = resolveConfig();
    expect(config.keyframeInterval).toBe(5);
    expect(config.jpegQuality).toBe(85);
    expect(config.blendWeight).toBe(0.7);
    expect(config.enableTemporalNoise).toBe(true);
  });

  it('overrides specific defaults while preserving others', () => {
    const config = resolveConfig({ keyframeInterval: 10, jpegQuality: 70 });
    expect(config.keyframeInterval).toBe(10);
    expect(config.jpegQuality).toBe(70);
    expect(config.blendWeight).toBe(0.7); // default preserved
  });
  
  it('handles falsy overrides properly', () => {
    const config = resolveConfig({ enableTemporalNoise: false, blendWeight: 0 });
    expect(config.enableTemporalNoise).toBe(false);
    expect(config.blendWeight).toBe(0);
  });
});
