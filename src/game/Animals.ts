import * as THREE from 'three';
import { VoxelWorld } from './VoxelWorld';

export interface AnimalInstance {
  id: string;
  type: 'cow' | 'sheep' | 'chicken';
  group: THREE.Group;
  legs: THREE.Mesh[];
  wings?: THREE.Mesh[];
  head: THREE.Group;
  x: number;
  y: number;
  z: number;
  yaw: number;
  targetYaw: number;
  walkTimer: number;
  isWalking: boolean;
  walkCycle: number;
  speed: number;
}

export class AnimalManager {
  public animals: AnimalInstance[] = [];
  public group: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  // Create a 6-part procedural Cow
  private createCowMesh(): { group: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group } {
    const root = new THREE.Group();
    const legs: THREE.Mesh[] = [];

    // Materials
    const cowWhiteMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const cowSpotMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const pinkMat = new THREE.MeshLambertMaterial({ color: 0xf5a3b7 });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xd9c5b2 });

    // 1. Main Body
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.8, 1.3);
    const bodyMesh = new THREE.Mesh(bodyGeo, cowSpotMat);
    bodyMesh.position.set(0, 0.9, 0);
    bodyMesh.castShadow = true;
    root.add(bodyMesh);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0.7);

    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.55);
    const headMesh = new THREE.Mesh(headGeo, cowWhiteMat);
    headGroup.add(headMesh);

    // Snout
    const snoutGeo = new THREE.BoxGeometry(0.35, 0.25, 0.25);
    const snoutMesh = new THREE.Mesh(snoutGeo, pinkMat);
    snoutMesh.position.set(0, -0.12, 0.35);
    headGroup.add(snoutMesh);

    // Horns
    const hornGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
    const hornL = new THREE.Mesh(hornGeo, hornMat);
    hornL.position.set(-0.25, 0.3, -0.05);
    const hornR = new THREE.Mesh(hornGeo, hornMat);
    hornR.position.set(0.25, 0.3, -0.05);
    headGroup.add(hornL, hornR);

    root.add(headGroup);

    // 3. 4 Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const legOffsets = [
      [-0.32, 0.32, 0.45],  // front left
      [0.32, 0.32, 0.45],   // front right
      [-0.32, 0.32, -0.45], // back left
      [0.32, 0.32, -0.45],  // back right
    ];

    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, cowWhiteMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      legs.push(leg);
      root.add(leg);
    }

    return { group: root, legs, head: headGroup };
  }

  // Create a 5-part procedural Sheep
  private createSheepMesh(): { group: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group } {
    const root = new THREE.Group();
    const legs: THREE.Mesh[] = [];

    const woolMat = new THREE.MeshLambertMaterial({ color: 0xf0ede6 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // 1. Wool Body
    const bodyGeo = new THREE.BoxGeometry(0.85, 0.75, 1.15);
    const bodyMesh = new THREE.Mesh(bodyGeo, woolMat);
    bodyMesh.position.set(0, 0.85, 0);
    bodyMesh.castShadow = true;
    root.add(bodyMesh);

    // 2. Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0.65);

    const headGeo = new THREE.BoxGeometry(0.42, 0.42, 0.48);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Wool Cap
    const capGeo = new THREE.BoxGeometry(0.44, 0.2, 0.35);
    const capMesh = new THREE.Mesh(capGeo, woolMat);
    capMesh.position.set(0, 0.2, -0.05);
    headGroup.add(capMesh);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 0.05, 0.24);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 0.05, 0.24);
    headGroup.add(eyeL, eyeR);

    root.add(headGroup);

    // 3. 4 Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const legOffsets = [
      [-0.28, 0.3, 0.38],
      [0.28, 0.3, 0.38],
      [-0.28, 0.3, -0.38],
      [0.28, 0.3, -0.38],
    ];

    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      legs.push(leg);
      root.add(leg);
    }

    return { group: root, legs, head: headGroup };
  }

  // Create a 5-part procedural Chicken
  private createChickenMesh(): { group: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group; wings: THREE.Mesh[] } {
    const root = new THREE.Group();
    const legs: THREE.Mesh[] = [];
    const wings: THREE.Mesh[] = [];

    const featherMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const beakMat = new THREE.MeshLambertMaterial({ color: 0xffa500 });
    const wattleMat = new THREE.MeshLambertMaterial({ color: 0xd90429 });
    const legMat = new THREE.MeshLambertMaterial({ color: 0xf4a261 });

    // 1. Body
    const bodyGeo = new THREE.BoxGeometry(0.45, 0.45, 0.55);
    const bodyMesh = new THREE.Mesh(bodyGeo, featherMat);
    bodyMesh.position.set(0, 0.45, 0);
    bodyMesh.castShadow = true;
    root.add(bodyMesh);

    // 2. Wings
    const wingGeo = new THREE.BoxGeometry(0.08, 0.35, 0.45);
    const wingL = new THREE.Mesh(wingGeo, featherMat);
    wingL.position.set(-0.25, 0.45, 0);
    const wingR = new THREE.Mesh(wingGeo, featherMat);
    wingR.position.set(0.25, 0.45, 0);
    wings.push(wingL, wingR);
    root.add(wingL, wingR);

    // 3. Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0.28);

    const headGeo = new THREE.BoxGeometry(0.26, 0.32, 0.26);
    const headMesh = new THREE.Mesh(headGeo, featherMat);
    headGroup.add(headMesh);

    // Beak
    const beakGeo = new THREE.BoxGeometry(0.12, 0.1, 0.15);
    const beakMesh = new THREE.Mesh(beakGeo, beakMat);
    beakMesh.position.set(0, -0.02, 0.18);
    headGroup.add(beakMesh);

    // Red Wattle
    const wattleGeo = new THREE.BoxGeometry(0.08, 0.12, 0.08);
    const wattleMesh = new THREE.Mesh(wattleGeo, wattleMat);
    wattleMesh.position.set(0, -0.12, 0.12);
    headGroup.add(wattleMesh);

    root.add(headGroup);

    // 4. 2 Legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.12, 0.15, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.12, 0.15, 0);
    legs.push(legL, legR);
    root.add(legL, legR);

    return { group: root, legs, head: headGroup, wings };
  }

  public spawnAnimal(type: 'cow' | 'sheep' | 'chicken', x: number, z: number, world: VoxelWorld) {
    const y = world.getGroundHeight(Math.floor(x), Math.floor(z));

    let created: { group: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group; wings?: THREE.Mesh[] };
    let speed = 1.2;

    if (type === 'cow') {
      created = this.createCowMesh();
      speed = 1.0;
    } else if (type === 'sheep') {
      created = this.createSheepMesh();
      speed = 1.1;
    } else {
      created = this.createChickenMesh();
      speed = 1.5;
    }

    created.group.position.set(x, y, z);
    this.group.add(created.group);

    this.animals.push({
      id: Math.random().toString(36).substring(2, 9),
      type,
      group: created.group,
      legs: created.legs,
      wings: created.wings,
      head: created.head,
      x,
      y,
      z,
      yaw: Math.random() * Math.PI * 2,
      targetYaw: Math.random() * Math.PI * 2,
      walkTimer: 2 + Math.random() * 3,
      isWalking: Math.random() > 0.4,
      walkCycle: 0,
      speed,
    });
  }

  public spawnInitialAnimals(world: VoxelWorld, count = 8) {
    const types: ('cow' | 'sheep' | 'chicken')[] = ['cow', 'cow', 'sheep', 'sheep', 'chicken', 'chicken'];
    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const rx = (Math.random() - 0.5) * 36 + 8;
      const rz = (Math.random() - 0.5) * 36 + 8;
      this.spawnAnimal(type, rx, rz, world);
    }
  }

  public update(delta: number, world: VoxelWorld) {
    const dt = Math.min(delta, 0.05);

    for (const animal of this.animals) {
      animal.walkTimer -= dt;
      if (animal.walkTimer <= 0) {
        // Toggle walking or idling
        animal.isWalking = Math.random() > 0.45;
        animal.walkTimer = 2.5 + Math.random() * 4;
        animal.targetYaw = animal.yaw + (Math.random() - 0.5) * Math.PI * 1.5;
      }

      // Smooth yaw rotation
      const yawDiff = animal.targetYaw - animal.yaw;
      animal.yaw += yawDiff * Math.min(1, 3 * dt);
      animal.group.rotation.y = animal.yaw;

      if (animal.isWalking) {
        animal.walkCycle += dt * 8;
        const forwardX = Math.sin(animal.yaw) * animal.speed * dt;
        const forwardZ = Math.cos(animal.yaw) * animal.speed * dt;

        const nextX = animal.x + forwardX;
        const nextZ = animal.z + forwardZ;
        const nextY = world.getGroundHeight(Math.floor(nextX), Math.floor(nextZ));

        // Walk up/down slope if not a cliff (> 1 block height difference)
        if (Math.abs(nextY - animal.y) <= 1.2) {
          animal.x = nextX;
          animal.z = nextZ;
          animal.y += (nextY - animal.y) * Math.min(1, 10 * dt);
          animal.group.position.set(animal.x, animal.y, animal.z);
        } else {
          // Hit a wall or cliff, turn around
          animal.targetYaw += Math.PI * 0.8;
        }

        // Animate legs (alternating swing)
        const swing = Math.sin(animal.walkCycle) * 0.45;
        if (animal.legs.length === 4) {
          animal.legs[0].rotation.x = swing;
          animal.legs[1].rotation.x = -swing;
          animal.legs[2].rotation.x = -swing;
          animal.legs[3].rotation.x = swing;
        } else if (animal.legs.length === 2) {
          animal.legs[0].rotation.x = swing;
          animal.legs[1].rotation.x = -swing;
        }

        // Chicken wing flap
        if (animal.wings) {
          animal.wings[0].rotation.z = Math.sin(animal.walkCycle * 1.5) * 0.35;
          animal.wings[1].rotation.z = -Math.sin(animal.walkCycle * 1.5) * 0.35;
        }
      } else {
        // Return legs to neutral
        for (const leg of animal.legs) {
          leg.rotation.x *= 0.85;
        }
        if (animal.wings) {
          animal.wings[0].rotation.z *= 0.85;
          animal.wings[1].rotation.z *= 0.85;
        }

        // Gentle head bobbing/grazing
        animal.head.rotation.x = Math.sin(Date.now() * 0.002 + (parseInt(animal.id, 36) || 0)) * 0.15;
      }
    }
  }

  public dispose() {
    this.scene.remove(this.group);
    this.animals = [];
  }
}
