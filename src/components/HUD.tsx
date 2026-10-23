import React, { useRef, useState, useEffect } from 'react';
import { InventorySlot, BlockType, GameMode } from '../types/game';
import { getBlockPreviewColor } from '../utils/textures';
import { t, SupportedLang } from '../i18n/translations';
import { BlockRegistry } from '../game/BlockRegistry';
import { Heart, Drumstick, Compass, Box, Pause, Backpack, ChevronsUp } from 'lucide-react';

interface HUDProps {
  hotbar: (InventorySlot | null)[];
  selectedIndex: number;
  onSelectSlot: (index: number) => void;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  gameMode: GameMode;
  isFlying: boolean;
  onToggleFlight: () => void;
  playerPos: [number, number, number];
  fps: number;
  showCoordinates: boolean;
  showFps: boolean;
  onOpenInventory: () => void;
  onPause: () => void;
  lang: SupportedLang;
  // Mobile touch triggers
  onMobileMove: (dx: number, dy: number) => void;
  onMobileJump: (active: boolean) => void;
  onMobileBreak: () => void;
  onMobilePlace: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  selectedIndex,
  onSelectSlot,
  health,
  maxHealth,
  hunger,
  maxHunger,
  gameMode,
  isFlying,
  onToggleFlight,
  playerPos,
  fps,
  showCoordinates,
  showFps,
  onOpenInventory,
  onPause,
  lang,
  onMobileMove,
  onMobileJump,
  onMobileBreak,
  onMobilePlace,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const registry = BlockRegistry.getInstance();

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Virtual Joystick touch handling
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsJoystickActive(true);
    updateJoystick(e.touches[0]);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!isJoystickActive) return;
    e.preventDefault();
    updateJoystick(e.touches[0]);
  };

  const handleJoystickEnd = () => {
    setIsJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    onMobileMove(0, 0);
  };

  const updateJoystick = (touch: React.Touch) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const maxRadius = rect.width / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    setJoystickPos({ x: dx, y: dy });
    // Normalize -1 to 1
    onMobileMove(dx / maxRadius, dy / maxRadius);
  };

  const selectedSlot = hotbar[selectedIndex];
  const selectedConfig = selectedSlot ? registry.getConfig(selectedSlot.blockType) : null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 flex flex-col justify-between">
      {/* Top Bar: Stats, Mode, Coordinates & Top Buttons */}
      <div className="p-3 sm:p-4 flex items-start justify-between w-full">
        {/* Left: Info HUD */}
        <div className="flex flex-col gap-1.5 text-xs sm:text-sm font-mono text-white/90 drop-shadow-md bg-black/40 backdrop-blur-sm p-2.5 rounded-lg border border-white/10 max-w-[240px] sm:max-w-xs">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>BlockWorld 3D</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/80 text-white font-sans uppercase">
              {gameMode === 'creative' ? t('creative_mode', lang) : t('survival_mode', lang)}
            </span>
          </div>

          {showCoordinates && (
            <div className="text-[11px] text-gray-300">
              XYZ: {playerPos[0].toFixed(1)} / {playerPos[1].toFixed(1)} / {playerPos[2].toFixed(1)}
            </div>
          )}

          {showFps && (
            <div className="text-[11px] text-emerald-400">
              FPS: {Math.round(fps)}
            </div>
          )}

          {gameMode === 'creative' && (
            <button
              onClick={onToggleFlight}
              className="pointer-events-auto mt-1 flex items-center justify-between gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white cursor-pointer active:scale-95 transition"
            >
              <span className="flex items-center gap-1">
                <ChevronsUp className={`w-3.5 h-3.5 ${isFlying ? 'text-amber-400' : 'text-gray-400'}`} />
                {isFlying ? t('flight_enabled', lang) : t('flight_disabled', lang)}
              </span>
            </button>
          )}
        </div>

        {/* Right: Quick Action Buttons (Pause & Inventory) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenInventory}
            className="pointer-events-auto p-2.5 sm:px-3 sm:py-2 bg-stone-900/80 hover:bg-stone-800 text-white rounded-lg border border-white/20 shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
            title={`${t('inventory', lang)} (E)`}
          >
            <Backpack className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline text-xs font-bold">{t('inventory', lang)} [E]</span>
          </button>

          <button
            onClick={onPause}
            className="pointer-events-auto p-2.5 sm:px-3 sm:py-2 bg-stone-900/80 hover:bg-stone-800 text-white rounded-lg border border-white/20 shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
            title={`${t('control_pause', lang)} (Esc)`}
          >
            <Pause className="w-5 h-5 text-sky-400" />
            <span className="hidden sm:inline text-xs font-bold">PAUSE [Esc]</span>
          </button>
        </div>
      </div>

      {/* Center Screen: Crisp Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-5 h-5 opacity-85">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-2 bg-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
        </div>
      </div>

      {/* Bottom Area: Health/Hunger Bars, Hotbar, and Mobile Controls */}
      <div className="flex flex-col items-center gap-2 pb-3 sm:pb-4 w-full">
        {/* Selected Block Name Toast */}
        {selectedConfig && (
          <div className="text-white text-xs sm:text-sm font-bold bg-black/60 px-3 py-1 rounded-full shadow border border-white/10 animate-fade-in">
            {t(selectedConfig.nameKey, lang)}
          </div>
        )}

        {/* Survival Mode: Hearts and Drumsticks */}
        {gameMode === 'survival' && (
          <div className="flex items-center justify-between w-full max-w-[360px] px-4 py-1">
            {/* Health Hearts */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = health >= (i + 1) * 2;
                const half = !filled && health >= i * 2 + 1;
                return (
                  <Heart
                    key={i}
                    className={`w-4 h-4 drop-shadow ${
                      filled
                        ? 'fill-red-500 text-red-600'
                        : half
                        ? 'fill-red-400/60 text-red-500'
                        : 'fill-transparent text-gray-500/80'
                    }`}
                  />
                );
              })}
            </div>

            {/* Hunger Drumsticks */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = hunger >= (i + 1) * 2;
                return (
                  <Drumstick
                    key={i}
                    className={`w-4 h-4 drop-shadow ${
                      filled ? 'fill-amber-600 text-amber-700' : 'fill-transparent text-gray-500/80'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 9-Slot Hotbar */}
        <div className="pointer-events-auto bg-stone-900/90 p-1.5 rounded-xl border-2 border-stone-700 shadow-2xl flex items-center gap-1 sm:gap-1.5 max-w-[98vw] overflow-x-auto">
          {hotbar.map((slot, index) => {
            const isSelected = index === selectedIndex;
            const config = slot ? registry.getConfig(slot.blockType) : null;
            const color = slot ? getBlockPreviewColor(slot.blockType) : 'transparent';

            return (
              <button
                key={index}
                onClick={() => onSelectSlot(index)}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-2 border-amber-400 bg-white/20 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                    : 'border border-stone-700 bg-stone-800/80 hover:bg-stone-750'
                }`}
              >
                {/* Slot index indicator */}
                <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-mono text-gray-400 select-none">
                  {index + 1}
                </span>

                {/* Block preview cube/swatch */}
                {slot && (
                  <div
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded shadow-inner border border-black/30"
                    style={{ backgroundColor: color }}
                  />
                )}

                {/* Stack count */}
                {slot && slot.count > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] select-none">
                    {slot.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile On-Screen Touch Controls */}
        {isTouchDevice && (
          <div className="w-full flex items-center justify-between px-4 sm:px-8 mt-1 pointer-events-none">
            {/* Left: Virtual Joystick */}
            <div
              ref={joystickRef}
              onTouchStart={handleJoystickStart}
              onTouchMove={handleJoystickMove}
              onTouchEnd={handleJoystickEnd}
              onTouchCancel={handleJoystickEnd}
              className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black/40 border-2 border-white/20 backdrop-blur-xs flex items-center justify-center touch-none"
            >
              {/* Outer ring guide */}
              <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
              {/* Joystick Thumb */}
              <div
                className="w-12 h-12 rounded-full bg-amber-500/80 border-2 border-white/60 shadow-lg pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                }}
              />
            </div>

            {/* Right: Action Buttons (Break, Place, Jump) */}
            <div className="flex items-center gap-3 pointer-events-auto">
              {/* Break Button (Red) */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMobileBreak();
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/85 hover:bg-red-500 active:scale-90 border-2 border-red-300 shadow-xl flex flex-col items-center justify-center text-white cursor-pointer transition select-none"
              >
                <Box className="w-5 h-5" />
                <span className="text-[10px] font-black tracking-wider uppercase">{t('break_btn', lang)}</span>
              </button>

              {/* Place Button (Green) */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMobilePlace();
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600/85 hover:bg-emerald-500 active:scale-90 border-2 border-emerald-300 shadow-xl flex flex-col items-center justify-center text-white cursor-pointer transition select-none"
              >
                <Box className="w-5 h-5" />
                <span className="text-[10px] font-black tracking-wider uppercase">{t('place_btn', lang)}</span>
              </button>

              {/* Jump Button (Blue) */}
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMobileJump(true);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onMobileJump(false);
                }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sky-600/85 hover:bg-sky-500 active:scale-90 border-2 border-sky-300 shadow-xl flex flex-col items-center justify-center text-white cursor-pointer transition select-none"
              >
                <ChevronsUp className="w-6 h-6" />
                <span className="text-[9px] font-black tracking-wider uppercase">JUMP</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
