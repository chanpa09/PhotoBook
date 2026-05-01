import { X } from 'lucide-react';

interface Props {
  message: string;
  closeLabel: string;
  onClose: () => void;
}

export function NoticeBanner({ message, closeLabel, onClose }: Props) {
  return (
    <div
      role="alert"
      className="fixed top-4 right-4 z-[120] max-w-sm bg-white border border-red-200 shadow-xl rounded-lg p-4 text-sm text-gray-800 flex items-start gap-3"
    >
      <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
      <p className="flex-1 leading-5">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="p-1 -m-1 text-gray-400 hover:text-gray-700 rounded"
        aria-label={closeLabel}
      >
        <X size={16} />
      </button>
    </div>
  );
}
