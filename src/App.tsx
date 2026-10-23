import React, { useState, useEffect } from 'react';
import { SavedWorld, GameSettings, GameMode } from './types/game';
import { SaveManager } from './game/SaveManager';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { sound } from './utils/audio';
import { Box } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'menu' | 'playing'>('menu');
  const [activeWorld, setActiveWorld] = useState<SavedWorld | null>(null);
  const [settings, setSettings] = useState<GameSettings>(() => SaveManager.loadSettings());
  const [isLoadingWorld, setIsLoadingWorld] = useState(false);
  const [loadingText, setLoadingText] = useState('Voksellar yuklanmoqda...');

  useEffect(() => {
    SaveManager.saveSettings(settings);
    sound.setVolume(settings.volume);
  }, [settings]);

  const handleStartGame = async (worldId: string) => {
    setIsLoadingWorld(true);
    setLoadingText("Dunyo xaritasi tayyorlanmoqda...");

    const world = await SaveManager.loadWorld(worldId);
    if (world) {
      setTimeout(() => {
        setActiveWorld(world);
        setCurrentView('playing');
        setIsLoadingWorld(false);
      }, 350);
    } else {
      // Create a default world if not found
      const defWorld = SaveManager.createDefaultWorld('Mening Dunyom', 'creative');
      setTimeout(() => {
        setActiveWorld(defWorld);
        setCurrentView('playing');
        setIsLoadingWorld(false);
      }, 350);
    }
  };

  const handleCreateNewWorld = async (name: string, gameMode: GameMode, seed?: number) => {
    setIsLoadingWorld(true);
    setLoadingText("Procedural tepaliklar va daryolar shakllantirilmoqda...");

    const newWorld = SaveManager.createDefaultWorld(name, gameMode, seed);
    setTimeout(() => {
      setActiveWorld(newWorld);
      setCurrentView('playing');
      setIsLoadingWorld(false);
    }, 450);
  };

  const handleExitToMenu = () => {
    setActiveWorld(null);
    setCurrentView('menu');
  };

  return (
    <div className="w-full h-screen bg-stone-950 text-white overflow-hidden select-none font-sans">
      {/* Animated Loading Screen */}
      {isLoadingWorld && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-stone-950 text-white p-6 animate-fade-in">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center animate-bounce">
              <Box className="w-10 h-10 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest mb-2">
            BlockWorld 3D
          </h2>
          <p className="text-sm font-semibold text-gray-300 animate-pulse">
            {loadingText}
          </p>
        </div>
      )}

      {/* Main Menu View */}
      {currentView === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onCreateNewWorld={handleCreateNewWorld}
          settings={settings}
          onUpdateSettings={setSettings}
        />
      )}

      {/* Play Game View */}
      {currentView === 'playing' && activeWorld && (
        <GameCanvas
          worldData={activeWorld}
          settings={settings}
          onUpdateSettings={setSettings}
          onExitToMenu={handleExitToMenu}
        />
      )}
    </div>
  );
}
