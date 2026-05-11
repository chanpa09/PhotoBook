import type { ReactNode } from 'react';

interface Props {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-label={closeLabel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-200 p-5"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-gray-900 mb-2">
          {title}
        </h2>
        <div className="text-sm text-gray-600 mb-5">{description}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-bold disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
