import { A4_PRINT_WARRANTY_GUIDE } from '@/data/printGuides';

export function PrintWarrantyGuideOverlay() {
  const marginX = (A4_PRINT_WARRANTY_GUIDE.displayMargin / A4_PRINT_WARRANTY_GUIDE.sourceWidth) * 100;
  const marginY = (A4_PRINT_WARRANTY_GUIDE.displayMargin / A4_PRINT_WARRANTY_GUIDE.sourceHeight) * 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div className="absolute inset-0 border-[10px] border-violet-500/20" />
      <div
        className="absolute border-2 border-dashed border-violet-500/80"
        style={{
          left: `${marginX}%`,
          right: `${marginX}%`,
          top: `${marginY}%`,
          bottom: `${marginY}%`,
        }}
      />
      <div className="absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-xs font-bold text-violet-700 shadow-sm">
        印刷保証外
      </div>
    </div>
  );
}
