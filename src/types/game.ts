export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  COBBLESTONE = 4,
  SAND = 5,
  OAK_WOOD = 6,
  OAK_LEAVES = 7,
  GLASS = 8,
  WATER = 9,
  COAL_ORE = 10,
  IRON_ORE = 11,
  GOLD_ORE = 12,
  DIAMOND_ORE = 13,
  BRICKS = 14,
  SNOW = 15,
  BEDROCK = 16,
  PLANKS = 17,
  BOOKSHELF = 18,
  TORCH = 19,
}

export type GameMode = 'creative' | 'survival';

export interface BlockConfig {
  id: BlockType;
  nameKey: string;
  isTransparent?: boolean;
  isSolid?: boolean;
  isLiquid?: boolean;
  lightEmission?: number;
  soundType: 'grass' | 'dirt' | 'stone' | 'wood' | 'sand' | 'glass' | 'water';
  colors: {
    top: string;
    side: string;
    bottom: string;
  };
  hardness: number; // break time in seconds
  dropItem: BlockType;
}

export interface InventorySlot {
  blockType: BlockType;
  count: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  isFlying: boolean;
  gameMode: GameMode;
}

export interface SavedWorld {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  lastPlayed: number;
  gameMode: GameMode;
  playerPos: [number, number, number];
  playerYaw: number;
  playerPitch: number;
  timeOfDay: number; // 0 to 24000
  inventory: (InventorySlot | null)[];
  hotbar: (InventorySlot | null)[];
  selectedHotbarIndex: number;
  modifiedBlocks: Record<string, BlockType>; // "x,y,z" -> BlockType
}

export interface GameSettings {
  language: 'uz' | 'en' | 'ru';
  renderDistance: number; // in chunks, e.g. 3 to 8
  fov: number; // 60 to 90
  mouseSensitivity: number; // 0.5 to 3.0
  volume: number; // 0 to 1
  graphicsQuality: 'low' | 'medium' | 'high';
  showCoordinates: boolean;
  showFps: boolean;
}

export interface CraftingRecipe {
  id: string;
  nameKey: string;
  // 2x2 or 3x3 pattern or shapeless requirement
  ingredients: { type: BlockType; count: number }[];
  result: { type: BlockType; count: number };
}

export interface EntityAnimal {
  id: string;
  type: 'cow' | 'sheep' | 'chicken';
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  vz: number;
  isGrounded: boolean;
  walkCycle: number;
  idleTimer: number;
  state: 'idle' | 'walk';
}
