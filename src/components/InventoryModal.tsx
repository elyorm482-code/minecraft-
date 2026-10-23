import React, { useState } from 'react';
import { InventorySlot, BlockType, GameMode } from '../types/game';
import { BlockRegistry } from '../game/BlockRegistry';
import { getBlockPreviewColor } from '../utils/textures';
import { CRAFTING_RECIPES } from '../game/CraftingRecipes';
import { t, SupportedLang } from '../i18n/translations';
import { sound } from '../utils/audio';
import { X, Sparkles, BookOpen, Layers } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: (InventorySlot | null)[];
  hotbar: (InventorySlot | null)[];
  onUpdateInventory: (newInv: (InventorySlot | null)[]) => void;
  onUpdateHotbar: (newHotbar: (InventorySlot | null)[]) => void;
  gameMode: GameMode;
  lang: SupportedLang;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  hotbar,
  onUpdateInventory,
  onUpdateHotbar,
  gameMode,
  lang,
}) => {
  const [selectedHolding, setSelectedHolding] = useState<InventorySlot | null>(null);
  const [craftingGrid, setCraftingGrid] = useState<(InventorySlot | null)[]>([null, null, null, null]);
  const [craftingResult, setCraftingResult] = useState<InventorySlot | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'recipes' | 'creative_all'>('inventory');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const registry = BlockRegistry.getInstance();

  if (!isOpen) return null;

  // Check 2x2 Crafting Grid against recipes
  const checkCrafting = (grid: (InventorySlot | null)[]) => {
    // Count ingredients in 2x2 grid
    const counts: Partial<Record<BlockType, number>> = {};
    for (const slot of grid) {
      if (slot) {
        counts[slot.blockType] = (counts[slot.blockType] || 0) + slot.count;
      }
    }

    // Match with recipes
    for (const recipe of CRAFTING_RECIPES) {
      const matches = recipe.ingredients.every((ing) => (counts[ing.type] || 0) >= ing.count);
      // Ensure no unexpected extra blocks in grid
      const totalGridItems = Object.keys(counts).length;
      if (matches && totalGridItems === recipe.ingredients.length) {
        setCraftingResult({ blockType: recipe.result.type, count: recipe.result.count });
        return;
      }
    }
    setCraftingResult(null);
  };

  // Click on Crafting Grid Slot
  const handleCraftingGridClick = (index: number) => {
    const gridCopy = [...craftingGrid];
    const target = gridCopy[index];

    if (!selectedHolding) {
      if (target) {
        setSelectedHolding(target);
        gridCopy[index] = null;
      }
    } else {
      if (!target) {
        gridCopy[index] = { ...selectedHolding };
        setSelectedHolding(null);
      } else if (target.blockType === selectedHolding.blockType) {
        target.count += selectedHolding.count;
        setSelectedHolding(null);
      } else {
        gridCopy[index] = selectedHolding;
        setSelectedHolding(target);
      }
    }

    setCraftingGrid(gridCopy);
    checkCrafting(gridCopy);
    sound.playInventorySound(true);
  };

  // Collect Crafted Result
  const handleTakeCrafted = () => {
    if (!craftingResult) return;

    // Deduct 1 count of each ingredient from 2x2 grid
    const gridCopy = [...craftingGrid];
    for (let i = 0; i < gridCopy.length; i++) {
      if (gridCopy[i]) {
        gridCopy[i]!.count -= 1;
        if (gridCopy[i]!.count <= 0) {
          gridCopy[i] = null;
        }
      }
    }

    // Add result to holding or inventory
    if (!selectedHolding) {
      setSelectedHolding({ ...craftingResult });
    } else if (selectedHolding.blockType === craftingResult.blockType) {
      selectedHolding.count += craftingResult.count;
    } else {
      // Put in first available inventory slot
      addToPlayerInventory(craftingResult);
    }

    sound.playCollectSound();
    setCraftingGrid(gridCopy);
    checkCrafting(gridCopy);
  };

  // Auto-craft from Recipe Book
  const handleQuickCraft = (recipeId: string) => {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;

    // Check availability in player inventory + hotbar
    const combined = [...inventory, ...hotbar];
    const hasMaterials = recipe.ingredients.every((ing) => {
      const totalAvailable = combined
        .filter((s): s is InventorySlot => s !== null && s.blockType === ing.type)
        .reduce((sum, s) => sum + s.count, 0);
      return totalAvailable >= ing.count;
    });

    if (!hasMaterials) {
      setFeedbackMsg(t('need_materials', lang));
      setTimeout(() => setFeedbackMsg(null), 2000);
      return;
    }

    // Deduct ingredients
    const newInv = [...inventory];
    const newHot = [...hotbar];

    recipe.ingredients.forEach((ing) => {
      let needed = ing.count;
      for (let i = 0; i < newInv.length && needed > 0; i++) {
        if (newInv[i]?.blockType === ing.type) {
          const take = Math.min(newInv[i]!.count, needed);
          newInv[i]!.count -= take;
          needed -= take;
          if (newInv[i]!.count <= 0) newInv[i] = null;
        }
      }
      for (let i = 0; i < newHot.length && needed > 0; i++) {
        if (newHot[i]?.blockType === ing.type) {
          const take = Math.min(newHot[i]!.count, needed);
          newHot[i]!.count -= take;
          needed -= take;
          if (newHot[i]!.count <= 0) newHot[i] = null;
        }
      }
    });

    // Add result to inventory
    addToInventoryDirect(newInv, newHot, { blockType: recipe.result.type, count: recipe.result.count });
    onUpdateInventory(newInv);
    onUpdateHotbar(newHot);

    sound.playCollectSound();
    setFeedbackMsg(`${t(recipe.nameKey, lang)} ${t('crafted', lang)}!`);
    setTimeout(() => setFeedbackMsg(null), 2000);
  };

  const addToInventoryDirect = (
    inv: (InventorySlot | null)[],
    hot: (InventorySlot | null)[],
    item: InventorySlot
  ) => {
    // Try to stack in hotbar first
    for (let i = 0; i < hot.length; i++) {
      if (hot[i]?.blockType === item.blockType && hot[i]!.count < 64) {
        const canAdd = Math.min(64 - hot[i]!.count, item.count);
        hot[i]!.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) return;
      }
    }
    // Try to stack in inventory
    for (let i = 0; i < inv.length; i++) {
      if (inv[i]?.blockType === item.blockType && inv[i]!.count < 64) {
        const canAdd = Math.min(64 - inv[i]!.count, item.count);
        inv[i]!.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) return;
      }
    }
    // Empty slot in hotbar
    for (let i = 0; i < hot.length; i++) {
      if (!hot[i]) {
        hot[i] = { ...item };
        return;
      }
    }
    // Empty slot in inventory
    for (let i = 0; i < inv.length; i++) {
      if (!inv[i]) {
        inv[i] = { ...item };
        return;
      }
    }
  };

  const addToPlayerInventory = (slot: InventorySlot) => {
    const invCopy = [...inventory];
    const hotCopy = [...hotbar];
    addToInventoryDirect(invCopy, hotCopy, slot);
    onUpdateInventory(invCopy);
    onUpdateHotbar(hotCopy);
  };

  // Slot click inside main 27-slot inventory
  const handleInventorySlotClick = (index: number) => {
    const invCopy = [...inventory];
    const target = invCopy[index];

    if (!selectedHolding) {
      if (target) {
        setSelectedHolding(target);
        invCopy[index] = null;
      }
    } else {
      if (!target) {
        invCopy[index] = selectedHolding;
        setSelectedHolding(null);
      } else if (target.blockType === selectedHolding.blockType) {
        target.count += selectedHolding.count;
        setSelectedHolding(null);
      } else {
        invCopy[index] = selectedHolding;
        setSelectedHolding(target);
      }
    }

    onUpdateInventory(invCopy);
    sound.playInventorySound(true);
  };

  // Slot click inside 9-slot hotbar
  const handleHotbarSlotClick = (index: number) => {
    const hotCopy = [...hotbar];
    const target = hotCopy[index];

    if (!selectedHolding) {
      if (target) {
        setSelectedHolding(target);
        hotCopy[index] = null;
      }
    } else {
      if (!target) {
        hotCopy[index] = selectedHolding;
        setSelectedHolding(null);
      } else if (target.blockType === selectedHolding.blockType) {
        target.count += selectedHolding.count;
        setSelectedHolding(null);
      } else {
        hotCopy[index] = selectedHolding;
        setSelectedHolding(target);
      }
    }

    onUpdateHotbar(hotCopy);
    sound.playInventorySound(true);
  };

  // Creative Mode All Blocks picker
  const allBlocksList: BlockType[] = [
    BlockType.GRASS,
    BlockType.DIRT,
    BlockType.STONE,
    BlockType.COBBLESTONE,
    BlockType.SAND,
    BlockType.OAK_WOOD,
    BlockType.OAK_LEAVES,
    BlockType.GLASS,
    BlockType.WATER,
    BlockType.COAL_ORE,
    BlockType.IRON_ORE,
    BlockType.GOLD_ORE,
    BlockType.DIAMOND_ORE,
    BlockType.BRICKS,
    BlockType.SNOW,
    BlockType.BEDROCK,
    BlockType.PLANKS,
    BlockType.BOOKSHELF,
    BlockType.TORCH,
  ];

  const handleCreativePick = (blockType: BlockType) => {
    setSelectedHolding({ blockType, count: 64 });
    sound.playCollectSound();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="bg-stone-900 border-2 border-stone-600 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="bg-stone-800/90 px-4 py-3 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base sm:text-lg tracking-wide uppercase">
              {t('inventory', lang)} & {t('crafting', lang)}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {feedbackMsg && (
              <span className="text-xs text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                {feedbackMsg}
              </span>
            )}

            <button
              onClick={() => {
                sound.playInventorySound(false);
                onClose();
              }}
              className="p-1 rounded-lg bg-stone-700 hover:bg-stone-600 active:scale-95 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-700 bg-stone-850 px-3 pt-2 gap-1.5">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'inventory' ? 'bg-stone-800 text-amber-400 border-t-2 border-amber-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('inventory', lang)}
          </button>

          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recipes' ? 'bg-stone-800 text-sky-400 border-t-2 border-sky-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t('recipe_book', lang)}
          </button>

          {gameMode === 'creative' && (
            <button
              onClick={() => setActiveTab('creative_all')}
              className={`px-3 py-1.5 rounded-t-lg font-bold text-xs uppercase transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'creative_all' ? 'bg-stone-800 text-emerald-400 border-t-2 border-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('creative_mode', lang)} (Barcha bloklar)
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* Currently Holding Item Floating Badge */}
          {selectedHolding && (
            <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/50 p-2 rounded-lg">
              <span className="text-xs text-amber-200">Qo'lda ushlab turilgan:</span>
              <div
                className="w-5 h-5 rounded border border-black/50"
                style={{ backgroundColor: getBlockPreviewColor(selectedHolding.blockType) }}
              />
              <span className="text-xs font-bold text-white">
                {t(registry.getConfig(selectedHolding.blockType)?.nameKey || '', lang)} x {selectedHolding.count}
              </span>
              <button
                onClick={() => setSelectedHolding(null)}
                className="ml-auto text-xs bg-red-900/60 hover:bg-red-800 px-2 py-0.5 rounded text-red-200 cursor-pointer"
              >
                Tashlash
              </button>
            </div>
          )}

          {activeTab === 'inventory' && (
            <>
              {/* 2x2 Crafting Area */}
              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    {t('crafting', lang)} (2x2)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-stone-900 p-2 rounded-lg border border-stone-700">
                    {craftingGrid.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCraftingGridClick(idx)}
                        className="w-12 h-12 bg-stone-800 hover:bg-stone-700 rounded border border-stone-600 flex items-center justify-center relative cursor-pointer"
                      >
                        {slot && (
                          <div
                            className="w-7 h-7 rounded shadow-inner"
                            style={{ backgroundColor: getBlockPreviewColor(slot.blockType) }}
                          />
                        )}
                        {slot && (
                          <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white">
                            {slot.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-stone-500 font-bold text-xl rotate-90 sm:rotate-0">➔</div>

                {/* Output slot */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Natija</span>
                  <button
                    onClick={handleTakeCrafted}
                    disabled={!craftingResult}
                    className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center relative transition ${
                      craftingResult
                        ? 'border-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : 'border-stone-700 bg-stone-900/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {craftingResult && (
                      <div
                        className="w-8 h-8 rounded shadow"
                        style={{ backgroundColor: getBlockPreviewColor(craftingResult.blockType) }}
                      />
                    )}
                    {craftingResult && (
                      <span className="absolute bottom-1 right-1.5 text-xs font-bold text-white">
                        {craftingResult.count}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* 27-Slot Player Inventory */}
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 block">
                  Asosiy Xalta (27 slot)
                </span>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 bg-stone-950/70 p-2.5 rounded-xl border border-stone-700">
                  {inventory.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInventorySlotClick(idx)}
                      className="w-full aspect-square bg-stone-850 hover:bg-stone-750 active:bg-stone-700 rounded-lg border border-stone-700 flex items-center justify-center relative cursor-pointer select-none transition"
                    >
                      {slot && (
                        <div
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded shadow-inner"
                          style={{ backgroundColor: getBlockPreviewColor(slot.blockType) }}
                        />
                      )}
                      {slot && slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-bold text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 9-Slot Hotbar in Modal */}
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 block">
                  Tezkor panel (Hotbar)
                </span>
                <div className="grid grid-cols-9 gap-1 sm:gap-1.5 bg-stone-950/70 p-2.5 rounded-xl border-2 border-stone-700">
                  {hotbar.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleHotbarSlotClick(idx)}
                      className="w-full aspect-square bg-stone-850 hover:bg-stone-750 active:bg-stone-700 rounded-lg border border-stone-600 flex items-center justify-center relative cursor-pointer select-none transition"
                    >
                      <span className="absolute top-0.5 left-1 text-[8px] text-gray-500 font-mono">
                        {idx + 1}
                      </span>
                      {slot && (
                        <div
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded shadow-inner"
                          style={{ backgroundColor: getBlockPreviewColor(slot.blockType) }}
                        />
                      )}
                      {slot && slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-bold text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'recipes' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-stone-400">
                Retseptni bosing — yetarli xomashyo bo'lsa, avtomatik ravishda tayyorlanadi:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CRAFTING_RECIPES.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleQuickCraft(recipe.id)}
                    className="p-2.5 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-600 flex items-center justify-between gap-3 text-left transition cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {recipe.ingredients.map((ing, i) => (
                          <div key={i} className="flex items-center">
                            <div
                              className="w-6 h-6 rounded border border-black/40"
                              style={{ backgroundColor: getBlockPreviewColor(ing.type) }}
                            />
                            <span className="text-[10px] text-gray-300 ml-0.5">x{ing.count}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-gray-400">➔</span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-7 h-7 rounded border border-emerald-400/50 shadow"
                          style={{ backgroundColor: getBlockPreviewColor(recipe.result.type) }}
                        />
                        <span className="text-xs font-bold text-emerald-300">x{recipe.result.count}</span>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-white">
                      {t(recipe.nameKey, lang)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'creative_all' && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-stone-400">
                Cheksiz bloklar katalogi — istalgan blokni bosing va qo'lingizga oling:
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {allBlocksList.map((blockType) => {
                  const conf = registry.getConfig(blockType);
                  return (
                    <button
                      key={blockType}
                      onClick={() => handleCreativePick(blockType)}
                      className="p-2 bg-stone-800 hover:bg-stone-700 active:scale-95 rounded-xl border border-stone-600 flex flex-col items-center gap-1 transition cursor-pointer"
                    >
                      <div
                        className="w-9 h-9 rounded-lg shadow-md border border-black/30"
                        style={{ backgroundColor: getBlockPreviewColor(blockType) }}
                      />
                      <span className="text-[10px] text-center text-gray-200 line-clamp-1 font-semibold">
                        {conf ? t(conf.nameKey, lang) : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
