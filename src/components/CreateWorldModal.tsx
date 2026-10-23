import React, { useState } from 'react';
import { GameMode } from '../types/game';
import { t, SupportedLang } from '../i18n/translations';
import { X, Globe2, Dices, Shield, Hammer } from 'lucide-react';

interface CreateWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWorld: (name: string, gameMode: GameMode, seed?: number) => void;
  lang: SupportedLang;
}

export const CreateWorldModal: React.FC<CreateWorldModalProps> = ({
  isOpen,
  onClose,
  onCreateWorld,
  lang,
}) => {
  const [worldName, setWorldName] = useState("Mening Yangi Dunyom");
  const [gameMode, setGameMode] = useState<GameMode>('creative');
  const [seed, setSeed] = useState<string>(() => Math.floor(Math.random() * 999999).toString());

  if (!isOpen) return null;

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 999999).toString());
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSeed = seed.trim() !== '' ? parseInt(seed, 10) || Math.floor(Math.random() * 999999) : undefined;
    onCreateWorld(worldName.trim() || 'Mening Dunyom', gameMode, finalSeed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-white font-sans flex flex-col">
        {/* Header */}
        <div className="bg-stone-850 px-5 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-black text-lg tracking-wide uppercase">
              {t('create_world', lang)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4 text-sm">
          {/* World Name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-stone-300 text-xs uppercase tracking-wider">
              {t('world_name', lang)}
            </label>
            <input
              type="text"
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              className="bg-stone-950 border border-stone-700 focus:border-amber-400 px-3.5 py-2.5 rounded-xl text-white outline-none font-semibold transition"
              required
            />
          </div>

          {/* Seed */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-stone-300 text-xs uppercase tracking-wider">
              {t('seed', lang)}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="flex-1 bg-stone-950 border border-stone-700 focus:border-amber-400 px-3.5 py-2.5 rounded-xl text-white outline-none font-mono text-sm transition"
              />
              <button
                type="button"
                onClick={handleRandomizeSeed}
                className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl border border-stone-600 flex items-center justify-center transition cursor-pointer active:scale-95"
                title="Tasodifiy sid"
              >
                <Dices className="w-5 h-5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Game Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-stone-300 text-xs uppercase tracking-wider">
              {t('game_mode', lang)}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Creative */}
              <button
                type="button"
                onClick={() => setGameMode('creative')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 cursor-pointer transition ${
                  gameMode === 'creative'
                    ? 'bg-amber-950/60 border-amber-400 text-white shadow-md'
                    : 'bg-stone-800/80 border-stone-700 text-gray-400 hover:bg-stone-750'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-amber-400">
                  <Hammer className="w-4 h-4" />
                  {t('creative_mode', lang)}
                </div>
                <div className="text-[11px] text-gray-300 leading-tight">
                  {t('creative_desc', lang)}
                </div>
              </button>

              {/* Survival */}
              <button
                type="button"
                onClick={() => setGameMode('survival')}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 cursor-pointer transition ${
                  gameMode === 'survival'
                    ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-md'
                    : 'bg-stone-800/80 border-stone-700 text-gray-400 hover:bg-stone-750'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-emerald-400">
                  <Shield className="w-4 h-4" />
                  {t('survival_mode', lang)}
                </div>
                <div className="text-[11px] text-gray-300 leading-tight">
                  {t('survival_desc', lang)}
                </div>
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-gray-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              {t('cancel', lang)}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer active:scale-95 transition"
            >
              {t('create_button', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
