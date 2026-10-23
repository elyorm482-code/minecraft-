import * as THREE from 'three';

export class DayNightSky {
  public scene: THREE.Scene;
  public timeOfDay = 6000; // 0 to 24000 (starts at noon 6000)
  public timeSpeed = 12; // units per second (~20 min full cycle)

  // Lights
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;

  // Celestial Bodies
  public sunGroup: THREE.Group;
  public moonGroup: THREE.Group;
  public sunMesh: THREE.Mesh;
  public moonMesh: THREE.Mesh;

  // Clouds & Stars
  public cloudsGroup: THREE.Group;
  public starsMesh: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Directional Sun/Moon light with shadows
    this.sunLight = new THREE.DirectionalLight(0xfff5ea, 1.1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 140;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // 2. Hemisphere ambient light (sky/ground contrast)
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4d5b41, 0.5);
    this.scene.add(this.hemiLight);

    // 3. Sun Mesh
    this.sunGroup = new THREE.Group();
    const sunGeo = new THREE.BoxGeometry(10, 10, 1);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 0, -110);
    this.sunGroup.add(this.sunMesh);
    this.scene.add(this.sunGroup);

    // 4. Moon Mesh
    this.moonGroup = new THREE.Group();
    const moonGeo = new THREE.BoxGeometry(8, 8, 1);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddedff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(0, 0, 110);
    this.moonGroup.add(this.moonMesh);
    this.scene.add(this.moonGroup);

    // 5. Stars field
    const starsGeo = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    for (let i = 0; i < 400; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 115;
      const sinPhi = Math.sin(phi);
      starPositions.push(r * sinPhi * Math.cos(theta), Math.abs(r * Math.cos(phi)) + 10, r * sinPhi * Math.sin(theta));
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0,
    });
    this.starsMesh = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.starsMesh);

    // 6. Moving Voxel Clouds
    this.cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
    });
    // Create several procedural cloud slabs
    for (let i = 0; i < 18; i++) {
      const cx = (Math.random() - 0.5) * 160;
      const cz = (Math.random() - 0.5) * 160;
      const w = 12 + Math.random() * 16;
      const d = 10 + Math.random() * 14;
      const cloudGeo = new THREE.BoxGeometry(w, 2, d);
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(cx, 44, cz);
      this.cloudsGroup.add(cloud);
    }
    this.scene.add(this.cloudsGroup);

    // Initial fog
    this.scene.fog = new THREE.Fog(0x87ceeb, 28, 90);
    this.scene.background = new THREE.Color(0x87ceeb);

    this.update(0, new THREE.Vector3(8, 20, 8));
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    this.timeOfDay = (this.timeOfDay + delta * this.timeSpeed) % 24000;

    // Angle of sun/moon in radians (0 = sunrise, PI/2 = noon, PI = sunset, 3PI/2 = midnight)
    const angle = ((this.timeOfDay - 0) / 24000) * Math.PI * 2;

    // Rotate Sun and Moon groups around player
    this.sunGroup.position.copy(playerPos);
    this.sunGroup.rotation.x = angle;

    this.moonGroup.position.copy(playerPos);
    this.moonGroup.rotation.x = angle;

    this.starsMesh.position.copy(playerPos);

    // Sun directional position
    const sunX = playerPos.x + Math.sin(angle) * 60;
    const sunY = playerPos.y + Math.cos(angle) * 70;
    const sunZ = playerPos.z + 20;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    // Atmosphere Color & Lighting transitions
    const normalizedTime = this.timeOfDay / 24000; // 0 to 1
    const skyColor = new THREE.Color();
    const fogColor = new THREE.Color();

    let sunIntensity = 1.0;
    let hemiIntensity = 0.5;
    let starOpacity = 0;

    if (normalizedTime < 0.22) {
      // Dawn / Sunrise (0:00 to 5:16)
      const t = normalizedTime / 0.22;
      skyColor.setHSL(0.08, 0.85, 0.45 + t * 0.2); // orange-pink sunrise
      fogColor.setHSL(0.07, 0.7, 0.5);
      sunIntensity = 0.4 + t * 0.7;
      hemiIntensity = 0.25 + t * 0.3;
      starOpacity = (1 - t) * 0.8;
      this.sunLight.color.setHex(0xffaa55);
    } else if (normalizedTime < 0.5) {
      // Morning to Noon (5:16 to 12:00)
      skyColor.setHex(0x78b7e8);
      fogColor.setHex(0xa9d3f5);
      sunIntensity = 1.15;
      hemiIntensity = 0.55;
      starOpacity = 0;
      this.sunLight.color.setHex(0xfffaed);
    } else if (normalizedTime < 0.58) {
      // Afternoon (12:00 to 14:00)
      skyColor.setHex(0x6caad8);
      fogColor.setHex(0x9ccbf2);
      sunIntensity = 1.1;
      hemiIntensity = 0.5;
      starOpacity = 0;
      this.sunLight.color.setHex(0xffeed6);
    } else if (normalizedTime < 0.72) {
      // Sunset / Dusk (14:00 to 17:15)
      const t = (normalizedTime - 0.58) / 0.14;
      skyColor.setHSL(0.05, 0.8, 0.5 - t * 0.35); // fiery red/orange dusk
      fogColor.setHSL(0.04, 0.75, 0.45 - t * 0.3);
      sunIntensity = (1 - t) * 0.9 + 0.1;
      hemiIntensity = (1 - t) * 0.4 + 0.15;
      starOpacity = t * 0.75;
      this.sunLight.color.setHex(0xff6b35);
    } else {
      // Night (17:15 to 24:00)
      skyColor.setHex(0x0a1024);
      fogColor.setHex(0x0e1730);
      sunIntensity = 0.18; // soft blue moonlight
      hemiIntensity = 0.18;
      starOpacity = 0.95;
      this.sunLight.color.setHex(0x5a78af);
    }

    // Apply colors to scene
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(skyColor);
    }
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(fogColor);
    }

    this.sunLight.intensity = sunIntensity;
    this.hemiLight.intensity = hemiIntensity;
    (this.starsMesh.material as THREE.PointsMaterial).opacity = starOpacity;

    // Drift clouds across sky
    for (const cloud of this.cloudsGroup.children) {
      cloud.position.x += delta * 1.5;
      if (cloud.position.x - playerPos.x > 80) {
        cloud.position.x -= 160;
      }
    }
  }

  public setTimeOfDay(time: number) {
    this.timeOfDay = time % 24000;
  }

  public dispose() {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.hemiLight);
    this.scene.remove(this.sunGroup);
    this.scene.remove(this.moonGroup);
    this.scene.remove(this.starsMesh);
    this.scene.remove(this.cloudsGroup);
  }
}
