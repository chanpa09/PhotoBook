import { useEffect, useRef } from 'react';
import {
  getDisplayFrameLayout,
  getDisplayPhotoFrameImageStyle,
  getFrameLayout,
  getGridClass,
  getSlotCount,
} from '../utils/layout';
import type { PageData, ProjectSettings } from '@/types';
import { A4_PAGE_HEIGHT, A4_PAGE_WIDTH, DEFAULT_STAMP_SIZE } from '@/utils/stamps';

interface Props {
  page: PageData;
  pageIndex: number;
  settings: ProjectSettings;
  isSelected?: boolean;
  noTitleLabel: string;
  onClick?: () => void;
}

export function PageThumbnail({ page, pageIndex, settings, isSelected, noTitleLabel, onClick }: Props) {
  const wasDraggingRef = useRef(false);

  const slots = Array.from({ length: getSlotCount(page.layout) }, (_, index) => index);
  const frameLayout = getFrameLayout(page.layout);
  const displayFrameLayout = frameLayout ? getDisplayFrameLayout(frameLayout, page.spreadSide) : null;

  useEffect(() => {
    let resetTimer: number | undefined;

    if (wasDraggingRef.current) {
      resetTimer = window.setTimeout(() => {
        wasDraggingRef.current = false;
      }, 0);
    }

    return () => {
      if (resetTimer !== undefined) {
        window.clearTimeout(resetTimer);
      }
    };
  });

  const handleClick = () => {
    if (wasDraggingRef.current) return;
    onClick?.();
  };

  return (
    <div className="relative">
      <div 
        onClick={handleClick}
        className={`relative cursor-grab active:cursor-grabbing group transition-all ${isSelected ? 'ring-4 ring-blue-500 ring-offset-4' : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-2'}`}
        style={{ width: '100%', aspectRatio: '794/1123' }}
      >
        <div 
          className="w-full h-full shadow-md overflow-hidden bg-white relative"
          style={{ backgroundColor: settings.backgroundColor }}
        >
          {/* Simplified Page View */}
          {page.layout === 'cover' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-[5%] text-center">
              <div className="text-[10px] font-bold mb-1 truncate w-full">{page.coverTitle || noTitleLabel}</div>
              <div className="text-[6px] text-gray-500 mb-2">{page.coverDate || ''}</div>
              <div className="w-2/3 aspect-square bg-gray-100 rounded overflow-hidden">
                {page.photos[0] && (
                  <img 
                    src={page.photos[0].url} 
                    loading="lazy" 
                    className={`w-full h-full ${page.photos[0].fit === 'contain' ? 'object-contain' : ''}`} 
                    style={page.photos[0].fit !== 'contain' ? {
                      objectFit: 'cover',
                      transform: `translate(${page.photos[0].offset?.x ? page.photos[0].offset.x * 0.1 : 0}px, ${page.photos[0].offset?.y ? page.photos[0].offset.y * 0.1 : 0}px) scale(${page.photos[0].scale || 1})`,
                    } : {}}
                    alt=""
                  />
                )}
              </div>
            </div>
          ) : displayFrameLayout ? (
            <div className="absolute inset-0">
              {displayFrameLayout.textFrames.map((frame, index) => (
                <div
                  key={`text-${index}`}
                  className="absolute border border-dashed border-gray-200 bg-white/20"
                  style={{
                    left: `${(frame.x / displayFrameLayout.sourceWidth) * 100}%`,
                    top: `${(frame.y / displayFrameLayout.sourceHeight) * 100}%`,
                    width: `${(frame.width / displayFrameLayout.sourceWidth) * 100}%`,
                    height: `${(frame.height / displayFrameLayout.sourceHeight) * 100}%`,
                  }}
                />
              ))}

              {displayFrameLayout.frames.map((frame) => {
                const slotIndex = frame.slotIndex;
                const photo = page.photos[slotIndex];
                return (
                  <div
                    key={slotIndex}
                    className="absolute overflow-hidden bg-gray-100 flex items-center justify-center"
                    style={{
                      left: `${(frame.x / displayFrameLayout.sourceWidth) * 100}%`,
                      top: `${(frame.y / displayFrameLayout.sourceHeight) * 100}%`,
                      width: `${(frame.width / displayFrameLayout.sourceWidth) * 100}%`,
                      height: `${(frame.height / displayFrameLayout.sourceHeight) * 100}%`,
                    }}
                  >
                    {photo ? (
                      <div
                        className="absolute"
                        style={getDisplayPhotoFrameImageStyle(frame)}
                      >
                        <img
                          src={photo.url}
                          loading="lazy"
                          className={`w-full h-full ${photo.fit === 'contain' ? 'object-contain' : ''}`}
                          style={photo.fit !== 'contain' ? {
                            objectFit: 'cover',
                            transform: `translate(${photo.offset?.x ? photo.offset.x * 0.1 : 0}px, ${photo.offset?.y ? photo.offset.y * 0.1 : 0}px) scale(${photo.scale || 1})`,
                          } : {}}
                          alt=""
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-50" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`w-full h-full grid gap-[4%] p-[5%] ${getGridClass(page.layout)}`}>
              {slots.map((slotIndex) => {
                const photo = page.photos[slotIndex];
                return (
                  <div key={slotIndex} className="w-full h-full bg-gray-100 rounded overflow-hidden flex items-center justify-center relative min-h-0 min-w-0">

                    {photo ? (
                      <img 
                        src={photo.url} 
                        loading="lazy"
                        className={`w-full h-full ${photo.fit === 'contain' ? 'object-contain' : ''}`} 
                        style={photo.fit !== 'contain' ? {
                          objectFit: 'cover',
                          transform: `translate(${photo.offset?.x ? photo.offset.x * 0.1 : 0}px, ${photo.offset?.y ? photo.offset.y * 0.1 : 0}px) scale(${photo.scale || 1})`,
                        } : {}}
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {page.stamps?.map((stamp) => (
            <img
              key={stamp.instanceId}
              src={stamp.imageUrl}
              loading="lazy"
              alt=""
              className="absolute h-auto select-none"
              style={{
                left: `${(stamp.x / A4_PAGE_WIDTH) * 100}%`,
                top: `${(stamp.y / A4_PAGE_HEIGHT) * 100}%`,
                width: `${(((stamp.size ?? DEFAULT_STAMP_SIZE) * stamp.scale) / A4_PAGE_WIDTH) * 100}%`,
                transform: `rotate(${stamp.rotate}deg)`,
                zIndex: stamp.zIndex,
              }}
            />
          ))}
        </div>
        
        {/* Page Number Badge */}
        <div className={`absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-700'}`}>
          {pageIndex + 1}
        </div>
      </div>
    </div>
  );
}
