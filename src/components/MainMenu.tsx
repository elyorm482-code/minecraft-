import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameSettings, GameMode } from '../types/game';
import { SaveManager } from '../game/SaveManager';
import { t } from '../i18n/translations';
import { sound } from '../utils/audio';
import { TextureAtlasManager } from '../game/TextureAtlas';
import { PerlinNoise } from '../utils/noise';
import { Play, Plus, FastForward, Sliders, HelpCircle, Info, Box } from 'lucide-react';
import { CreateWorldModal } from './CreateWorldModal';
import { SavedWorldsModal } from './SavedWorldsModal';
import { SettingsModal } from './SettingsModal';
import { HowToPlayModal } from './HowToPlayModal';
import { AboutModal } from './AboutModal';

interface MainMenuProps {
  onStartGame: (worldId: string) => void;
  onCreateNewWorld: (name: string, gameMode: GameMode, seed?: number) => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onCreateNewWorld,
  settings,
  onUpdateSettings,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [lastWorldId, setLastWorldId] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorldsModal, setShowWorldsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  useEffect(() => {
    const lastId = SaveManager.getLastPlayedWorldId();
    setLastWorldId(lastId);
  }, []);

  // Three.js 3D rotating background diorama
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(22, 14, 22);

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    container.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
    dirLight.position.set(18, 30, 15);
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x9bd8ff, 0x4f633d, 0.6);
    scene.add(hemiLight);

    // Build miniature rotating voxel island
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    const atlas = TextureAtlasManager.getInstance();
    const noise = new PerlinNoise(4242);

    // Generate miniature terrain (20x20 blocks)
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const size = 18;
    for (let x = -size / 2; x <= size / 2; x++) {
      for (let z = -size / 2; z <= size / 2; z++) {
        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter > size / 2) continue; // round island shape

        const h = Math.floor(4 + noise.fractal2D(x * 0.15, z * 0.15, 2) * 5);
        for (let y = 0; y <= h; y++) {
          let tileIdx = 0; // dirt
          let shade = 0.8;
          if (y === h) {
            tileIdx = 1; // grass top
            shade = 1.0;
          } else if (y < h - 2) {
            tileIdx = 3; // stone
            shade = 0.7;
          }

          // Top face quad
          if (y === h) {
            const [u0, v0, u1, v1] = atlas.getFaceTileUVs(tileIdx);
            const vOff = positions.length / 3;
            positions.push(
              x, y + 1, z + 1,
              x + 1, y + 1, z + 1,
              x + 1, y + 1, z,
              x, y + 1, z
            );
            normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            for (let i = 0; i < 4; i++) colors.push(shade, shade, shade);
            uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
            indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
          }
        }
      }
    }

    // Mini Tree
    const [tu0, tv0, tu1, tv1] = atlas.getFaceTileUVs(6); // wood
    for (let ty = 6; ty <= 9; ty++) {
      const vOff = positions.length / 3;
      positions.push(
        -1, ty + 1, 1,
        0, ty + 1, 1,
        0, ty + 1, 0,
        -1, ty + 1, 0
      );
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      for (let i = 0; i < 4; i++) colors.push(0.9, 0.9, 0.9);
      uvs.push(tu0, tv0, tu1, tv0, tu1, tv1, tu0, tv1);
      indices.push(vOff, vOff + 1, vOff + 2, vOff, vOff + 2, vOff + 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    const mat = atlas.solidMaterial.clone();
    mat.vertexColors = true;
    const islandMesh = new THREE.Mesh(geo, mat);
    dioramaGroup.add(islandMesh);

    // Floating Clouds
    const cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 6; i++) {
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(6 + i * 2, 1.2, 5 + i), cloudMat);
      cloud.position.set((Math.random() - 0.5) * 40, 16 + i * 1.5, (Math.random() - 0.5) * 40);
      cloudsGroup.add(cloud);
    }
    dioramaGroup.add(cloudsGroup);

    // Animation loop
    let animId = 0;
    let angle = 0;

    const animate = () => {
      angle += 0.003;
      camera.position.x = Math.sin(angle) * 24;
      camera.position.z = Math.cos(angle) * 24;
      camera.lookAt(0, 5, 0);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  const handleContinue = () => {
    sound.playCollectSound();
    if (lastWorldId) {
      onStartGame(lastWorldId);
    } else {
      setShowWorldsModal(true);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden select-none font-sans">
      {/* 3D Background Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Dark gradient overlay for UI contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75 z-1 pointer-events-none" />

      {/* Foreground UI Menu */}
      <div className="relative z-10 w-full h-full min-h-screen flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-none">
        {/* Top Logo & Title */}
        <div className="flex flex-col items-center gap-2 mt-4 sm:mt-8 pointer-events-auto text-center animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-amber-500 to-sky-400 p-0.5 shadow-2xl flex items-center justify-center transform -rotate-3 hover:rotate-0 transition">
              <div className="w-full h-full bg-stone-900 rounded-[14px] flex items-center justify-center text-amber-400">
                <Box className="w-8 h-8 fill-amber-500/20" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
              {t('game_title', settings.language)}
            </h1>
          </div>

          <p className="text-xs sm:text-sm font-bold text-amber-200/90 tracking-widest uppercase drop-shadow">
            {t('game_subtitle', settings.language)}
          </p>
        </div>

        {/* Center Main Menu Buttons */}
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col gap-2.5 pointer-events-auto my-auto animate-fade-in">
          {/* PLAY WORLD */}
          <button
            onClick={() => {
              sound.playInventorySound(true);
              setShowWorldsModal(true);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm tracking-wide uppercase shadow-[0_4px_16px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 transition"
          >
            <Play className="w-5 h-5 fill-current" />
            {t('play_world', settings.language)}
          </button>

          {/* CREATE NEW WORLD */}
          <button
            onClick={() => {
              sound.playInventorySound(true);
              setShowCreateModal(true);
            }}
            className="w-full py-3 px-6 rounded-2xl bg-stone-900/85 hover:bg-stone-800/90 border-2 border-emerald-500/70 text-emerald-300 hover:text-emerald-200 font-bold text-sm tracking-wide uppercase shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 transition backdrop-blur-xs"
          >
            <Plus className="w-5 h-5 text-emerald-400" />
            {t('create_world', settings.language)}
          </button>

          {/* CONTINUE GAME */}
          <button
            onClick={handleContinue}
            className="w-full py-3 px-6 rounded-2xl bg-stone-900/85 hover:bg-stone-800/90 border border-stone-700 hover:border-amber-400/50 text-white font-bold text-sm tracking-wide uppercase shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 transition backdrop-blur-xs"
          >
            <FastForward className="w-5 h-5 text-amber-400" />
            {t('continue_game', settings.language)}
          </button>

          {/* Row of Settings, How to play, About */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            {/* SETTINGS */}
            <button
              onClick={() => {
                sound.playInventorySound(true);
                setShowSettingsModal(true);
              }}
              className="py-3 rounded-2xl bg-stone-900/85 hover:bg-stone-800/90 border border-stone-700 hover:border-sky-400/50 text-sky-300 font-bold text-xs uppercase shadow flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition backdrop-blur-xs"
              title={t('settings', settings.language)}
            >
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>{t('settings', settings.language)}</span>
            </button>

            {/* HOW TO PLAY */}
            <button
              onClick={() => {
                sound.playInventorySound(true);
                setShowHowToPlayModal(true);
              }}
              className="py-3 rounded-2xl bg-stone-900/85 hover:bg-stone-800/90 border border-stone-700 hover:border-amber-400/50 text-amber-300 font-bold text-xs uppercase shadow flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition backdrop-blur-xs"
              title={t('how_to_play', settings.language)}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Qo'llanma</span>
            </button>

            {/* ABOUT BLOCKWORLD */}
            <button
              onClick={() => {
                sound.playInventorySound(true);
                setShowAboutModal(true);
              }}
              className="py-3 rounded-2xl bg-stone-900/85 hover:bg-stone-800/90 border border-stone-700 hover:border-purple-400/50 text-purple-300 font-bold text-xs uppercase shadow flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition backdrop-blur-xs"
              title={t('about', settings.language)}
            >
              <Info className="w-4 h-4 text-purple-400" />
              <span>Haqida</span>
            </button>
          </div>
        </div>

        {/* Footer info badge */}
        <div className="pointer-events-auto flex items-center justify-between w-full max-w-xl text-[11px] text-gray-300 bg-black/40 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/10">
          <span>WebGL 2.0 Voxel Engine</span>
          <span className="font-semibold text-amber-300">v1.0.0 Stable</span>
          <span>© 2026 BlockWorld</span>
        </div>
      </div>

      {/* Modals */}
      <CreateWorldModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateWorld={(name, mode, seed) => {
          setShowCreateModal(false);
          onCreateNewWorld(name, mode, seed);
        }}
        lang={settings.language}
      />

      <SavedWorldsModal
        isOpen={showWorldsModal}
        onClose={() => setShowWorldsModal(false)}
        onLoadWorld={(id) => {
          setShowWorldsModal(false);
          onStartGame(id);
        }}
        onOpenCreateModal={() => {
          setShowWorldsModal(false);
          setShowCreateModal(true);
        }}
        lang={settings.language}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      <HowToPlayModal
        isOpen={showHowToPlayModal}
        onClose={() => setShowHowToPlayModal(false)}
        lang={settings.language}
      />

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        lang={settings.language}
      />
    </div>
  );
};
