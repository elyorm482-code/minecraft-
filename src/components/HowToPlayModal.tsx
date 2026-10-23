import React, { useState } from 'react';
import { t, SupportedLang } from '../i18n/translations';
import { X, HelpCircle, Monitor, Smartphone, Keyboard, MousePointer, ShieldCheck } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: SupportedLang;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>('desktop');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white font-sans flex flex-col">
        {/* Header */}
        <div className="bg-stone-850 px-5 py-3.5 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg tracking-wide uppercase">
              {t('how_to_play', lang)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-stone-800 bg-stone-850 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('desktop')}
            className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'desktop'
                ? 'bg-stone-800 text-amber-400 border-t-2 border-amber-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            {t('controls_desktop', lang)}
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`px-4 py-2 rounded-t-lg font-bold text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mobile'
                ? 'bg-stone-800 text-sky-400 border-t-2 border-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {t('controls_mobile', lang)}
          </button>
        </div>

        {/* Instructions Body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] flex flex-col gap-3 text-sm">
          {activeTab === 'desktop' && (
            <div className="flex flex-col gap-2.5">
              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">W, A, S, D</div>
                  <div className="text-gray-400 text-xs">Oldinga, orqaga, chapga va o'ngga yurish</div>
                </div>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex items-center gap-3">
                <MousePointer className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">Sichqoncha & Bosish</div>
                  <div className="text-gray-400 text-xs">O'yinga kirish uchun ekranni bosing. Sichqoncha bilan atrofga qarang.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-amber-300 block mb-0.5">Chap tugma (LMB):</span>
                  <span className="text-gray-300">Blokni qazish / buzish</span>
                </div>
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-emerald-300 block mb-0.5">O'ng tugma (RMB):</span>
                  <span className="text-gray-300">Blokni yoniga qo'yish</span>
                </div>
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-sky-300 block mb-0.5">Space (Bo'shliq):</span>
                  <span className="text-gray-300">Sakrash / Ijodiyda uchish</span>
                </div>
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-purple-300 block mb-0.5">Shift:</span>
                  <span className="text-gray-300">Tez yugurish / Uchganda pastlash</span>
                </div>
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-yellow-300 block mb-0.5">1 - 9 / G'ildirakcha:</span>
                  <span className="text-gray-300">Hotbar slotini tanlash</span>
                </div>
                <div className="bg-stone-800/70 p-2.5 rounded-xl border border-stone-700 text-xs">
                  <span className="font-bold text-rose-300 block mb-0.5">E / Esc:</span>
                  <span className="text-gray-300">E — Inventar, Esc — Pauza</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mobile' && (
            <div className="flex flex-col gap-2.5">
              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                  🕹️
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">Chap virtual joystik</div>
                  <div className="text-gray-400 text-xs">{t('control_touch_move', lang)}</div>
                </div>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400 flex items-center justify-center font-bold text-sky-400 text-xs shrink-0">
                  👆
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">Ekranni surish (Drag)</div>
                  <div className="text-gray-400 text-xs">{t('control_touch_look', lang)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-800 text-xs">
                  <span className="font-bold text-red-300 block mb-0.5">BUZISH:</span>
                  <span className="text-gray-300">Mo'ljaldagi blokni qazish</span>
                </div>
                <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800 text-xs">
                  <span className="font-bold text-emerald-300 block mb-0.5">QURISH:</span>
                  <span className="text-gray-300">Qo'ldagi blokni o'rnatish</span>
                </div>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-gray-300">
                  Pastdagi panel orqali bloklarni tanlash, tepada esa inventar va pauza tugmalari joylashgan.
                </div>
              </div>
            </div>
          )}
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
