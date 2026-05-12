import { useState } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { X, Languages, Image as ImageIcon, Database, Loader2 } from 'lucide-react';
import { useProjectStore } from '@/store/useProjectStore';
import { IMAGE_RESOLUTION_OPTIONS, DEFAULT_IMAGE_MAX_RESOLUTION } from '@/utils/imageResize';
import { TRANSLATIONS } from '@/i18n';
import { collectActiveImageIds, deleteUnusedImages } from '@/utils/imageStore';
import type { PageData } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings } = useProjectStore(
    useShallow((state) => ({
      settings: state.settings,
      setSettings: state.setSettings,
    })),
  );
  const { pastStates, futureStates } = useStore(
    useProjectStore.temporal,
    useShallow((state) => ({
      pastStates: state.pastStates,
      futureStates: state.futureStates,
    })),
  );
  const [cleanupStatus, setCleanupStatus] = useState<string | null>(null);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const uiLanguage = settings.uiLanguage ?? 'ko';
  const text = TRANSLATIONS[uiLanguage];

  const handleStorageCleanup = async () => {
    setIsCleaningStorage(true);
    setCleanupStatus(null);

    try {
      const historyStates = [...pastStates, ...futureStates] as Array<{ pages?: PageData[] }>;
      const deletedCount = await deleteUnusedImages(collectActiveImageIds(useProjectStore.getState().pages, historyStates));
      setCleanupStatus(text.storageCleanup.success(deletedCount));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCleanupStatus(text.storageCleanup.failed(message));
    } finally {
      setIsCleaningStorage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 id="settings-title" className="text-lg font-bold text-gray-800">
            {text.settingsTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            aria-label={text.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Language Setting */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Languages size={16} className="text-blue-600" />
              {text.language.label}
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {(['ko', 'ja'] as const).map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => setSettings({ ...settings, uiLanguage: language })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all ${
                    uiLanguage === language
                      ? 'bg-white shadow-sm text-blue-700 ring-1 ring-blue-500/20'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }`}
                  aria-pressed={uiLanguage === language}
                >
                  {language === 'ko' ? text.language.korean : text.language.japanese}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Image Resolution Setting */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <ImageIcon size={16} className="text-blue-600" />
              {text.imageResolution}
            </h3>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {text.imageResolutionDescription}
            </p>
            <select
              value={settings.imageMaxResolution ?? DEFAULT_IMAGE_MAX_RESOLUTION}
              onChange={(event) => setSettings({ ...settings, imageMaxResolution: Number(event.target.value) })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow cursor-pointer hover:bg-gray-50"
            >
              {IMAGE_RESOLUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {text.imageResolutionOptions[option.labelKey]}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-gray-100" />

          <div>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
              <Database size={16} className="text-blue-600" />
              {text.storageCleanup.title}
            </h3>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {text.storageCleanup.description}
            </p>
            <button
              type="button"
              onClick={() => void handleStorageCleanup()}
              disabled={isCleaningStorage}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {isCleaningStorage ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
              {text.storageCleanup.button}
            </button>
            {cleanupStatus && (
              <p className="mt-2 text-xs text-gray-600">
                {cleanupStatus}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {text.close}
          </button>
        </div>
      </div>
    </div>
  );
}
