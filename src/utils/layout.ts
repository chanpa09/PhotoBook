import type { LayoutType } from '../types';

export function getSlotCount(layout: LayoutType): number {
  switch (layout) {
    case 'cover': return 1;
    case '1': return 1;
    case '2-row': return 2;
    case '2-col': return 2;
    case '3-row': return 3;
    case '3-top': return 3;
    case '4-grid': return 4;
    case '4-top': return 4;
    case '5-grid': return 5;
    case '6-grid': return 6;
    default: return 1;
  }
}

export function getGridClass(layout: LayoutType) {
  switch (layout) {
    case 'cover': return 'flex';
    case '1': return 'grid-rows-1';
    case '2-row': return 'grid-rows-2';
    case '2-col': return 'grid-cols-2';
    case '3-row': return 'grid-rows-3';
    case '3-top': return 'grid-rows-2 grid-cols-2 [&>*:first-child]:col-span-2';
    case '4-grid': return 'grid-rows-2 grid-cols-2';
    case '4-top': return 'grid-rows-2 grid-cols-3 [&>*:first-child]:col-span-3';
    case '5-grid': return 'grid-rows-3 grid-cols-2 [&>*:nth-child(3)]:col-span-2';
    case '6-grid': return 'grid-rows-3 grid-cols-2';
    default: return 'grid-rows-1';
  }
}
