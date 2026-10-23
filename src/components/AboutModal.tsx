import React from 'react';
import { t, SupportedLang } from '../i18n/translations';
import { X, Info, Box, Sparkles, Cpu } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLang;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white font-sans flex flex-col">
        {/* Header */}
        <div className="bg-stone-850 px-5 py-3.5 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg tracking-wide uppercase">
              {t('about', lang)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-sm leading-relaxed text-gray-300">
          <div className="flex items-center gap-3 bg-stone-800/80 p-3 rounded-xl border border-stone-700">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shrink-0">
              <Box className="w-7 h-7" />
            </div>
            <div>
              <div className="font-black text-white text-base">BlockWorld 3D</div>
              <div className="text-xs text-amber-400 font-semibold">{t('game_subtitle', lang)}</div>
            </div>
          </div>

          <p>{t('about_text', lang)}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-800/60 p-2.5 rounded-xl border border-stone-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Three.js & WebGL 2.0</span>
            </div>
            <div className="bg-stone-800/60 p-2.5 rounded-xl border border-stone-700 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Procedural 3D Noise</span>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 text-center pt-2 border-t border-stone-800">
            Tuzuvchi: BlockWorld Studio © 2026. Barcha huquqlar himoyalangan.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-850 border-t border-stone-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold uppercase tracking-wider text-xs shadow cursor-pointer active:scale-95 transition"
          >
            {t('back', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
