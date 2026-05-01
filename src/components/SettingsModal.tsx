import { X, Languages, Image as ImageIcon } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { IMAGE_RESOLUTION_OPTIONS, DEFAULT_IMAGE_MAX_RESOLUTION } from '../utils/imageResize';
import { TRANSLATIONS } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setSettings } = useProjectStore();
  const uiLanguage = settings.uiLanguage ?? 'ko';
  const text = TRANSLATIONS[uiLanguage];

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
              {uiLanguage === 'ko' 
                ? '앱에 불러올 사진의 최대 크기를 제한하여 메모리 부족 및 크래시 현상을 방지합니다. 크기가 클수록 화질은 좋으나 성능이 저하될 수 있습니다.'
                : 'アプリに読み込む写真の最大サイズを制限し、メモリ不足やクラッシュを防ぎます。サイズが大きいほど画質は良くなりますが、パフォーマンスが低下する可能性があります。'}
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
