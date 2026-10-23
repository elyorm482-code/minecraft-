import React from 'react';
import { GameSettings } from '../types/game';
import { t, SupportedLang } from '../i18n/translations';
import { X, Sliders, Volume2, Eye, Compass, Monitor } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white font-sans flex flex-col">
        {/* Header */}
        <div className="bg-stone-850 px-5 py-3.5 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg tracking-wide uppercase">
              {t('settings', settings.language)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 overflow-y-auto max-h-[78vh] flex flex-col gap-4 text-sm">
          {/* Language Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-stone-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              {t('language', settings.language)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'uz', label: "O'zbekcha" },
                { code: 'en', label: 'English' },
                { code: 'ru', label: 'Русский' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => update('language', item.code as SupportedLang)}
                  className={`py-2 px-3 rounded-xl font-bold text-xs uppercase transition border cursor-pointer ${
                    settings.language === item.code
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-stone-300 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              {t('graphics_quality', settings.language)}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 'low', key: 'graphics_low' },
                { level: 'medium', key: 'graphics_medium' },
                { level: 'high', key: 'graphics_high' },
              ].map((item) => (
                <button
                  key={item.level}
                  onClick={() => update('graphicsQuality', item.level as 'low' | 'medium' | 'high')}
                  className={`py-2 px-2 rounded-xl font-semibold text-xs transition border cursor-pointer ${
                    settings.graphicsQuality === item.level
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                  }`}
                >
                  {t(item.key, settings.language)}
                </button>
              ))}
            </div>
          </div>

          {/* Render Distance */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-stone-300">
              <span className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                {t('render_distance', settings.language)}
              </span>
              <span className="font-mono font-bold text-amber-400">{settings.renderDistance} chunks</span>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={settings.renderDistance}
              onChange={(e) => update('renderDistance', parseInt(e.target.value, 10))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Sound Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-stone-300">
              <span className="font-semibold flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-400" />
                {t('sound_volume', settings.language)}
              </span>
              <span className="font-mono font-bold text-purple-400">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => update('volume', parseFloat(e.target.value))}
              className="accent-purple-500 cursor-pointer"
            />
          </div>

          {/* FOV */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-stone-300">
              <span className="font-semibold">{t('fov', settings.language)}</span>
              <span className="font-mono font-bold text-sky-400">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              step="2"
              value={settings.fov}
              onChange={(e) => update('fov', parseInt(e.target.value, 10))}
              className="accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Mouse Sensitivity */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-stone-300">
              <span className="font-semibold">{t('mouse_sensitivity', settings.language)}</span>
              <span className="font-mono font-bold text-amber-400">{settings.mouseSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.mouseSensitivity}
              onChange={(e) => update('mouseSensitivity', parseFloat(e.target.value))}
              className="accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-800">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCoordinates}
                onChange={(e) => update('showCoordinates', e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              {t('show_coords', settings.language)}
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showFps}
                onChange={(e) => update('showFps', e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              {t('show_fps', settings.language)}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-850 border-t border-stone-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold uppercase tracking-wider text-xs shadow cursor-pointer active:scale-95 transition"
          >
            {t('back', settings.language)}
          </button>
        </div>
      </div>
    </div>
  );
};
