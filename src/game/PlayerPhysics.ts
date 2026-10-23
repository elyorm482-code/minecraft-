import * as THREE from 'three';
import { BlockType, GameMode } from '../types/game';
import { VoxelWorld } from './VoxelWorld';
import { BlockRegistry } from './BlockRegistry';
import { sound } from '../utils/audio';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
}

export class PlayerPhysics {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public yaw = 0; // horizontal angle radians
  public pitch = 0; // vertical angle radians

  // Dimensions
  public width = 0.6;
  public height = 1.8;
  public eyeHeight = 1.62;

  // State
  public isGrounded = false;
  public isFlying = false;
  public gameMode: GameMode = 'creative';
  public health = 20; // 10 hearts
  public maxHealth = 20;
  public hunger = 20; // 10 drumsticks
  public maxHunger = 20;
  public fallStartHeight = 0;
  public isFalling = false;
  public wasGrounded = false;
  public lastSpacePressTime = 0;

  private registry: BlockRegistry;

  constructor(spawnX = 8, spawnY = 25, spawnZ = 8, gameMode: GameMode = 'creative') {
    this.position = new THREE.Vector3(spawnX, spawnY, spawnZ);
    this.gameMode = gameMode;
    this.isFlying = gameMode === 'creative';
    this.registry = BlockRegistry.getInstance();
  }

  public setGameMode(mode: GameMode) {
    this.gameMode = mode;
    if (mode === 'survival') {
      this.isFlying = false;
    }
  }

  public toggleFlight() {
    if (this.gameMode === 'creative') {
      this.isFlying = !this.isFlying;
      this.velocity.set(0, 0, 0);
    }
  }

  // Check if a block at bx, by, bz collides with the player's bounding box
  public doesBlockCollideWithPlayer(bx: number, by: number, bz: number): boolean {
    const hw = this.width / 2;
    const minX = this.position.x - hw;
    const maxX = this.position.x + hw;
    const minY = this.position.y;
    const maxY = this.position.y + this.height;
    const minZ = this.position.z - hw;
    const maxZ = this.position.z + hw;

    const bMinX = bx;
    const bMaxX = bx + 1;
    const bMinY = by;
    const bMaxY = by + 1;
    const bMinZ = bz;
    const bMaxZ = bz + 1;

    return (
      minX < bMaxX &&
      maxX > bMinX &&
      minY < bMaxY &&
      maxY > bMinY &&
      minZ < bMaxZ &&
      maxZ > bMinZ
    );
  }

  private isVoxelSolid(world: VoxelWorld, x: number, y: number, z: number): boolean {
    const block = world.getBlock(x, y, z);
    return this.registry.isSolid(block);
  }

  public update(
    delta: number,
    input: PlayerInput,
    world: VoxelWorld,
    onDamage?: (amount: number) => void
  ) {
    // Clamp delta for physics stability
    const dt = Math.min(delta, 0.05);

    // Direction vectors from camera yaw
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let moveX = 0;
    let moveZ = 0;
    if (input.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (input.backward) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (input.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    if (input.right) {
      moveX += rightX;
      moveZ += rightZ;
    }

    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0.001) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    const speed = this.isFlying
      ? (input.sprint ? 14 : 9)
      : input.sprint
      ? 6.8
      : 4.3;

    if (this.isFlying) {
      // 3D Flying physics
      this.velocity.x = moveX * speed;
      this.velocity.z = moveZ * speed;

      if (input.jump) {
        this.velocity.y = speed * 0.8;
      } else if (input.crouch) {
        this.velocity.y = -speed * 0.8;
      } else {
        this.velocity.y = 0;
      }

      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.position.z += this.velocity.z * dt;
      return;
    }

    // Survival / Walking Physics with Gravity & Collision
    const accel = this.isGrounded ? 45 : 18;
    const targetVx = moveX * speed;
    const targetVz = moveZ * speed;

    this.velocity.x += (targetVx - this.velocity.x) * Math.min(1, accel * dt);
    this.velocity.z += (targetVz - this.velocity.z) * Math.min(1, accel * dt);

    // Gravity
    this.velocity.y -= 26 * dt;
    if (this.velocity.y < -35) {
      this.velocity.y = -35;
    }

    // Jumping
    if (input.jump && this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
      sound.playJumpSound();
    }

    // Track falling distance for fall damage
    if (!this.isGrounded) {
      if (!this.isFalling) {
        this.isFalling = true;
        this.fallStartHeight = this.position.y;
      }
    }

    // Separate Axis Collision Resolution
    const hw = this.width / 2;

    // 1. Move X
    this.position.x += this.velocity.x * dt;
    this.resolveCollisionX(world, hw);

    // 2. Move Z
    this.position.z += this.velocity.z * dt;
    this.resolveCollisionZ(world, hw);

    // 3. Move Y
    this.position.y += this.velocity.y * dt;
    this.resolveCollisionY(world, hw, onDamage);

    // World bounds safety: respawn if falling into void
    if (this.position.y < -10) {
      this.respawn(world);
    }
  }

  private resolveCollisionX(world: VoxelWorld, hw: number) {
    const minX = Math.floor(this.position.x - hw);
    const maxX = Math.floor(this.position.x + hw);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + this.height);
    const minZ = Math.floor(this.position.z - hw);
    const maxZ = Math.floor(this.position.z + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isVoxelSolid(world, x, y, z)) {
            // Auto step-up for small obstacles (half slab / 1 block if space above head)
            if (this.isGrounded && y === minY && !this.isVoxelSolid(world, x, y + 1, z) && !this.isVoxelSolid(world, Math.floor(this.position.x), y + 2, Math.floor(this.position.z))) {
              this.position.y += 0.2;
              return;
            }

            if (this.velocity.x > 0) {
              this.position.x = x - hw - 0.001;
              this.velocity.x = 0;
            } else if (this.velocity.x < 0) {
              this.position.x = x + 1 + hw + 0.001;
              this.velocity.x = 0;
            }
          }
        }
      }
    }
  }

  private resolveCollisionZ(world: VoxelWorld, hw: number) {
    const minX = Math.floor(this.position.x - hw);
    const maxX = Math.floor(this.position.x + hw);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + this.height);
    const minZ = Math.floor(this.position.z - hw);
    const maxZ = Math.floor(this.position.z + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isVoxelSolid(world, x, y, z)) {
            if (this.isGrounded && y === minY && !this.isVoxelSolid(world, x, y + 1, z) && !this.isVoxelSolid(world, Math.floor(this.position.x), y + 2, Math.floor(this.position.z))) {
              this.position.y += 0.2;
              return;
            }

            if (this.velocity.z > 0) {
              this.position.z = z - hw - 0.001;
              this.velocity.z = 0;
            } else if (this.velocity.z < 0) {
              this.position.z = z + 1 + hw + 0.001;
              this.velocity.z = 0;
            }
          }
        }
      }
    }
  }

  private resolveCollisionY(
    world: VoxelWorld,
    hw: number,
    onDamage?: (amount: number) => void
  ) {
    const minX = Math.floor(this.position.x - hw + 0.05);
    const maxX = Math.floor(this.position.x + hw - 0.05);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + this.height);
    const minZ = Math.floor(this.position.z - hw + 0.05);
    const maxZ = Math.floor(this.position.z + hw - 0.05);

    let landed = false;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.isVoxelSolid(world, x, y, z)) {
            if (this.velocity.y < 0) {
              // Landing on top of block
              this.position.y = y + 1;
              this.velocity.y = 0;
              landed = true;

              // Fall damage calculation
              if (this.isFalling && this.gameMode === 'survival') {
                const fallenDist = this.fallStartHeight - this.position.y;
                if (fallenDist > 4) {
                  const damage = Math.floor((fallenDist - 3) * 1.5);
                  this.takeDamage(damage, onDamage);
                }
              }
              this.isFalling = false;
            } else if (this.velocity.y > 0) {
              // Hitting head on ceiling
              this.position.y = y - this.height - 0.001;
              this.velocity.y = 0;
            }
          }
        }
      }
    }

    this.isGrounded = landed;
  }

  public takeDamage(amount: number, onDamage?: (amount: number) => void) {
    if (this.gameMode === 'creative') return;
    this.health = Math.max(0, this.health - amount);
    if (onDamage) onDamage(amount);
  }

  public respawn(world: VoxelWorld) {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.velocity.set(0, 0, 0);
    const spawnY = world.getGroundHeight(8, 8);
    this.position.set(8, spawnY + 1, 8);
  }
}
