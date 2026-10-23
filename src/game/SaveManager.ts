import { SavedWorld, GameSettings, GameMode, BlockType, InventorySlot } from '../types/game';

const DB_NAME = 'BlockWorld3D_DB';
const STORE_NAME = 'worlds';
const SETTINGS_KEY = 'blockworld_settings';
const LAST_WORLD_KEY = 'blockworld_last_world_id';

export class SaveManager {
  private static db: IDBDatabase | null = null;

  public static async initDB(): Promise<boolean> {
    if (this.db) return true;
    if (!('indexedDB' in window)) return false;

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => {
        resolve(false);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  public static async saveWorld(world: SavedWorld): Promise<boolean> {
    try {
      const dbReady = await this.initDB();
      if (dbReady && this.db) {
        return new Promise((resolve) => {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(world);
          req.onsuccess = () => {
            localStorage.setItem(LAST_WORLD_KEY, world.id);
            this.updateWorldListMetadata(world);
            resolve(true);
          };
          req.onerror = () => {
            this.fallbackSave(world);
            resolve(true);
          };
        });
      } else {
        this.fallbackSave(world);
        return true;
      }
    } catch {
      this.fallbackSave(world);
      return true;
    }
  }

  public static async loadWorld(id: string): Promise<SavedWorld | null> {
    try {
      const dbReady = await this.initDB();
      if (dbReady && this.db) {
        return new Promise((resolve) => {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(id);
          req.onsuccess = () => {
            if (req.result) {
              resolve(req.result as SavedWorld);
            } else {
              resolve(this.fallbackLoad(id));
            }
          };
          req.onerror = () => {
            resolve(this.fallbackLoad(id));
          };
        });
      } else {
        return this.fallbackLoad(id);
      }
    } catch {
      return this.fallbackLoad(id);
    }
  }

  public static async listWorlds(): Promise<Array<{ id: string; name: string; lastPlayed: number; gameMode: GameMode }>> {
    try {
      const listStr = localStorage.getItem('blockworld_world_list');
      if (listStr) {
        return JSON.parse(listStr);
      }
    } catch {}
    return [];
  }

  public static async deleteWorld(id: string): Promise<boolean> {
    try {
      const dbReady = await this.initDB();
      if (dbReady && this.db) {
        const tx = this.db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
      }
      localStorage.removeItem(`blockworld_world_${id}`);

      // Update list
      const list = await this.listWorlds();
      const updated = list.filter((w) => w.id !== id);
      localStorage.setItem('blockworld_world_list', JSON.stringify(updated));

      if (localStorage.getItem(LAST_WORLD_KEY) === id) {
        localStorage.removeItem(LAST_WORLD_KEY);
      }
      return true;
    } catch {
      return false;
    }
  }

  public static getLastPlayedWorldId(): string | null {
    return localStorage.getItem(LAST_WORLD_KEY);
  }

  public static createDefaultWorld(name = 'Mening Dunyom', gameMode: GameMode = 'creative', customSeed?: number): SavedWorld {
    const id = 'world_' + Date.now().toString(36);
    const seed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 999999);

    // Initial 9-slot hotbar default items
    const defaultHotbar: (InventorySlot | null)[] = [
      { blockType: BlockType.GRASS, count: 64 },
      { blockType: BlockType.STONE, count: 64 },
      { blockType: BlockType.OAK_WOOD, count: 64 },
      { blockType: BlockType.OAK_LEAVES, count: 64 },
      { blockType: BlockType.BRICKS, count: 64 },
      { blockType: BlockType.GLASS, count: 64 },
      { blockType: BlockType.PLANKS, count: 64 },
      { blockType: BlockType.BOOKSHELF, count: 64 },
      { blockType: BlockType.TORCH, count: 64 },
    ];

    // Initial 27-slot player inventory
    const defaultInventory: (InventorySlot | null)[] = new Array(27).fill(null);
    defaultInventory[0] = { blockType: BlockType.COBBLESTONE, count: 64 };
    defaultInventory[1] = { blockType: BlockType.SAND, count: 64 };
    defaultInventory[2] = { blockType: BlockType.DIRT, count: 64 };
    defaultInventory[3] = { blockType: BlockType.COAL_ORE, count: 32 };
    defaultInventory[4] = { blockType: BlockType.IRON_ORE, count: 32 };
    defaultInventory[5] = { blockType: BlockType.GOLD_ORE, count: 16 };
    defaultInventory[6] = { blockType: BlockType.DIAMOND_ORE, count: 8 };

    const newWorld: SavedWorld = {
      id,
      name,
      seed,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      gameMode,
      playerPos: [8, 20, 8],
      playerYaw: 0,
      playerPitch: 0,
      timeOfDay: 6000, // noon
      inventory: defaultInventory,
      hotbar: defaultHotbar,
      selectedHotbarIndex: 0,
      modifiedBlocks: {},
    };

    this.saveWorld(newWorld);
    return newWorld;
  }

  private static updateWorldListMetadata(world: SavedWorld) {
    try {
      const listStr = localStorage.getItem('blockworld_world_list');
      let list: Array<{ id: string; name: string; lastPlayed: number; gameMode: GameMode }> = listStr ? JSON.parse(listStr) : [];
      list = list.filter((w) => w.id !== world.id);
      list.unshift({
        id: world.id,
        name: world.name,
        lastPlayed: world.lastPlayed,
        gameMode: world.gameMode,
      });
      localStorage.setItem('blockworld_world_list', JSON.stringify(list));
    } catch {}
  }

  private static fallbackSave(world: SavedWorld) {
    try {
      localStorage.setItem(`blockworld_world_${world.id}`, JSON.stringify(world));
      localStorage.setItem(LAST_WORLD_KEY, world.id);
      this.updateWorldListMetadata(world);
    } catch {}
  }

  private static fallbackLoad(id: string): SavedWorld | null {
    try {
      const str = localStorage.getItem(`blockworld_world_${id}`);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  }

  // Settings
  public static loadSettings(): GameSettings {
    const defaults: GameSettings = {
      language: 'uz',
      renderDistance: 3,
      fov: 70,
      mouseSensitivity: 1.2,
      volume: 0.7,
      graphicsQuality: 'medium',
      showCoordinates: true,
      showFps: true,
    };

    try {
      const str = localStorage.getItem(SETTINGS_KEY);
      if (str) {
        return { ...defaults, ...JSON.parse(str) };
      }
    } catch {}
    return defaults;
  }

  public static saveSettings(settings: GameSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }
}
