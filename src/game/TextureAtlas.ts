import * as THREE from 'three';
import { generateBlockTextures } from '../utils/textures';
import { BlockType } from '../types/game';

// 8x8 tiles = 64 slots of 16x16 pixels -> 128x128 atlas
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;
export const TILE_SIZE = 16;
export const ATLAS_SIZE = ATLAS_COLS * TILE_SIZE; // 128

export interface FaceTileIndices {
  px: number; // +x (right)
  nx: number; // -x (left)
  py: number; // +y (top)
  ny: number; // -y (bottom)
  pz: number; // +z (front)
  nz: number; // -z (back)
}

const TILE_MAP: Record<string, number> = {
  dirt: 0,
  grass_top: 1,
  grass_side: 2,
  stone: 3,
  cobblestone: 4,
  sand: 5,
  wood_side: 6,
  wood_top: 7,
  leaves: 8,
  glass: 9,
  water: 10,
  coal_ore: 11,
  iron_ore: 12,
  gold_ore: 13,
  diamond_ore: 14,
  bricks: 15,
  snow: 16,
  bedrock: 17,
  planks: 18,
  bookshelf: 19,
  torch: 20,
};

export class TextureAtlasManager {
  private static instance: TextureAtlasManager;
  public atlasTexture!: THREE.CanvasTexture;
  public solidMaterial!: THREE.MeshLambertMaterial;
  public transparentMaterial!: THREE.MeshLambertMaterial;
  public waterMaterial!: THREE.MeshLambertMaterial;

  private constructor() {
    this.createAtlas();
  }

  public static getInstance(): TextureAtlasManager {
    if (!TextureAtlasManager.instance) {
      TextureAtlasManager.instance = new TextureAtlasManager();
    }
    return TextureAtlasManager.instance;
  }

  private createAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_SIZE;
    canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d')!;

    // Clear transparent
    ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

    const individualTextures = generateBlockTextures();

    // Draw each texture tile into the canvas
    for (const [name, tileIndex] of Object.entries(TILE_MAP)) {
      const tex = individualTextures[name];
      if (tex && tex.image) {
        const col = tileIndex % ATLAS_COLS;
        const row = Math.floor(tileIndex / ATLAS_COLS);
        ctx.drawImage(tex.image as CanvasImageSource, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    this.atlasTexture = new THREE.CanvasTexture(canvas);
    this.atlasTexture.colorSpace = THREE.SRGBColorSpace;
    this.atlasTexture.magFilter = THREE.NearestFilter;
    this.atlasTexture.minFilter = THREE.NearestFilter;
    this.atlasTexture.generateMipmaps = false;

    // Solid terrain material
    this.solidMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      transparent: false,
      alphaTest: 0.1,
    });

    // Transparent materials (leaves, glass)
    this.transparentMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      transparent: true,
      opacity: 0.95,
      alphaTest: 0.15,
      side: THREE.DoubleSide,
    });

    // Water material (gently translucent blue)
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  public getFaceTileUVs(tileIndex: number): [number, number, number, number] {
    const col = tileIndex % ATLAS_COLS;
    const row = Math.floor(tileIndex / ATLAS_COLS);

    // Three.js texture coordinate: (0,0) is bottom-left, (1,1) is top-right
    // Canvas coordinate: (0,0) is top-left
    const u0 = col / ATLAS_COLS;
    const u1 = (col + 1) / ATLAS_COLS;
    const v1 = 1 - row / ATLAS_ROWS;
    const v0 = 1 - (row + 1) / ATLAS_ROWS;

    return [u0, v0, u1, v1];
  }

  public getBlockTileIndices(type: BlockType): FaceTileIndices {
    switch (type) {
      case BlockType.GRASS:
        return {
          px: TILE_MAP.grass_side,
          nx: TILE_MAP.grass_side,
          py: TILE_MAP.grass_top,
          ny: TILE_MAP.dirt,
          pz: TILE_MAP.grass_side,
          nz: TILE_MAP.grass_side,
        };
      case BlockType.DIRT:
        return { px: TILE_MAP.dirt, nx: TILE_MAP.dirt, py: TILE_MAP.dirt, ny: TILE_MAP.dirt, pz: TILE_MAP.dirt, nz: TILE_MAP.dirt };
      case BlockType.STONE:
        return { px: TILE_MAP.stone, nx: TILE_MAP.stone, py: TILE_MAP.stone, ny: TILE_MAP.stone, pz: TILE_MAP.stone, nz: TILE_MAP.stone };
      case BlockType.COBBLESTONE:
        return { px: TILE_MAP.cobblestone, nx: TILE_MAP.cobblestone, py: TILE_MAP.cobblestone, ny: TILE_MAP.cobblestone, pz: TILE_MAP.cobblestone, nz: TILE_MAP.cobblestone };
      case BlockType.SAND:
        return { px: TILE_MAP.sand, nx: TILE_MAP.sand, py: TILE_MAP.sand, ny: TILE_MAP.sand, pz: TILE_MAP.sand, nz: TILE_MAP.sand };
      case BlockType.OAK_WOOD:
        return {
          px: TILE_MAP.wood_side,
          nx: TILE_MAP.wood_side,
          py: TILE_MAP.wood_top,
          ny: TILE_MAP.wood_top,
          pz: TILE_MAP.wood_side,
          nz: TILE_MAP.wood_side,
        };
      case BlockType.OAK_LEAVES:
        return { px: TILE_MAP.leaves, nx: TILE_MAP.leaves, py: TILE_MAP.leaves, ny: TILE_MAP.leaves, pz: TILE_MAP.leaves, nz: TILE_MAP.leaves };
      case BlockType.GLASS:
        return { px: TILE_MAP.glass, nx: TILE_MAP.glass, py: TILE_MAP.glass, ny: TILE_MAP.glass, pz: TILE_MAP.glass, nz: TILE_MAP.glass };
      case BlockType.WATER:
        return { px: TILE_MAP.water, nx: TILE_MAP.water, py: TILE_MAP.water, ny: TILE_MAP.water, pz: TILE_MAP.water, nz: TILE_MAP.water };
      case BlockType.COAL_ORE:
        return { px: TILE_MAP.coal_ore, nx: TILE_MAP.coal_ore, py: TILE_MAP.coal_ore, ny: TILE_MAP.coal_ore, pz: TILE_MAP.coal_ore, nz: TILE_MAP.coal_ore };
      case BlockType.IRON_ORE:
        return { px: TILE_MAP.iron_ore, nx: TILE_MAP.iron_ore, py: TILE_MAP.iron_ore, ny: TILE_MAP.iron_ore, pz: TILE_MAP.iron_ore, nz: TILE_MAP.iron_ore };
      case BlockType.GOLD_ORE:
        return { px: TILE_MAP.gold_ore, nx: TILE_MAP.gold_ore, py: TILE_MAP.gold_ore, ny: TILE_MAP.gold_ore, pz: TILE_MAP.gold_ore, nz: TILE_MAP.gold_ore };
      case BlockType.DIAMOND_ORE:
        return { px: TILE_MAP.diamond_ore, nx: TILE_MAP.diamond_ore, py: TILE_MAP.diamond_ore, ny: TILE_MAP.diamond_ore, pz: TILE_MAP.diamond_ore, nz: TILE_MAP.diamond_ore };
      case BlockType.BRICKS:
        return { px: TILE_MAP.bricks, nx: TILE_MAP.bricks, py: TILE_MAP.bricks, ny: TILE_MAP.bricks, pz: TILE_MAP.bricks, nz: TILE_MAP.bricks };
      case BlockType.SNOW:
        return { px: TILE_MAP.snow, nx: TILE_MAP.snow, py: TILE_MAP.snow, ny: TILE_MAP.dirt, pz: TILE_MAP.snow, nz: TILE_MAP.snow };
      case BlockType.BEDROCK:
        return { px: TILE_MAP.bedrock, nx: TILE_MAP.bedrock, py: TILE_MAP.bedrock, ny: TILE_MAP.bedrock, pz: TILE_MAP.bedrock, nz: TILE_MAP.bedrock };
      case BlockType.PLANKS:
        return { px: TILE_MAP.planks, nx: TILE_MAP.planks, py: TILE_MAP.planks, ny: TILE_MAP.planks, pz: TILE_MAP.planks, nz: TILE_MAP.planks };
      case BlockType.BOOKSHELF:
        return { px: TILE_MAP.bookshelf, nx: TILE_MAP.bookshelf, py: TILE_MAP.planks, ny: TILE_MAP.planks, pz: TILE_MAP.bookshelf, nz: TILE_MAP.bookshelf };
      case BlockType.TORCH:
        return { px: TILE_MAP.torch, nx: TILE_MAP.torch, py: TILE_MAP.torch, ny: TILE_MAP.torch, pz: TILE_MAP.torch, nz: TILE_MAP.torch };
      default:
        return { px: TILE_MAP.stone, nx: TILE_MAP.stone, py: TILE_MAP.stone, ny: TILE_MAP.stone, pz: TILE_MAP.stone, nz: TILE_MAP.stone };
    }
  }
}
