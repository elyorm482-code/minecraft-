import * as THREE from 'three';
import { BlockType } from '../types/game';

// Helper to create 16x16 pixel textures dynamically using Canvas
function createCanvas(size = 16): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function createTextureFromCanvas(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Deterministic noise for consistent textures
function pseudoRandom(x: number, y: number, seed = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// Generate procedural textures for all block faces
export function generateBlockTextures(): Record<string, THREE.CanvasTexture> {
  const textures: Record<string, THREE.CanvasTexture> = {};

  // 1. Dirt
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 101);
        const shade = Math.floor(70 + r * 30);
        ctx.fillStyle = `rgb(${shade + 20}, ${shade}, ${Math.floor(shade * 0.55)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['dirt'] = createTextureFromCanvas(canvas);
  }

  // 2. Grass Top
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 202);
        const g = Math.floor(130 + r * 50);
        ctx.fillStyle = `rgb(${Math.floor(g * 0.45)}, ${g}, ${Math.floor(g * 0.25)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['grass_top'] = createTextureFromCanvas(canvas);
  }

  // 3. Grass Side (Dirt with grass fringe on top 3-5 pixels)
  {
    const { canvas, ctx } = createCanvas();
    // Fill dirt
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 101);
        const shade = Math.floor(70 + r * 30);
        ctx.fillStyle = `rgb(${shade + 20}, ${shade}, ${Math.floor(shade * 0.55)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Grass fringe
    for (let x = 0; x < 16; x++) {
      const fringeDepth = 3 + Math.floor(pseudoRandom(x, 1, 303) * 3);
      for (let y = 0; y < fringeDepth; y++) {
        const r = pseudoRandom(x, y, 202);
        const g = Math.floor(130 + r * 50);
        ctx.fillStyle = `rgb(${Math.floor(g * 0.45)}, ${g}, ${Math.floor(g * 0.25)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['grass_side'] = createTextureFromCanvas(canvas);
  }

  // 4. Stone
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 404);
        const val = Math.floor(115 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['stone'] = createTextureFromCanvas(canvas);
  }

  // 5. Cobblestone
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 505);
        const isBorder = (x % 4 === 0) || (y % 4 === 0 && (x + y) % 2 === 0);
        const val = isBorder ? Math.floor(60 + r * 25) : Math.floor(110 + r * 55);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['cobblestone'] = createTextureFromCanvas(canvas);
  }

  // 6. Sand
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 606);
        const rVal = Math.floor(215 + r * 25);
        const gVal = Math.floor(195 + r * 20);
        const bVal = Math.floor(140 + r * 20);
        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['sand'] = createTextureFromCanvas(canvas);
  }

  // 7. Oak Wood Side (Bark)
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const stripe = Math.sin(x * 0.8) * 15;
        const r = pseudoRandom(x, y, 707);
        const b = Math.floor(85 + stripe + r * 25);
        ctx.fillStyle = `rgb(${b + 30}, ${b}, ${Math.floor(b * 0.45)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['wood_side'] = createTextureFromCanvas(canvas);
  }

  // 8. Oak Wood Top (Rings)
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const dist = Math.sqrt((x - 7.5) ** 2 + (y - 7.5) ** 2);
        const ring = Math.floor(dist * 1.5) % 2;
        const r = pseudoRandom(x, y, 808);
        const b = ring === 0 ? Math.floor(150 + r * 20) : Math.floor(120 + r * 20);
        ctx.fillStyle = `rgb(${b + 25}, ${b}, ${Math.floor(b * 0.5)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['wood_top'] = createTextureFromCanvas(canvas);
  }

  // 9. Oak Leaves
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 909);
        const g = Math.floor(100 + r * 80);
        ctx.fillStyle = `rgba(${Math.floor(g * 0.3)}, ${g}, ${Math.floor(g * 0.2)}, 0.95)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['leaves'] = createTextureFromCanvas(canvas);
  }

  // 10. Glass
  {
    const { canvas, ctx } = createCanvas();
    ctx.clearRect(0, 0, 16, 16);
    // Translucent glass with crisp borders and specular sheen
    ctx.fillStyle = 'rgba(215, 240, 255, 0.25)';
    ctx.fillRect(0, 0, 16, 16);
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeRect(0.5, 0.5, 15, 15);
    // Glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(3, 3, 2, 2);
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(11, 11, 2, 2);
    textures['glass'] = createTextureFromCanvas(canvas);
  }

  // 11. Water
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 111);
        const b = Math.floor(210 + r * 45);
        ctx.fillStyle = `rgba(35, ${Math.floor(b * 0.6)}, ${b}, 0.75)`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['water'] = createTextureFromCanvas(canvas);
  }

  // 12. Coal Ore
  {
    const { canvas, ctx } = createCanvas();
    // stone base
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 404);
        const val = Math.floor(115 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // coal spots
    ctx.fillStyle = '#222222';
    [[3,3],[4,3],[3,4],[9,8],[10,8],[10,9],[5,11],[6,11],[12,4],[13,4]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 1);
    });
    textures['coal_ore'] = createTextureFromCanvas(canvas);
  }

  // 13. Iron Ore
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 404);
        const val = Math.floor(115 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = '#d8af92';
    [[4,4],[5,4],[4,5],[10,6],[11,6],[11,7],[7,12],[8,12],[12,11],[13,11]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 1);
    });
    textures['iron_ore'] = createTextureFromCanvas(canvas);
  }

  // 14. Gold Ore
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 404);
        const val = Math.floor(115 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = '#fce23a';
    [[4,4],[5,4],[10,6],[11,6],[7,12],[8,12],[12,11]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 1);
    });
    textures['gold_ore'] = createTextureFromCanvas(canvas);
  }

  // 15. Diamond Ore
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 404);
        const val = Math.floor(115 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.fillStyle = '#4dedf4';
    [[3,4],[4,4],[4,5],[10,5],[11,5],[6,11],[7,11],[7,12],[12,10],[13,10]].forEach(([x, y]) => {
      ctx.fillRect(x, y, 1, 1);
    });
    textures['diamond_ore'] = createTextureFromCanvas(canvas);
  }

  // 16. Bricks
  {
    const { canvas, ctx } = createCanvas();
    ctx.fillStyle = '#b3513a';
    ctx.fillRect(0, 0, 16, 16);
    // mortar lines
    ctx.fillStyle = '#d4c5b9';
    for (let y = 0; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
    }
    ctx.fillRect(4, 0, 1, 4);
    ctx.fillRect(12, 0, 1, 4);
    ctx.fillRect(8, 4, 1, 4);
    ctx.fillRect(0, 4, 1, 4);
    ctx.fillRect(4, 8, 1, 4);
    ctx.fillRect(12, 8, 1, 4);
    ctx.fillRect(8, 12, 1, 4);
    ctx.fillRect(0, 12, 1, 4);
    textures['bricks'] = createTextureFromCanvas(canvas);
  }

  // 17. Snow
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 717);
        const val = Math.floor(235 + r * 20);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val + 5})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['snow'] = createTextureFromCanvas(canvas);
  }

  // 18. Bedrock
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const r = pseudoRandom(x, y, 818);
        const val = Math.floor(25 + r * 45);
        ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    textures['bedrock'] = createTextureFromCanvas(canvas);
  }

  // 19. Planks
  {
    const { canvas, ctx } = createCanvas();
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        const plankIdx = Math.floor(y / 4);
        const r = pseudoRandom(x, y, 919 + plankIdx);
        const b = Math.floor(140 + r * 30);
        ctx.fillStyle = `rgb(${b + 35}, ${b}, ${Math.floor(b * 0.45)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    // Horizontal divider lines
    ctx.fillStyle = '#653e1a';
    for (let y = 3; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
    }
    textures['planks'] = createTextureFromCanvas(canvas);
  }

  // 20. Bookshelf
  {
    const { canvas, ctx } = createCanvas();
    ctx.fillStyle = '#9e6a38';
    ctx.fillRect(0, 0, 16, 16);
    // Books rows
    const bookColors = ['#9e2a2b', '#335c67', '#e09f3e', '#540b0e', '#3f88c5'];
    for (let row = 0; row < 2; row++) {
      const startY = row === 0 ? 2 : 9;
      ctx.fillStyle = '#3a2012';
      ctx.fillRect(1, startY, 14, 5);
      for (let x = 2; x < 14; x += 2) {
        ctx.fillStyle = bookColors[(x + row) % bookColors.length];
        ctx.fillRect(x, startY, 2, 5);
      }
    }
    textures['bookshelf'] = createTextureFromCanvas(canvas);
  }

  // 21. Torch
  {
    const { canvas, ctx } = createCanvas();
    ctx.clearRect(0, 0, 16, 16);
    // Stick
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(7, 6, 2, 9);
    // Coal tip
    ctx.fillStyle = '#333333';
    ctx.fillRect(7, 4, 2, 2);
    // Fire
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(6, 2, 4, 3);
    ctx.fillStyle = '#ffff66';
    ctx.fillRect(7, 2, 2, 2);
    textures['torch'] = createTextureFromCanvas(canvas);
  }

  return textures;
}

// Convert a block type to a representative CSS preview color or gradient
export function getBlockPreviewColor(blockType: BlockType): string {
  switch (blockType) {
    case BlockType.GRASS: return '#567d46';
    case BlockType.DIRT: return '#866043';
    case BlockType.STONE: return '#7b7b7b';
    case BlockType.COBBLESTONE: return '#5a5a5a';
    case BlockType.SAND: return '#d6bf80';
    case BlockType.OAK_WOOD: return '#6d5032';
    case BlockType.OAK_LEAVES: return '#38732a';
    case BlockType.GLASS: return '#bce4f5';
    case BlockType.WATER: return '#3b82f6';
    case BlockType.COAL_ORE: return '#444444';
    case BlockType.IRON_ORE: return '#c49a7a';
    case BlockType.GOLD_ORE: return '#ecc736';
    case BlockType.DIAMOND_ORE: return '#4bedee';
    case BlockType.BRICKS: return '#a54432';
    case BlockType.SNOW: return '#e8f0f8';
    case BlockType.BEDROCK: return '#222222';
    case BlockType.PLANKS: return '#b8834c';
    case BlockType.BOOKSHELF: return '#875629';
    case BlockType.TORCH: return '#f59e0b';
    default: return '#cccccc';
  }
}
