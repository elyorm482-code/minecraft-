import React, { useEffect, useState } from 'react';
import { SaveManager } from '../game/SaveManager';
import { GameMode } from '../types/game';
import { t, SupportedLang } from '../i18n/translations';
import { X, Play, Trash2, Globe2, Plus, Calendar, Clock } from 'lucide-react';

interface SavedWorldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWorld: (id: string) => void;
  onOpenCreateModal: () => void;
  lang: SupportedLang;
}

export const SavedWorldsModal: React.FC<SavedWorldsModalProps> = ({
  isOpen,
  onClose,
  onLoadWorld,
  onOpenCreateModal,
  lang,
}) => {
  const [worlds, setWorlds] = useState<Array<{ id: string; name: string; lastPlayed: number; gameMode: GameMode }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen]);

  const loadList = async () => {
    setLoading(true);
    const list = await SaveManager.listWorlds();
    setWorlds(list);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Haqiqatan ham ushbu dunyoni o'chirmoqchimisiz?")) {
      await SaveManager.deleteWorld(id);
      loadList();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-white font-sans flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-stone-850 px-5 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-black text-lg tracking-wide uppercase">
              {t('play_world', lang)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Worlds List Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-2.5">
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Yuklanmoqda...</div>
          ) : worlds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <Globe2 className="w-12 h-12 text-gray-500 stroke-1" />
              <div className="text-gray-300 text-sm font-semibold">{t('no_saved_worlds', lang)}</div>
              <button
                onClick={() => {
                  onClose();
                  onOpenCreateModal();
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                {t('create_world', lang)}
              </button>
            </div>
          ) : (
            worlds.map((w) => (
              <div
                key={w.id}
                onClick={() => onLoadWorld(w.id)}
                className="p-3.5 rounded-2xl bg-stone-800/90 hover:bg-stone-750 border border-stone-700 hover:border-amber-400/60 flex items-center justify-between gap-3 cursor-pointer transition group shadow-md"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm group-hover:text-amber-400 transition">
                      {w.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-700 text-gray-300 uppercase font-bold">
                      {w.gameMode === 'creative' ? t('creative_mode', lang) : t('survival_mode', lang)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span>{new Date(w.lastPlayed).toLocaleDateString()} {new Date(w.lastPlayed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, w.id)}
                    className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/80 text-red-300 border border-red-800/50 transition cursor-pointer"
                    title={t('delete_world', lang)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold group-hover:scale-105 transition shadow">
                    <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-850 border-t border-stone-700 flex justify-between items-center">
          <button
            onClick={() => {
              onClose();
              onOpenCreateModal();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            {t('create_world', lang)}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-750 hover:bg-stone-700 text-gray-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            {t('back', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
