import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

interface UsePageScaleParams {
  mainRef: RefObject<HTMLElement | null>;
  isLoaded: boolean;
  pageWidth: number;
  pageHeight: number;
  padding: number;
}

export function usePageScale({ mainRef, isLoaded, pageWidth, pageHeight, padding }: UsePageScaleParams) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isLoaded) return;

    const calculateScale = () => {
      if (!mainRef.current) return;

      const containerHeight = Math.max(0, mainRef.current.clientHeight - padding * 2);
      const containerWidth = Math.max(0, mainRef.current.clientWidth - padding * 2);
      if (containerHeight === 0 || containerWidth === 0) return;

      const scaleY = containerHeight / pageHeight;
      const scaleX = containerWidth / pageWidth;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    const observer = new ResizeObserver(calculateScale);
    if (mainRef.current) observer.observe(mainRef.current);

    const animationFrame = window.requestAnimationFrame(calculateScale);
    window.addEventListener('resize', calculateScale);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', calculateScale);
      observer.disconnect();
    };
  }, [isLoaded, mainRef, pageWidth, pageHeight, padding]);

  return scale;
}
