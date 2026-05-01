import type { ChangeEvent } from 'react';
import { ImagePlus, Maximize, Minimize, Trash2 } from 'lucide-react';
import type { Photo } from '../types';

interface PhotoActionsProps {
  photo: Photo;
  fillLabel: string;
  containLabel: string;
  removeLabel: string;
  onToggleFit: () => void;
  onRemove: () => void;
  onZoomChange: (scale: number) => void;
}

interface EmptyPhotoSlotProps {
  isDragging: boolean;
  label: string;
  dropLabel: string;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function PageLabel({ label }: { label: string }) {
  return (
    <div className="absolute top-4 left-4 text-gray-400 text-sm font-medium pointer-events-none">
      {label}
    </div>
  );
}

export function PhotoActions({
  photo,
  fillLabel,
  containLabel,
  removeLabel,
  onToggleFit,
  onRemove,
  onZoomChange,
}: PhotoActionsProps) {
  const fitLabel = photo.fit === 'contain' ? fillLabel : containLabel;

  return (
    <div className="absolute top-2 right-2 flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
      <div className="flex gap-2">
        <button
          onClick={onToggleFit}
          className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 shadow-sm transition-colors"
          title={fitLabel}
          aria-label={fitLabel}
        >
          {photo.fit === 'contain' ? <Maximize size={16} /> : <Minimize size={16} />}
        </button>
        <button
          onClick={onRemove}
          className="bg-red-500/70 text-white p-2 rounded-full hover:bg-red-600 shadow-sm transition-colors"
          title={removeLabel}
          aria-label={removeLabel}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="bg-black/50 p-2 rounded-lg flex items-center gap-2 backdrop-blur-sm border border-white/20">
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={photo.scale || 1}
          onChange={(event) => onZoomChange(parseFloat(event.target.value))}
          className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-blue-400"
        />
        <span className="text-[10px] text-white font-mono w-6 text-center">
          {Math.round((photo.scale || 1) * 100)}%
        </span>
      </div>
    </div>
  );
}

export function EmptyPhotoSlot({ isDragging, label, dropLabel, onUpload }: EmptyPhotoSlotProps) {
  return (
    <label className={`w-full flex-1 min-h-0 border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white/50'} rounded-lg flex flex-col items-center justify-center hover:bg-white/80 transition-colors relative cursor-pointer shadow-sm`}>
      <input
        type="file"
        accept="image/*"
        onChange={onUpload}
        className="hidden"
      />
      <ImagePlus className={`${isDragging ? 'text-blue-500' : 'text-gray-400'} mb-2 transition-colors`} size={32} />
      <span className={`${isDragging ? 'text-blue-600' : 'text-gray-500'} font-medium transition-colors`}>
        {isDragging ? dropLabel : label}
      </span>
    </label>
  );
}
