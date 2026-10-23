import { BlockType, CraftingRecipe } from '../types/game';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // 1 Oak Wood -> 4 Oak Planks
  {
    id: 'oak_wood_to_planks',
    nameKey: 'block_planks',
    ingredients: [{ type: BlockType.OAK_WOOD, count: 1 }],
    result: { type: BlockType.PLANKS, count: 4 },
  },
  // 1 Coal Ore + 1 Planks -> 4 Torches
  {
    id: 'coal_to_torches',
    nameKey: 'block_torch',
    ingredients: [
      { type: BlockType.COAL_ORE, count: 1 },
      { type: BlockType.PLANKS, count: 1 },
    ],
    result: { type: BlockType.TORCH, count: 4 },
  },
  // 3 Planks -> 1 Bookshelf
  {
    id: 'planks_to_bookshelf',
    nameKey: 'block_bookshelf',
    ingredients: [{ type: BlockType.PLANKS, count: 3 }],
    result: { type: BlockType.BOOKSHELF, count: 1 },
  },
  // 4 Cobblestone -> 4 Bricks
  {
    id: 'cobblestone_to_bricks',
    nameKey: 'block_bricks',
    ingredients: [{ type: BlockType.COBBLESTONE, count: 4 }],
    result: { type: BlockType.BRICKS, count: 4 },
  },
  // 4 Sand -> 4 Glass
  {
    id: 'sand_to_glass',
    nameKey: 'block_glass',
    ingredients: [{ type: BlockType.SAND, count: 2 }],
    result: { type: BlockType.GLASS, count: 2 },
  },
  // 4 Dirt + 4 Stone -> 4 Grass
  {
    id: 'dirt_to_grass',
    nameKey: 'block_grass',
    ingredients: [
      { type: BlockType.DIRT, count: 2 },
      { type: BlockType.OAK_LEAVES, count: 1 },
    ],
    result: { type: BlockType.GRASS, count: 2 },
  },
  // 1 Cobblestone -> 1 Stone (Smelting equivalent)
  {
    id: 'cobblestone_to_stone',
    nameKey: 'block_stone',
    ingredients: [
      { type: BlockType.COBBLESTONE, count: 1 },
      { type: BlockType.COAL_ORE, count: 1 },
    ],
    result: { type: BlockType.STONE, count: 4 },
  },
];
