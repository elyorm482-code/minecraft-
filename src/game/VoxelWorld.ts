import * as THREE from 'three';
import { BlockType } from '../types/game';
import { PerlinNoise } from '../utils/noise';
import { TextureAtlasManager } from './TextureAtlas';
import { BlockRegistry } from './BlockRegistry';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Z = 16;
export const CHUNK_SIZE_Y = 48;
export const SEA_LEVEL = 13;

export class Chunk {
  public cx: number;
  public cz: number;
  public blocks: Uint8Array;
  public solidMesh: THREE.Mesh | null = null;
  public transMesh: THREE.Mesh | null = null;
  public isDirty = false;
  public isGenerated = false;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
  }

  public getIndex(x: number, y: number, z: number): number {
    return y * (CHUNK_SIZE_X * CHUNK_SIZE_Z) + z * CHUNK_SIZE_X + x;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  public setBlock(x: number, y: number, z: number, type: BlockType) {
    if (x < 0 || x >= CHUNK_SIZE_X || y < 0 || y >= CHUNK_SIZE_Y || z < 0 || z >= CHUNK_SIZE_Z) {
      return;
    }
    this.blocks[this.getIndex(x, y, z)] = type;
    this.isDirty = true;
  }
}

export class VoxelWorld {
  public chunks: Map<string, Chunk> = new Map();
  public scene: THREE.Scene;
  public noise: PerlinNoise;
  public seed: number;
  public modifiedBlocks: Record<string, BlockType> = {};
  private atlas: TextureAtlasManager;
  private registry: BlockRegistry;
  public chunkGroup: THREE.Group;

  constructor(scene: THREE.Scene, seed = 1337) {
    this.scene = scene;
    this.seed = seed;
    this.noise = new PerlinNoise(seed);
    this.atlas = TextureAtlasManager.getInstance();
    this.registry = BlockRegistry.getInstance();
    this.chunkGroup = new THREE.Group();
    this.scene.add(this.chunkGroup);
  }

  public chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  public getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.chunkKey(cx, cz));
  }

  public getOrCreateChunk(cx: number, cz: number): Chunk {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this.generateChunkTerrain(chunk);
    }
    return chunk;
  }

  // Get block at global world coordinates
  public getBlock(wx: number, wy: number, wz: number): BlockType {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return BlockType.AIR;

    const modKey = `${wx},${wy},${wz}`;
    if (this.modifiedBlocks[modKey] !== undefined) {
      return this.modifiedBlocks[modKey];
    }

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) return BlockType.AIR;

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    return chunk.getBlock(lx, wy, lz);
  }

  // Set block at global world coordinates
  public setBlock(wx: number, wy: number, wz: number, type: BlockType): boolean {
    if (wy < 0 || wy >= CHUNK_SIZE_Y) return false;

    this.modifiedBlocks[`${wx},${wy},${wz}`] = type;

    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const chunk = this.getOrCreateChunk(cx, cz);

    const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
    chunk.setBlock(lx, wy, lz, type);

    this.buildChunkMesh(chunk);

    // Rebuild adjacent chunks if placed/broken on border
    if (lx === 0) {
      const neighbor = this.getChunk(cx - 1, cz);
      if (neighbor) this.buildChunkMesh(neighbor);
    } else if (lx === CHUNK_SIZE_X - 1) {
      const neighbor = this.getChunk(cx + 1, cz);
      if (neighbor) this.buildChunkMesh(neighbor);
    }
    if (lz === 0) {
      const neighbor = this.getChunk(cx, cz - 1);
      if (neighbor) this.buildChunkMesh(neighbor);
    } else if (lz === CHUNK_SIZE_Z - 1) {
      const neighbor = this.getChunk(cx, cz + 1);
      if (neighbor) this.buildChunkMesh(neighbor);
    }

    return true;
  }

  // Find ground height at x, z for spawning player or animals
  public getGroundHeight(wx: number, wz: number): number {
    for (let y = CHUNK_SIZE_Y - 1; y >= 0; y--) {
      const b = this.getBlock(wx, y, wz);
      if (b !== BlockType.AIR && b !== BlockType.WATER) {
        return y + 1;
      }
    }
    return SEA_LEVEL + 2;
  }

  // Procedural terrain generation for a chunk
  public generateChunkTerrain(chunk: Chunk) {
    if (chunk.isGenerated) return;
    chunk.isGenerated = true;

    const treesToPlant: [number, number, number][] = [];

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wx = chunk.cx * CHUNK_SIZE_X + lx;
        const wz = chunk.cz * CHUNK_SIZE_Z + lz;

        // Bedrock floor
        chunk.setBlock(lx, 0, lz, BlockType.BEDROCK);

        // Continental & mountain elevation
        const baseNoise = this.noise.fractal2D(wx * 0.015, wz * 0.015, 3, 0.5, 2.0);
        const detailNoise = this.noise.fractal2D(wx * 0.06, wz * 0.06, 2, 0.4, 2.0);
        const mountainNoise = Math.max(0, this.noise.fractal2D(wx * 0.008 + 100, wz * 0.008 + 100, 3, 0.55, 2.0) - 0.25);

        // Height calculation (clamped between 3 and 44)
        let height = Math.floor(14 + baseNoise * 10 + detailNoise * 3 + mountainNoise * 20);
        height = Math.max(3, Math.min(CHUNK_SIZE_Y - 4, height));

        const isWaterBody = height < SEA_LEVEL;

        for (let y = 1; y < CHUNK_SIZE_Y; y++) {
          const modKey = `${wx},${y},${wz}`;
          if (this.modifiedBlocks[modKey] !== undefined) {
            chunk.setBlock(lx, y, lz, this.modifiedBlocks[modKey]);
            continue;
          }

          if (y <= height) {
            if (y === height) {
              if (y > 27) {
                chunk.setBlock(lx, y, lz, BlockType.SNOW);
              } else if (isWaterBody || y <= SEA_LEVEL + 1) {
                chunk.setBlock(lx, y, lz, BlockType.SAND);
              } else {
                chunk.setBlock(lx, y, lz, BlockType.GRASS);
                // Potential tree spot
                if (lx > 2 && lx < CHUNK_SIZE_X - 3 && lz > 2 && lz < CHUNK_SIZE_Z - 3) {
                  const treeRand = Math.sin(wx * 19.3 + wz * 43.7 + this.seed);
                  if (treeRand > 0.88 && y < 25) {
                    treesToPlant.push([lx, y + 1, lz]);
                  }
                }
              }
            } else if (y >= height - 3) {
              chunk.setBlock(lx, y, lz, height <= SEA_LEVEL + 1 ? BlockType.SAND : BlockType.DIRT);
            } else {
              // Stone & Underground Ores
              const oreRand = Math.sin(wx * 37.1 + y * 71.9 + wz * 13.3 + this.seed);
              if (y < 7 && oreRand > 0.94) {
                chunk.setBlock(lx, y, lz, BlockType.DIAMOND_ORE);
              } else if (y < 12 && oreRand > 0.91) {
                chunk.setBlock(lx, y, lz, BlockType.GOLD_ORE);
              } else if (y < 20 && oreRand > 0.86) {
                chunk.setBlock(lx, y, lz, BlockType.IRON_ORE);
              } else if (y < 28 && oreRand > 0.81) {
                chunk.setBlock(lx, y, lz, BlockType.COAL_ORE);
              } else {
                chunk.setBlock(lx, y, lz, BlockType.STONE);
              }
            }
          } else if (y <= SEA_LEVEL) {
            // Fill water in ocean/river basins
            chunk.setBlock(lx, y, lz, BlockType.WATER);
          } else {
            chunk.setBlock(lx, y, lz, BlockType.AIR);
          }
        }
      }
    }

    // Plant trees
    for (const [tx, ty, tz] of treesToPlant) {
      const trunkHeight = 4 + Math.floor(Math.abs(Math.sin(tx * 3 + tz * 7)) * 2);
      // Trunk
      for (let y = 0; y < trunkHeight; y++) {
        if (ty + y < CHUNK_SIZE_Y) {
          chunk.setBlock(tx, ty + y, tz, BlockType.OAK_WOOD);
        }
      }
      // Leaves canopy (spherical voxel cluster)
      const canopyY = ty + trunkHeight - 2;
      for (let ox = -2; ox <= 2; ox++) {
        for (let oz = -2; oz <= 2; oz++) {
          for (let oy = 0; oy <= 2; oy++) {
            if (Math.abs(ox) === 2 && Math.abs(oz) === 2 && oy === 2) continue; // round corners
            const lx = tx + ox;
            const ly = canopyY + oy;
            const lz = tz + oz;
            if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z && ly < CHUNK_SIZE_Y) {
              if (chunk.getBlock(lx, ly, lz) === BlockType.AIR) {
                chunk.setBlock(lx, ly, lz, BlockType.OAK_LEAVES);
              }
            }
          }
        }
      }
    }
  }

  // Generate meshes with face culling for high performance
  public buildChunkMesh(chunk: Chunk) {
    // Solid mesh data
    const sPositions: number[] = [];
    const sNormals: number[] = [];
    const sUvs: number[] = [];
    const sColors: number[] = [];
    const sIndices: number[] = [];

    // Transparent mesh data
    const tPositions: number[] = [];
    const tNormals: number[] = [];
    const tUvs: number[] = [];
    const tColors: number[] = [];
    const tIndices: number[] = [];

    const getBlockAtLocalOrWorld = (lx: number, y: number, lz: number): BlockType => {
      if (lx >= 0 && lx < CHUNK_SIZE_X && lz >= 0 && lz < CHUNK_SIZE_Z) {
        return chunk.getBlock(lx, y, lz);
      }
      const wx = chunk.cx * CHUNK_SIZE_X + lx;
      const wz = chunk.cz * CHUNK_SIZE_Z + lz;
      return this.getBlock(wx, y, wz);
    };

    const addFace = (
      isTransparentFace: boolean,
      tileIndex: number,
      p1: number[],
      p2: number[],
      p3: number[],
      p4: number[],
      normal: number[],
      shadeFactor: number
    ) => {
      const positions = isTransparentFace ? tPositions : sPositions;
      const normals = isTransparentFace ? tNormals : sNormals;
      const uvs = isTransparentFace ? tUvs : sUvs;
      const colors = isTransparentFace ? tColors : sColors;
      const indices = isTransparentFace ? tIndices : sIndices;

      const [u0, v0, u1, v1] = this.atlas.getFaceTileUVs(tileIndex);
      const vOffset = positions.length / 3;

      // 4 Vertices
      positions.push(...p1, ...p2, ...p3, ...p4);
      normals.push(...normal, ...normal, ...normal, ...normal);

      // Shading colors (voxel pseudo-AO)
      for (let i = 0; i < 4; i++) {
        colors.push(shadeFactor, shadeFactor, shadeFactor);
      }

      // UVs
      uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);

      // 2 Triangles
      indices.push(vOffset, vOffset + 1, vOffset + 2, vOffset, vOffset + 2, vOffset + 3);
    };

    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let y = 0; y < CHUNK_SIZE_Y; y++) {
        for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
          const type = chunk.getBlock(lx, y, lz);
          if (type === BlockType.AIR) continue;

          const isTransparent = this.registry.isTransparent(type);
          const tiles = this.atlas.getBlockTileIndices(type);

          const wx = chunk.cx * CHUNK_SIZE_X + lx;
          const wz = chunk.cz * CHUNK_SIZE_Z + lz;

          const x0 = wx;
          const x1 = wx + 1;
          const y0 = y;
          const y1 = y + 1;
          const z0 = wz;
          const z1 = wz + 1;

          // +Y face (Top)
          const topNeighbor = getBlockAtLocalOrWorld(lx, y + 1, lz);
          if (this.shouldRenderFace(type, topNeighbor)) {
            addFace(
              isTransparent,
              tiles.py,
              [x0, y1, z1],
              [x1, y1, z1],
              [x1, y1, z0],
              [x0, y1, z0],
              [0, 1, 0],
              1.0 // Brightest top
            );
          }

          // -Y face (Bottom)
          const bottomNeighbor = getBlockAtLocalOrWorld(lx, y - 1, lz);
          if (this.shouldRenderFace(type, bottomNeighbor)) {
            addFace(
              isTransparent,
              tiles.ny,
              [x0, y0, z0],
              [x1, y0, z0],
              [x1, y0, z1],
              [x0, y0, z1],
              [0, -1, 0],
              0.55 // Dark underside
            );
          }

          // +X face (Right)
          const rightNeighbor = getBlockAtLocalOrWorld(lx + 1, y, lz);
          if (this.shouldRenderFace(type, rightNeighbor)) {
            addFace(
              isTransparent,
              tiles.px,
              [x1, y0, z1],
              [x1, y0, z0],
              [x1, y1, z0],
              [x1, y1, z1],
              [1, 0, 0],
              0.75
            );
          }

          // -X face (Left)
          const leftNeighbor = getBlockAtLocalOrWorld(lx - 1, y, lz);
          if (this.shouldRenderFace(type, leftNeighbor)) {
            addFace(
              isTransparent,
              tiles.nx,
              [x0, y0, z0],
              [x0, y0, z1],
              [x0, y1, z1],
              [x0, y1, z0],
              [-1, 0, 0],
              0.75
            );
          }

          // +Z face (Front)
          const frontNeighbor = getBlockAtLocalOrWorld(lx, y, lz + 1);
          if (this.shouldRenderFace(type, frontNeighbor)) {
            addFace(
              isTransparent,
              tiles.pz,
              [x0, y0, z1],
              [x1, y0, z1],
              [x1, y1, z1],
              [x0, y1, z1],
              [0, 0, 1],
              0.85
            );
          }

          // -Z face (Back)
          const backNeighbor = getBlockAtLocalOrWorld(lx, y, lz - 1);
          if (this.shouldRenderFace(type, backNeighbor)) {
            addFace(
              isTransparent,
              tiles.nz,
              [x1, y0, z0],
              [x0, y0, z0],
              [x0, y1, z0],
              [x1, y1, z0],
              [0, 0, -1],
              0.85
            );
          }
        }
      }
    }

    // Build or update Solid Mesh
    if (chunk.solidMesh) {
      this.chunkGroup.remove(chunk.solidMesh);
      chunk.solidMesh.geometry.dispose();
      chunk.solidMesh = null;
    }
    if (sPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(sPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(sNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(sUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(sColors, 3));
      geo.setIndex(sIndices);
      geo.computeBoundingSphere();

      const mat = this.atlas.solidMaterial.clone();
      mat.vertexColors = true;
      chunk.solidMesh = new THREE.Mesh(geo, mat);
      chunk.solidMesh.receiveShadow = true;
      chunk.solidMesh.castShadow = true;
      this.chunkGroup.add(chunk.solidMesh);
    }

    // Build or update Transparent Mesh
    if (chunk.transMesh) {
      this.chunkGroup.remove(chunk.transMesh);
      chunk.transMesh.geometry.dispose();
      chunk.transMesh = null;
    }
    if (tPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(tPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(tNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(tUvs, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(tColors, 3));
      geo.setIndex(tIndices);
      geo.computeBoundingSphere();

      const mat = this.atlas.transparentMaterial.clone();
      mat.vertexColors = true;
      chunk.transMesh = new THREE.Mesh(geo, mat);
      chunk.transMesh.renderOrder = 1;
      this.chunkGroup.add(chunk.transMesh);
    }

    chunk.isDirty = false;
  }

  private shouldRenderFace(selfType: BlockType, neighborType: BlockType): boolean {
    if (neighborType === BlockType.AIR) return true;
    if (selfType === neighborType && (selfType === BlockType.WATER || selfType === BlockType.GLASS)) {
      return false; // Cull matching liquid/glass internals
    }
    if (this.registry.isTransparent(neighborType) && !this.registry.isTransparent(selfType)) {
      return true; // Opaque block against transparent block
    }
    if (selfType === BlockType.WATER && neighborType === BlockType.OAK_LEAVES) {
      return true;
    }
    return this.registry.isTransparent(neighborType);
  }

  // Load chunks around a center coordinate within render distance
  public updateLoadedChunks(centerWx: number, centerWz: number, renderRadius = 3) {
    const centerCx = Math.floor(centerWx / CHUNK_SIZE_X);
    const centerCz = Math.floor(centerWz / CHUNK_SIZE_Z);

    const neededKeys = new Set<string>();

    for (let dx = -renderRadius; dx <= renderRadius; dx++) {
      for (let dz = -renderRadius; dz <= renderRadius; dz++) {
        if (dx * dx + dz * dz > (renderRadius + 0.5) * (renderRadius + 0.5)) continue;
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = this.chunkKey(cx, cz);
        neededKeys.add(key);

        let chunk = this.chunks.get(key);
        if (!chunk) {
          chunk = this.getOrCreateChunk(cx, cz);
          this.buildChunkMesh(chunk);
        } else if (chunk.isDirty || !chunk.solidMesh) {
          this.buildChunkMesh(chunk);
        }
      }
    }

    // Unload chunks far away to free memory
    for (const [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        if (chunk.solidMesh) {
          this.chunkGroup.remove(chunk.solidMesh);
          chunk.solidMesh.geometry.dispose();
          chunk.solidMesh = null;
        }
        if (chunk.transMesh) {
          this.chunkGroup.remove(chunk.transMesh);
          chunk.transMesh.geometry.dispose();
          chunk.transMesh = null;
        }
        this.chunks.delete(key);
      }
    }
  }

  public dispose() {
    for (const chunk of this.chunks.values()) {
      if (chunk.solidMesh) {
        chunk.solidMesh.geometry.dispose();
      }
      if (chunk.transMesh) {
        chunk.transMesh.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.scene.remove(this.chunkGroup);
  }
}
