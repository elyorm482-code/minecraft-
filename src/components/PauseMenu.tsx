import React, { useState } from 'react';
import { t, SupportedLang } from '../i18n/translations';
import { Play, Save, Sliders, HelpCircle, RotateCcw, Home, CheckCircle2 } from 'lucide-react';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onSave: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  onResetWorld: () => void;
  onExitToMenu: () => void;
  lang: SupportedLang;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onSave,
  onOpenSettings,
  onOpenHowToPlay,
  onResetWorld,
  onExitToMenu,
  lang,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSaveClick = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-3xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-3 text-white font-sans animate-fade-in">
        {/* Title */}
        <h2 className="text-2xl font-black text-amber-400 tracking-wider mb-2 uppercase">
          PAUZA
        </h2>

        {saveSuccess && (
          <div className="w-full flex items-center justify-center gap-2 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs py-2 px-3 rounded-xl mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{t('saved_success', lang)}</span>
          </div>
        )}

        {/* Buttons List */}
        <button
          onClick={onResume}
          className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm tracking-wide uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <Play className="w-4 h-4 fill-current" />
          {t('resume', lang)}
        </button>

        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-600 text-white font-bold text-sm tracking-wide uppercase shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          {isSaving ? t('saving', lang) : t('save', lang)}
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-600 text-white font-bold text-sm tracking-wide uppercase shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <Sliders className="w-4 h-4 text-sky-400" />
          {t('settings', lang)}
        </button>

        <button
          onClick={onOpenHowToPlay}
          className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-600 text-white font-bold text-sm tracking-wide uppercase shadow flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
          {t('how_to_play', lang)}
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-200 font-bold text-xs tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-red-400" />
          {t('reset_world', lang)}
        </button>

        <button
          onClick={onExitToMenu}
          className="w-full py-3 px-4 rounded-xl bg-stone-850 hover:bg-stone-750 border border-stone-700 text-gray-300 font-bold text-xs tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition mt-2"
        >
          <Home className="w-4 h-4 text-gray-400" />
          {t('exit_to_menu', lang)}
        </button>

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4">
            <div className="bg-stone-900 border-2 border-red-600 p-5 rounded-2xl max-w-sm flex flex-col gap-3 text-center shadow-2xl">
              <h3 className="font-black text-red-400 text-base uppercase">
                {t('reset_world', lang)}
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                {t('reset_confirm', lang)}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-xs font-bold uppercase cursor-pointer"
                >
                  {t('cancel', lang)}
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    onResetWorld();
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase cursor-pointer"
                >
                  {t('confirm', lang)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
