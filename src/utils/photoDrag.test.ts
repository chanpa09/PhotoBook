import { describe, expect, it } from 'vitest';
import { getNextPhotoDragOffset } from '@/utils/photoDrag';

describe('photoDrag', () => {
  it('applies page scale and photo scale when calculating the next offset', () => {
    expect(getNextPhotoDragOffset({
      currentOffset: { x: 10, y: -5 },
      lastPointer: { x: 100, y: 200 },
      currentPointer: { x: 140, y: 170 },
      pageScale: 2,
      photoScale: 2,
    })).toEqual({
      x: 20,
      y: -12.5,
    });
  });

  it('falls back to scale 1 when scale values are missing', () => {
    expect(getNextPhotoDragOffset({
      currentOffset: { x: 0, y: 0 },
      lastPointer: { x: 10, y: 10 },
      currentPointer: { x: 15, y: 25 },
      pageScale: 0,
      photoScale: 0,
    })).toEqual({
      x: 5,
      y: 15,
    });
  });
});
