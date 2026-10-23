import * as THREE from 'three';
import { BlockType, BlockConfig } from '../types/game';
import { generateBlockTextures } from '../utils/textures';

export interface BlockMaterialSet {
  materials: THREE.Material[]; // [px, nx, py, ny, pz, nz] or single material
  isTransparent?: boolean;
}

export class BlockRegistry {
  private static instance: BlockRegistry;
  public textures: Record<string, THREE.CanvasTexture> = {};
  public materialCache: Map<BlockType, THREE.Material[]> = new Map();
  public configs: Map<BlockType, BlockConfig> = new Map();

  private constructor() {
    this.textures = generateBlockTextures();
    this.registerDefaults();
  }

  public static getInstance(): BlockRegistry {
    if (!BlockRegistry.instance) {
      BlockRegistry.instance = new BlockRegistry();
    }
    return BlockRegistry.instance;
  }

  private registerDefaults() {
    const defineBlock = (config: BlockConfig, faceKeys: [string, string, string, string, string, string]) => {
      this.configs.set(config.id, config);

      // Create materials: [right (+x), left (-x), top (+y), bottom (-y), front (+z), back (-z)]
      const mats = faceKeys.map((key) => {
        const tex = this.textures[key];
        const isGlass = config.id === BlockType.GLASS;
        const isWater = config.id === BlockType.WATER;
        const isLeaves = config.id === BlockType.OAK_LEAVES;

        return new THREE.MeshLambertMaterial({
          map: tex,
          transparent: config.isTransparent || isGlass || isWater || isLeaves,
          opacity: isWater ? 0.75 : isGlass ? 0.45 : 1.0,
          depthWrite: !isWater,
          alphaTest: isLeaves ? 0.2 : 0,
          side: isWater || isLeaves ? THREE.DoubleSide : THREE.FrontSide,
        });
      });

      this.materialCache.set(config.id, mats);
    };

    // 1. Grass
    defineBlock(
      {
        id: BlockType.GRASS,
        nameKey: 'block_grass',
        soundType: 'grass',
        hardness: 0.6,
        dropItem: BlockType.DIRT,
        colors: { top: '#567d46', side: '#637e41', bottom: '#866043' },
      },
      ['grass_side', 'grass_side', 'grass_top', 'dirt', 'grass_side', 'grass_side']
    );

    // 2. Dirt
    defineBlock(
      {
        id: BlockType.DIRT,
        nameKey: 'block_dirt',
        soundType: 'dirt',
        hardness: 0.5,
        dropItem: BlockType.DIRT,
        colors: { top: '#866043', side: '#866043', bottom: '#866043' },
      },
      ['dirt', 'dirt', 'dirt', 'dirt', 'dirt', 'dirt']
    );

    // 3. Stone
    defineBlock(
      {
        id: BlockType.STONE,
        nameKey: 'block_stone',
        soundType: 'stone',
        hardness: 1.5,
        dropItem: BlockType.COBBLESTONE,
        colors: { top: '#7b7b7b', side: '#7b7b7b', bottom: '#7b7b7b' },
      },
      ['stone', 'stone', 'stone', 'stone', 'stone', 'stone']
    );

    // 4. Cobblestone
    defineBlock(
      {
        id: BlockType.COBBLESTONE,
        nameKey: 'block_cobblestone',
        soundType: 'stone',
        hardness: 1.8,
        dropItem: BlockType.COBBLESTONE,
        colors: { top: '#5a5a5a', side: '#5a5a5a', bottom: '#5a5a5a' },
      },
      ['cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone', 'cobblestone']
    );

    // 5. Sand
    defineBlock(
      {
        id: BlockType.SAND,
        nameKey: 'block_sand',
        soundType: 'sand',
        hardness: 0.5,
        dropItem: BlockType.SAND,
        colors: { top: '#d6bf80', side: '#d6bf80', bottom: '#d6bf80' },
      },
      ['sand', 'sand', 'sand', 'sand', 'sand', 'sand']
    );

    // 6. Oak Wood
    defineBlock(
      {
        id: BlockType.OAK_WOOD,
        nameKey: 'block_wood',
        soundType: 'wood',
        hardness: 1.2,
        dropItem: BlockType.OAK_WOOD,
        colors: { top: '#9a7346', side: '#6d5032', bottom: '#9a7346' },
      },
      ['wood_side', 'wood_side', 'wood_top', 'wood_top', 'wood_side', 'wood_side']
    );

    // 7. Oak Leaves
    defineBlock(
      {
        id: BlockType.OAK_LEAVES,
        nameKey: 'block_leaves',
        soundType: 'grass',
        isTransparent: true,
        hardness: 0.3,
        dropItem: BlockType.OAK_LEAVES,
        colors: { top: '#38732a', side: '#38732a', bottom: '#38732a' },
      },
      ['leaves', 'leaves', 'leaves', 'leaves', 'leaves', 'leaves']
    );

    // 8. Glass
    defineBlock(
      {
        id: BlockType.GLASS,
        nameKey: 'block_glass',
        soundType: 'glass',
        isTransparent: true,
        hardness: 0.4,
        dropItem: BlockType.GLASS,
        colors: { top: '#bce4f5', side: '#bce4f5', bottom: '#bce4f5' },
      },
      ['glass', 'glass', 'glass', 'glass', 'glass', 'glass']
    );

    // 9. Water
    defineBlock(
      {
        id: BlockType.WATER,
        nameKey: 'block_water',
        soundType: 'water',
        isLiquid: true,
        isTransparent: true,
        hardness: 999, // indestructible by breaking
        dropItem: BlockType.AIR,
        colors: { top: '#3b82f6', side: '#3b82f6', bottom: '#3b82f6' },
      },
      ['water', 'water', 'water', 'water', 'water', 'water']
    );

    // 10. Coal Ore
    defineBlock(
      {
        id: BlockType.COAL_ORE,
        nameKey: 'block_coal_ore',
        soundType: 'stone',
        hardness: 2.0,
        dropItem: BlockType.COAL_ORE,
        colors: { top: '#444444', side: '#444444', bottom: '#444444' },
      },
      ['coal_ore', 'coal_ore', 'coal_ore', 'coal_ore', 'coal_ore', 'coal_ore']
    );

    // 11. Iron Ore
    defineBlock(
      {
        id: BlockType.IRON_ORE,
        nameKey: 'block_iron_ore',
        soundType: 'stone',
        hardness: 2.5,
        dropItem: BlockType.IRON_ORE,
        colors: { top: '#c49a7a', side: '#c49a7a', bottom: '#c49a7a' },
      },
      ['iron_ore', 'iron_ore', 'iron_ore', 'iron_ore', 'iron_ore', 'iron_ore']
    );

    // 12. Gold Ore
    defineBlock(
      {
        id: BlockType.GOLD_ORE,
        nameKey: 'block_gold_ore',
        soundType: 'stone',
        hardness: 3.0,
        dropItem: BlockType.GOLD_ORE,
        colors: { top: '#ecc736', side: '#ecc736', bottom: '#ecc736' },
      },
      ['gold_ore', 'gold_ore', 'gold_ore', 'gold_ore', 'gold_ore', 'gold_ore']
    );

    // 13. Diamond Ore
    defineBlock(
      {
        id: BlockType.DIAMOND_ORE,
        nameKey: 'block_diamond_ore',
        soundType: 'stone',
        hardness: 4.0,
        dropItem: BlockType.DIAMOND_ORE,
        colors: { top: '#4bedee', side: '#4bedee', bottom: '#4bedee' },
      },
      ['diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore', 'diamond_ore']
    );

    // 14. Bricks
    defineBlock(
      {
        id: BlockType.BRICKS,
        nameKey: 'block_bricks',
        soundType: 'stone',
        hardness: 2.0,
        dropItem: BlockType.BRICKS,
        colors: { top: '#a54432', side: '#a54432', bottom: '#a54432' },
      },
      ['bricks', 'bricks', 'bricks', 'bricks', 'bricks', 'bricks']
    );

    // 15. Snow
    defineBlock(
      {
        id: BlockType.SNOW,
        nameKey: 'block_snow',
        soundType: 'grass',
        hardness: 0.3,
        dropItem: BlockType.SNOW,
        colors: { top: '#e8f0f8', side: '#e8f0f8', bottom: '#e8f0f8' },
      },
      ['snow', 'snow', 'snow', 'dirt', 'snow', 'snow']
    );

    // 16. Bedrock
    defineBlock(
      {
        id: BlockType.BEDROCK,
        nameKey: 'block_bedrock',
        soundType: 'stone',
        hardness: 999999, // indestructible in survival
        dropItem: BlockType.BEDROCK,
        colors: { top: '#222222', side: '#222222', bottom: '#222222' },
      },
      ['bedrock', 'bedrock', 'bedrock', 'bedrock', 'bedrock', 'bedrock']
    );

    // 17. Planks
    defineBlock(
      {
        id: BlockType.PLANKS,
        nameKey: 'block_planks',
        soundType: 'wood',
        hardness: 1.0,
        dropItem: BlockType.PLANKS,
        colors: { top: '#b8834c', side: '#b8834c', bottom: '#b8834c' },
      },
      ['planks', 'planks', 'planks', 'planks', 'planks', 'planks']
    );

    // 18. Bookshelf
    defineBlock(
      {
        id: BlockType.BOOKSHELF,
        nameKey: 'block_bookshelf',
        soundType: 'wood',
        hardness: 1.2,
        dropItem: BlockType.BOOKSHELF,
        colors: { top: '#b8834c', side: '#875629', bottom: '#b8834c' },
      },
      ['bookshelf', 'bookshelf', 'planks', 'planks', 'bookshelf', 'bookshelf']
    );

    // 19. Torch
    defineBlock(
      {
        id: BlockType.TORCH,
        nameKey: 'block_torch',
        soundType: 'wood',
        isTransparent: true,
        lightEmission: 14,
        hardness: 0.1,
        dropItem: BlockType.TORCH,
        colors: { top: '#f59e0b', side: '#f59e0b', bottom: '#8b5a2b' },
      },
      ['torch', 'torch', 'torch', 'torch', 'torch', 'torch']
    );
  }

  public getMaterials(blockType: BlockType): THREE.Material[] {
    return this.materialCache.get(blockType) || this.materialCache.get(BlockType.STONE)!;
  }

  public getConfig(blockType: BlockType): BlockConfig | undefined {
    return this.configs.get(blockType);
  }

  public isSolid(blockType: BlockType): boolean {
    if (blockType === BlockType.AIR || blockType === BlockType.WATER) return false;
    return true;
  }

  public isTransparent(blockType: BlockType): boolean {
    if (blockType === BlockType.AIR || blockType === BlockType.WATER || blockType === BlockType.GLASS || blockType === BlockType.OAK_LEAVES || blockType === BlockType.TORCH) {
      return true;
    }
    return false;
  }
}
