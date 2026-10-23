import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SavedWorld, GameSettings, BlockType, InventorySlot, GameMode } from '../types/game';
import { VoxelWorld, CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../game/VoxelWorld';
import { PlayerPhysics, PlayerInput } from '../game/PlayerPhysics';
import { DayNightSky } from '../game/DayNightSky';
import { AnimalManager } from '../game/Animals';
import { BlockRegistry } from '../game/BlockRegistry';
import { SaveManager } from '../game/SaveManager';
import { sound } from '../utils/audio';
import { getBlockPreviewColor } from '../utils/textures';
import { HUD } from './HUD';
import { InventoryModal } from './InventoryModal';
import { PauseMenu } from './PauseMenu';
import { SettingsModal } from './SettingsModal';
import { HowToPlayModal } from './HowToPlayModal';

interface GameCanvasProps {
  worldData: SavedWorld;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onExitToMenu: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldData,
  settings,
  onUpdateSettings,
  onExitToMenu,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // React State for HUD & Modals
  const [hotbar, setHotbar] = useState<(InventorySlot | null)[]>(worldData.hotbar);
  const [inventory, setInventory] = useState<(InventorySlot | null)[]>(worldData.inventory);
  const [selectedIndex, setSelectedIndex] = useState(worldData.selectedHotbarIndex || 0);
  const [playerStats, setPlayerStats] = useState({
    health: 20,
    maxHealth: 20,
    hunger: 20,
    maxHunger: 20,
    isFlying: worldData.gameMode === 'creative',
    gameMode: worldData.gameMode,
  });
  const [playerCoords, setPlayerCoords] = useState<[number, number, number]>([
    worldData.playerPos[0],
    worldData.playerPos[1],
    worldData.playerPos[2],
  ]);
  const [fps, setFps] = useState(60);

  // Modals
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Game references for loop & input
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    world: VoxelWorld;
    player: PlayerPhysics;
    sky: DayNightSky;
    animals: AnimalManager;
    targetBox: THREE.LineSegments;
    targetedVoxel: { x: number; y: number; z: number; normal: THREE.Vector3 } | null;
    input: PlayerInput;
    mobileMove: { x: number; y: number };
    particles: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }>;
    particleGroup: THREE.Group;
    lastTime: number;
    frameCount: number;
    fpsTimer: number;
    isPointerLocked: boolean;
  } | null>(null);

  // Keep state refs in sync for the animation loop
  const hotbarRef = useRef(hotbar);
  hotbarRef.current = hotbar;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const inventoryRef = useRef(inventory);
  inventoryRef.current = inventory;
  const isInventoryOpenRef = useRef(isInventoryOpen);
  isInventoryOpenRef.current = isInventoryOpen;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize Game Scene and Engine
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    sound.setVolume(settings.volume);
    sound.startAmbient();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(settings.fov, width / height, 0.1, 200);

    // 2. Renderer
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl && settings.graphicsQuality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. Voxel World
    const world = new VoxelWorld(scene, worldData.seed);
    world.modifiedBlocks = { ...worldData.modifiedBlocks };

    // 4. Player Physics
    const spawnX = worldData.playerPos[0];
    const spawnY = worldData.playerPos[1];
    const spawnZ = worldData.playerPos[2];
    const player = new PlayerPhysics(spawnX, spawnY, spawnZ, worldData.gameMode);
    player.yaw = worldData.playerYaw || 0;
    player.pitch = worldData.playerPitch || 0;

    // Initial terrain generation around player
    world.updateLoadedChunks(spawnX, spawnZ, settings.renderDistance);

    // Ensure player is above ground if spawned inside ground
    const currentGround = world.getGroundHeight(Math.floor(spawnX), Math.floor(spawnZ));
    if (player.position.y < currentGround) {
      player.position.y = currentGround + 1;
    }

    // 5. Day-Night Sky
    const sky = new DayNightSky(scene);
    sky.setTimeOfDay(worldData.timeOfDay || 6000);

    // 6. Animals
    const animals = new AnimalManager(scene);
    animals.spawnInitialAnimals(world, 10);

    // 7. Targeted Voxel Outline Box
    const boxGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const targetBox = new THREE.LineSegments(edgesGeo, lineMat);
    targetBox.visible = false;
    scene.add(targetBox);

    // 8. Particle Group for Block Breaking
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // 9. Input State
    const input: PlayerInput = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sprint: false,
      crouch: false,
    };

    gameRef.current = {
      scene,
      camera,
      renderer,
      world,
      player,
      sky,
      animals,
      targetBox,
      targetedVoxel: null,
      input,
      mobileMove: { x: 0, y: 0 },
      particles: [],
      particleGroup,
      lastTime: performance.now(),
      frameCount: 0,
      fpsTimer: performance.now(),
      isPointerLocked: false,
    };

    // Desktop Pointer Lock listeners
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === renderer.domElement;
      if (gameRef.current) {
        gameRef.current.isPointerLocked = isLocked;
      }
      if (!isLocked && !isInventoryOpenRef.current) {
        setIsPaused(true);
      }
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    // Mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      if (!gameRef.current || !gameRef.current.isPointerLocked) return;
      if (isPausedRef.current || isInventoryOpenRef.current) return;

      const sens = settingsRef.current.mouseSensitivity * 0.002;
      player.yaw -= e.movementX * sens;
      player.pitch -= e.movementY * sens;
      // Clamp vertical look to -89 to +89 degrees
      player.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, player.pitch));
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPausedRef.current) {
        if (e.code === 'Escape') setIsPaused(false);
        return;
      }

      if (e.code === 'KeyE') {
        if (isInventoryOpenRef.current) {
          setIsInventoryOpen(false);
          renderer.domElement.requestPointerLock().catch(() => {});
        } else {
          setIsInventoryOpen(true);
          document.exitPointerLock();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (isInventoryOpenRef.current) {
          setIsInventoryOpen(false);
        } else {
          setIsPaused(true);
          document.exitPointerLock();
        }
        return;
      }

      if (isInventoryOpenRef.current) return;

      switch (e.code) {
        case 'KeyW':
          input.forward = true;
          break;
        case 'KeyS':
          input.backward = true;
          break;
        case 'KeyA':
          input.left = true;
          break;
        case 'KeyD':
          input.right = true;
          break;
        case 'Space':
          input.jump = true;
          // Creative double-space detection for flight toggle
          const now = performance.now();
          if (now - player.lastSpacePressTime < 300) {
            player.toggleFlight();
            setPlayerStats((prev) => ({ ...prev, isFlying: player.isFlying }));
          }
          player.lastSpacePressTime = now;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          input.sprint = true;
          break;
        case 'KeyC':
          input.crouch = true;
          break;
        // Hotbar selection with 1-9
        case 'Digit1': setSelectedIndex(0); break;
        case 'Digit2': setSelectedIndex(1); break;
        case 'Digit3': setSelectedIndex(2); break;
        case 'Digit4': setSelectedIndex(3); break;
        case 'Digit5': setSelectedIndex(4); break;
        case 'Digit6': setSelectedIndex(5); break;
        case 'Digit7': setSelectedIndex(6); break;
        case 'Digit8': setSelectedIndex(7); break;
        case 'Digit9': setSelectedIndex(8); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': input.forward = false; break;
        case 'KeyS': input.backward = false; break;
        case 'KeyA': input.left = false; break;
        case 'KeyD': input.right = false; break;
        case 'Space': input.jump = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': input.sprint = false; break;
        case 'KeyC': input.crouch = false; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse wheel hotbar scroll
    const handleWheel = (e: WheelEvent) => {
      if (isPausedRef.current || isInventoryOpenRef.current) return;
      if (e.deltaY > 0) {
        setSelectedIndex((prev) => (prev + 1) % 9);
      } else if (e.deltaY < 0) {
        setSelectedIndex((prev) => (prev - 1 + 9) % 9);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });

    // Mouse click: Left = Break, Right = Place
    const handleMouseDown = (e: MouseEvent) => {
      if (!gameRef.current?.isPointerLocked) {
        // Request lock on canvas click
        if (!isPausedRef.current && !isInventoryOpenRef.current) {
          renderer.domElement.requestPointerLock().catch(() => {});
        }
        return;
      }

      if (e.button === 0) {
        // Left click: Break
        performBreakBlock();
      } else if (e.button === 2) {
        // Right click: Place
        performPlaceBlock();
      }
    };
    window.addEventListener('mousedown', handleMouseDown);

    // Prevent context menu on right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // Mobile touch drag for camera rotation
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1 && e.touches[0].clientX > window.innerWidth * 0.35) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && e.touches[0].clientX > window.innerWidth * 0.35) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        const sens = settingsRef.current.mouseSensitivity * 0.0035;
        player.yaw -= dx * sens;
        player.pitch -= dy * sens;
        player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
      }
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.fov = settingsRef.current.fov;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Main 60 FPS Game Loop
    let animId = 0;
    let chunkUpdateCooldown = 0;

    const gameLoop = () => {
      const now = performance.now();
      const delta = Math.min((now - gameRef.current!.lastTime) / 1000, 0.1);
      gameRef.current!.lastTime = now;

      // FPS counter
      gameRef.current!.frameCount++;
      if (now - gameRef.current!.fpsTimer > 500) {
        setFps((gameRef.current!.frameCount * 1000) / (now - gameRef.current!.fpsTimer));
        gameRef.current!.frameCount = 0;
        gameRef.current!.fpsTimer = now;
      }

      if (!isPausedRef.current && !isInventoryOpenRef.current) {
        // 1. Process Mobile joystick movement input if active
        if (gameRef.current!.mobileMove.x !== 0 || gameRef.current!.mobileMove.y !== 0) {
          input.forward = gameRef.current!.mobileMove.y < -0.25;
          input.backward = gameRef.current!.mobileMove.y > 0.25;
          input.left = gameRef.current!.mobileMove.x < -0.25;
          input.right = gameRef.current!.mobileMove.x > 0.25;
        }

        // 2. Update Player Physics
        player.update(delta, input, world, (damage) => {
          sound.playBreakSound('wood');
          setPlayerStats((prev) => ({ ...prev, health: player.health }));
        });

        // 3. Update Camera Position from Player Eye
        camera.position.set(
          player.position.x,
          player.position.y + player.eyeHeight,
          player.position.z
        );

        // Calculate view direction
        const dir = new THREE.Vector3(
          -Math.sin(player.yaw) * Math.cos(player.pitch),
          Math.sin(player.pitch),
          -Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        camera.lookAt(camera.position.clone().add(dir));

        // 4. Update Day/Night Atmosphere & Sky
        sky.update(delta, player.position);

        // 5. Update Animals
        animals.update(delta, world);

        // 6. Raycast to find targeted block (Crosshair ray)
        performVoxelRaycast(camera, world);

        // 7. Update Particles
        updateParticles(delta);

        // 8. Chunks streaming update every ~1.5s
        chunkUpdateCooldown -= delta;
        if (chunkUpdateCooldown <= 0) {
          chunkUpdateCooldown = 1.2;
          world.updateLoadedChunks(player.position.x, player.position.z, settingsRef.current.renderDistance);
          setPlayerCoords([player.position.x, player.position.y, player.position.z]);
        }
      }

      // Render Scene
      renderer.render(scene, camera);
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animId);
      sound.stopAmbient();
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      world.dispose();
      sky.dispose();
      animals.dispose();
      boxGeo.dispose();
      edgesGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Raycasting for targeting voxels
  const performVoxelRaycast = (camera: THREE.PerspectiveCamera, world: VoxelWorld) => {
    if (!gameRef.current) return;

    const maxReach = 5.5;
    const rayDir = new THREE.Vector3();
    camera.getWorldDirection(rayDir);
    const origin = camera.position.clone();

    // Fast 3D DDA voxel traversal algorithm
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = Math.sign(rayDir.x);
    const stepY = Math.sign(rayDir.y);
    const stepZ = Math.sign(rayDir.z);

    const tDeltaX = stepX !== 0 ? Math.abs(1 / rayDir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / rayDir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / rayDir.z) : Infinity;

    let tMaxX = stepX > 0 ? (x + 1 - origin.x) * tDeltaX : (origin.x - x) * tDeltaX;
    let tMaxY = stepY > 0 ? (y + 1 - origin.y) * tDeltaY : (origin.y - y) * tDeltaY;
    let tMaxZ = stepZ > 0 ? (z + 1 - origin.z) * tDeltaZ : (origin.z - z) * tDeltaZ;

    let normal = new THREE.Vector3(0, 0, 0);
    let dist = 0;
    let hit = false;

    while (dist < maxReach) {
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX;
          dist = tMaxX;
          tMaxX += tDeltaX;
          normal.set(-stepX, 0, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY;
          dist = tMaxY;
          tMaxY += tDeltaY;
          normal.set(0, -stepY, 0);
        } else {
          z += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          normal.set(0, 0, -stepZ);
        }
      }

      const block = world.getBlock(x, y, z);
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        hit = true;
        break;
      }
    }

    if (hit) {
      gameRef.current.targetedVoxel = { x, y, z, normal };
      gameRef.current.targetBox.position.set(x + 0.5, y + 0.5, z + 0.5);
      gameRef.current.targetBox.visible = true;
    } else {
      gameRef.current.targetedVoxel = null;
      gameRef.current.targetBox.visible = false;
    }
  };

  // Perform Break Block Action
  const performBreakBlock = useCallback(() => {
    if (!gameRef.current || !gameRef.current.targetedVoxel) return;
    const { x, y, z } = gameRef.current.targetedVoxel;
    const world = gameRef.current.world;
    const currentBlock = world.getBlock(x, y, z);
    if (currentBlock === BlockType.AIR || currentBlock === BlockType.BEDROCK) return;

    const registry = BlockRegistry.getInstance();
    const config = registry.getConfig(currentBlock);
    const dropItem = config ? config.dropItem : currentBlock;

    // Spawn breaking particles
    spawnBreakParticles(x + 0.5, y + 0.5, z + 0.5, currentBlock);

    // Play Sound
    sound.playBreakSound(config?.soundType || 'stone');

    // Remove Block
    world.setBlock(x, y, z, BlockType.AIR);

    // Add to Player inventory if survival mode
    if (playerStats.gameMode === 'survival' && dropItem !== BlockType.AIR) {
      sound.playCollectSound();
      addItemToInventory({ blockType: dropItem, count: 1 });
    }
  }, [playerStats.gameMode]);

  // Perform Place Block Action
  const performPlaceBlock = useCallback(() => {
    if (!gameRef.current || !gameRef.current.targetedVoxel) return;
    const { x, y, z, normal } = gameRef.current.targetedVoxel;
    const placeX = x + normal.x;
    const placeY = y + normal.y;
    const placeZ = z + normal.z;

    const curHotbar = [...hotbarRef.current];
    const curIdx = selectedIndexRef.current;
    const activeSlot = curHotbar[curIdx];

    if (!activeSlot || activeSlot.count <= 0) return;

    // Check collision against player body bounding box
    const player = gameRef.current.player;
    if (player.doesBlockCollideWithPlayer(placeX, placeY, placeZ)) {
      return; // Prevent placing inside player
    }

    const world = gameRef.current.world;
    const registry = BlockRegistry.getInstance();
    const config = registry.getConfig(activeSlot.blockType);

    // Set Block in world
    world.setBlock(placeX, placeY, placeZ, activeSlot.blockType);
    sound.playPlaceSound(config?.soundType || 'wood');

    // Deduct count in survival mode
    if (playerStats.gameMode === 'survival') {
      activeSlot.count -= 1;
      if (activeSlot.count <= 0) {
        curHotbar[curIdx] = null;
      }
      setHotbar(curHotbar);
    }
  }, [playerStats.gameMode]);

  // Add Item to Inventory / Hotbar
  const addItemToInventory = (item: InventorySlot) => {
    const curHot = [...hotbarRef.current];
    const curInv = [...inventoryRef.current];

    // Try hotbar stack
    for (let i = 0; i < curHot.length; i++) {
      if (curHot[i]?.blockType === item.blockType && curHot[i]!.count < 64) {
        curHot[i]!.count += item.count;
        setHotbar(curHot);
        return;
      }
    }
    // Try inventory stack
    for (let i = 0; i < curInv.length; i++) {
      if (curInv[i]?.blockType === item.blockType && curInv[i]!.count < 64) {
        curInv[i]!.count += item.count;
        setInventory(curInv);
        return;
      }
    }
    // Try hotbar empty
    for (let i = 0; i < curHot.length; i++) {
      if (!curHot[i]) {
        curHot[i] = { ...item };
        setHotbar(curHot);
        return;
      }
    }
    // Try inventory empty
    for (let i = 0; i < curInv.length; i++) {
      if (!curInv[i]) {
        curInv[i] = { ...item };
        setInventory(curInv);
        return;
      }
    }
  };

  // Spawn visual break particles
  const spawnBreakParticles = (x: number, y: number, z: number, blockType: BlockType) => {
    if (!gameRef.current) return;
    const pGroup = gameRef.current.particleGroup;
    const colorHex = getBlockPreviewColor(blockType);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    for (let i = 0; i < 12; i++) {
      const pMesh = new THREE.Mesh(pGeo, mat);
      pMesh.position.set(
        x + (Math.random() - 0.5) * 0.6,
        y + (Math.random() - 0.5) * 0.6,
        z + (Math.random() - 0.5) * 0.6
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      pGroup.add(pMesh);
      gameRef.current.particles.push({ mesh: pMesh, vel, life: 0.6 });
    }
  };

  const updateParticles = (delta: number) => {
    if (!gameRef.current) return;
    const particles = gameRef.current.particles;
    const pGroup = gameRef.current.particleGroup;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= delta;
      p.vel.y -= 18 * delta; // particle gravity
      p.mesh.position.addScaledVector(p.vel, delta);

      if (p.life <= 0) {
        pGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        particles.splice(i, 1);
      }
    }
  };

  // Save Game Handler
  const handleSaveGame = async () => {
    if (!gameRef.current) return;
    const player = gameRef.current.player;
    const sky = gameRef.current.sky;
    const world = gameRef.current.world;

    const updatedWorld: SavedWorld = {
      ...worldData,
      lastPlayed: Date.now(),
      playerPos: [player.position.x, player.position.y, player.position.z],
      playerYaw: player.yaw,
      playerPitch: player.pitch,
      timeOfDay: sky.timeOfDay,
      inventory: inventoryRef.current,
      hotbar: hotbarRef.current,
      selectedHotbarIndex: selectedIndexRef.current,
      modifiedBlocks: { ...world.modifiedBlocks },
    };

    await SaveManager.saveWorld(updatedWorld);
  };

  // Reset World Handler
  const handleResetWorld = () => {
    if (!gameRef.current) return;
    const world = gameRef.current.world;
    world.modifiedBlocks = {};
    for (const chunk of world.chunks.values()) {
      chunk.isGenerated = false;
      world.generateChunkTerrain(chunk);
      world.buildChunkMesh(chunk);
    }
    gameRef.current.player.respawn(world);
    handleSaveGame();
    setIsPaused(false);
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 touch-none cursor-crosshair" />

      {/* In-Game HUD */}
      {!isPaused && (
        <HUD
          hotbar={hotbar}
          selectedIndex={selectedIndex}
          onSelectSlot={(idx) => setSelectedIndex(idx)}
          health={playerStats.health}
          maxHealth={playerStats.maxHealth}
          hunger={playerStats.hunger}
          maxHunger={playerStats.maxHunger}
          gameMode={playerStats.gameMode}
          isFlying={playerStats.isFlying}
          onToggleFlight={() => {
            if (gameRef.current) {
              gameRef.current.player.toggleFlight();
              setPlayerStats((prev) => ({ ...prev, isFlying: gameRef.current!.player.isFlying }));
            }
          }}
          playerPos={playerCoords}
          fps={fps}
          showCoordinates={settings.showCoordinates}
          showFps={settings.showFps}
          onOpenInventory={() => {
            setIsInventoryOpen(true);
            document.exitPointerLock();
          }}
          onPause={() => {
            setIsPaused(true);
            document.exitPointerLock();
          }}
          lang={settings.language}
          onMobileMove={(dx, dy) => {
            if (gameRef.current) {
              gameRef.current.mobileMove = { x: dx, y: dy };
            }
          }}
          onMobileJump={(active) => {
            if (gameRef.current) {
              gameRef.current.input.jump = active;
              if (active && playerStats.gameMode === 'creative') {
                const now = performance.now();
                if (now - gameRef.current.player.lastSpacePressTime < 350) {
                  gameRef.current.player.toggleFlight();
                  setPlayerStats((prev) => ({ ...prev, isFlying: gameRef.current!.player.isFlying }));
                }
                gameRef.current.player.lastSpacePressTime = now;
              }
            }
          }}
          onMobileBreak={performBreakBlock}
          onMobilePlace={performPlaceBlock}
        />
      )}

      {/* Full Inventory & Crafting Modal */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        hotbar={hotbar}
        onUpdateInventory={(inv) => setInventory(inv)}
        onUpdateHotbar={(hot) => setHotbar(hot)}
        gameMode={playerStats.gameMode}
        lang={settings.language}
      />

      {/* Pause Menu */}
      <PauseMenu
        isOpen={isPaused}
        onResume={() => {
          setIsPaused(false);
          if (gameRef.current?.renderer.domElement) {
            gameRef.current.renderer.domElement.requestPointerLock().catch(() => {});
          }
        }}
        onSave={handleSaveGame}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHowToPlay={() => setShowHowToPlay(true)}
        onResetWorld={handleResetWorld}
        onExitToMenu={async () => {
          await handleSaveGame();
          onExitToMenu();
        }}
        lang={settings.language}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={(s) => {
          onUpdateSettings(s);
          sound.setVolume(s.volume);
          if (gameRef.current) {
            gameRef.current.camera.fov = s.fov;
            gameRef.current.camera.updateProjectionMatrix();
          }
        }}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
        lang={settings.language}
      />
    </div>
  );
};
