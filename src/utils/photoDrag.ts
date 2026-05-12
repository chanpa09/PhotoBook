export interface Point {
  x: number;
  y: number;
}

export const getPhotoDragDelta = ({
  currentPointer,
  lastPointer,
  pageScale,
  photoScale,
}: {
  currentPointer: Point;
  lastPointer: Point;
  pageScale: number;
  photoScale: number;
}): Point => {
  const safePageScale = pageScale || 1;
  const safePhotoScale = photoScale || 1;

  return {
    x: (currentPointer.x - lastPointer.x) / safePageScale / safePhotoScale,
    y: (currentPointer.y - lastPointer.y) / safePageScale / safePhotoScale,
  };
};

export const getNextPhotoDragOffset = ({
  currentOffset,
  currentPointer,
  lastPointer,
  pageScale,
  photoScale,
}: {
  currentOffset: Point;
  currentPointer: Point;
  lastPointer: Point;
  pageScale: number;
  photoScale: number;
}): Point => {
  const delta = getPhotoDragDelta({ currentPointer, lastPointer, pageScale, photoScale });

  return {
    x: currentOffset.x + delta.x,
    y: currentOffset.y + delta.y,
  };
};
