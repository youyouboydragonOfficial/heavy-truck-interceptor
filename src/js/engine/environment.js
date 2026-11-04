// =========================================================================
// HEAVY TRUCK INTERCEPTOR: HIGH-FIDELITY ENVIRONMENT & MAP ENGINE
// リアルな道路・摩天楼・夜間照明・天候シミュレーション
// - MEGACITY: ネオン輝く摩天楼、ビル窓明かりテクスチャ、等間隔街灯
// - HIGHWAY: 沿岸海面、山岳クリフ、頭上ハイウェイ案内看板
// - DESERT: 赤土キャニオン、砂埃、岩山
// - RAINSTORM: 激しい豪雨パーティクル、稲妻落雷フラッシュ、ウェット路面反射
// =========================================================================

import * as THREE from '../../assets/three.module.js';

export class EnvironmentEngine {
  constructor(scene) {
    this.scene = scene;
    this.currentMap = 'megacity';
    this.chunks = [];
    this.chunkLength = 120;
    this.chunkCount = 8;
    this.rainParticles = null;
    this.lightningLight = null;
    this.nextLightningTime = 0;

    // プロシージャル窓明かりテクスチャ生成
    this.buildingTexture = this.generateBuildingTexture();
  }

  generateBuildingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 外壁ダークスレート
    ctx.fillStyle = '#0a0d16';
    ctx.fillRect(0, 0, 128, 256);

    // 窓の明かり
    for (let y = 8; y < 250; y += 14) {
      for (let x = 8; x < 120; x += 11) {
        if (Math.random() > 0.38) {
          const colors = ['#fffae0', '#ffe6a3', '#00f0ff', '#ffaa44', '#70a1ff'];
          ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
          ctx.fillRect(x, y, 7, 8);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  loadMap(mapType) {
    this.clear();
    this.currentMap = mapType;
    this.setupLighting(mapType);

    for (let i = 0; i < this.chunkCount; i++) {
      const z = (i - 2) * this.chunkLength;
      this.createChunk(z);
    }
  }

  setupLighting(mapType) {
    const lightsToRemove = [];
    this.scene.traverse(obj => {
      if (obj.isLight) lightsToRemove.push(obj);
    });
    lightsToRemove.forEach(l => this.scene.remove(l));

    if (mapType === 'megacity') {
      this.scene.background = new THREE.Color(0x070912);
      this.scene.fog = new THREE.FogExp2(0x070912, 0.0075);

      const hemiLight = new THREE.HemisphereLight(0x7090bb, 0x05070a, 0.8);
      this.scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
      dirLight.position.set(40, 60, 40);
      this.scene.add(dirLight);

      const accentLight = new THREE.DirectionalLight(0xff0055, 0.7);
      accentLight.position.set(-40, 40, -20);
      this.scene.add(accentLight);

    } else if (mapType === 'highway') {
      this.scene.background = new THREE.Color(0x1a2638);
      this.scene.fog = new THREE.FogExp2(0x1a2638, 0.005);

      const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x112233, 0.9);
      this.scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
      sun.position.set(-60, 80, 60);
      this.scene.add(sun);

    } else if (mapType === 'desert') {
      this.scene.background = new THREE.Color(0x38180a);
      this.scene.fog = new THREE.FogExp2(0x38180a, 0.007);

      const hemiLight = new THREE.HemisphereLight(0xffaa66, 0x221105, 0.8);
      this.scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xffaa55, 1.6);
      sun.position.set(70, 70, -30);
      this.scene.add(sun);

    } else if (mapType === 'rainstorm') {
      this.scene.background = new THREE.Color(0x030508);
      this.scene.fog = new THREE.FogExp2(0x030508, 0.012);

      const hemiLight = new THREE.HemisphereLight(0x223355, 0x020305, 0.4);
      this.scene.add(hemiLight);

      this.lightningLight = new THREE.PointLight(0xaaccff, 0, 400);
      this.lightningLight.position.set(0, 80, 0);
      this.scene.add(this.lightningLight);

      this.setupRain();
    }
  }

  setupRain() {
    const rainCount = 4000;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 45;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.22,
      transparent: true,
      opacity: 0.65
    });
    this.rainParticles = new THREE.Points(geom, mat);
    this.scene.add(this.rainParticles);
  }

  createChunk(centerZ) {
    const chunk = new THREE.Group();
    chunk.position.z = centerZ;

    const roadWidth = 24; // 片道4車線
    const roadLength = this.chunkLength;

    // 1. 道路アスファルト (リアルテクスチャ・反射)
    const isWet = this.currentMap === 'rainstorm';
    const roadMat = new THREE.MeshStandardMaterial({
      color: isWet ? 0x0a0c10 : 0x16181d,
      roughness: isWet ? 0.05 : 0.65,
      metalness: isWet ? 0.85 : 0.2
    });
    const roadGeom = new THREE.PlaneGeometry(roadWidth, roadLength);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // 2. 道路白線（車線境界線・破線風）
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-6, 0, 6].forEach(x => {
      const lineGeom = new THREE.PlaneGeometry(0.32, roadLength);
      lineGeom.rotateX(-Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeom, lineMat);
      lineMesh.position.set(x, 0.02, 0);
      chunk.add(lineMesh);
    });

    // 黄色センターライン（二重線）
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    [-11.5, 11.5].forEach(x => {
      const edgeGeom = new THREE.PlaneGeometry(0.4, roadLength);
      edgeGeom.rotateX(-Math.PI / 2);
      const edgeLine = new THREE.Mesh(edgeGeom, yellowMat);
      edgeLine.position.set(x, 0.02, 0);
      chunk.add(edgeLine);
    });

    // 3. 左右スチール製ガードレール
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.85, roughness: 0.25 });
    [-roadWidth / 2 - 0.35, roadWidth / 2 + 0.35].forEach(x => {
      const railGeom = new THREE.BoxGeometry(0.35, 0.85, roadLength);
      const rail = new THREE.Mesh(railGeom, guardMat);
      rail.position.set(x, 0.42, 0);
      chunk.add(rail);

      // ガードレール上部の反射板（赤と白のリフレクター）
      for (let z = -50; z < 50; z += 12) {
        const refColor = x > 0 ? 0xff0022 : 0xffffff;
        const ref = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.3), new THREE.MeshBasicMaterial({ color: refColor }));
        ref.position.set(x + (x > 0 ? -0.2 : 0.2), 0.7, z);
        chunk.add(ref);
      }
    });

    // 4. マップ別オブジェクト
    if (this.currentMap === 'megacity') {
      this.populateCity(chunk);
    } else if (this.currentMap === 'highway') {
      this.populateHighway(chunk);
    } else if (this.currentMap === 'desert') {
      this.populateDesert(chunk);
    } else if (this.currentMap === 'rainstorm') {
      this.populateRainHighway(chunk);
    }

    this.scene.add(chunk);
    this.chunks.push({ group: chunk, z: centerZ });
  }

  populateCity(chunk) {
    const neonColors = [0x00f0ff, 0xff0055, 0x00ff88, 0xffea00];

    // 左右の超高層ビル群（プロシージャル窓明かりテクスチャ付き）
    [-24, 24].forEach((baseX, sideIdx) => {
      for (let z = -45; z < 50; z += 35) {
        const height = 45 + Math.random() * 65;
        const width = 20 + Math.random() * 12;
        const depth = 28 + Math.random() * 12;

        const bMat = new THREE.MeshStandardMaterial({
          color: 0x182030,
          roughness: 0.3,
          metalness: 0.7,
          map: this.buildingTexture
        });
        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
        bMesh.position.set(baseX + (sideIdx === 0 ? -width / 2 : width / 2), height / 2, z);
        chunk.add(bMesh);

        // ネオン電飾看板（発光）
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const neon = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 5, 14),
          new THREE.MeshBasicMaterial({ color: neonColor })
        );
        neon.position.set(baseX + (sideIdx === 0 ? 0.3 : -0.3), 16 + Math.random() * 22, z);
        chunk.add(neon);
      }
    });

    // 街灯（路面を照らす等間隔照明）
    for (let z = -45; z < 50; z += 30) {
      [-12.4, 12.4].forEach(x => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 6.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 })
        );
        pole.position.set(x, 3.25, z);
        chunk.add(pole);

        const head = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.22, 0.45),
          new THREE.MeshBasicMaterial({ color: 0xfff2b8 })
        );
        head.position.set(x + (x > 0 ? -0.45 : 0.45), 6.5, z);
        chunk.add(head);
      });
    }
  }

  populateHighway(chunk) {
    // 海（右側）
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(140, this.chunkLength),
      new THREE.MeshStandardMaterial({ color: 0x062846, roughness: 0.15, metalness: 0.8 })
    );
    ocean.rotateX(-Math.PI / 2);
    ocean.position.set(85, -2, 0);
    chunk.add(ocean);

    // 山岳クリフ（左側）
    for (let z = -45; z < 50; z += 28) {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(26, 40, 7),
        new THREE.MeshStandardMaterial({ color: 0x1f2421, roughness: 0.9 })
      );
      hill.position.set(-38, 14, z);
      chunk.add(hill);
    }

    // ハイウェイ案内看板アーチ
    if (Math.abs(chunk.position.z % 240) < 15) {
      const arch = new THREE.Mesh(
        new THREE.BoxGeometry(26, 0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.85 })
      );
      arch.position.set(0, 7.8, 0);
      chunk.add(arch);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(11, 3.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x007a33, roughness: 0.35 })
      );
      sign.position.set(0, 7.8, 0.5);
      chunk.add(sign);
    }
  }

  populateDesert(chunk) {
    // 赤土キャニオン岩山
    for (let z = -45; z < 50; z += 26) {
      [-36, 36].forEach(x => {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(18 + Math.random() * 8, 1),
          new THREE.MeshStandardMaterial({ color: 0x803512, roughness: 0.95 })
        );
        rock.position.set(x, 8, z);
        chunk.add(rock);
      });
    }
  }

  populateRainHighway(chunk) {
    // 豪雨の夜間ハイウェイ
    this.populateCity(chunk);
  }

  update(playerZ, dt) {
    // チャンクのリサイクル
    this.chunks.forEach(chunkObj => {
      if (chunkObj.z < playerZ - this.chunkLength * 2.5) {
        const maxZ = Math.max(...this.chunks.map(c => c.z));
        chunkObj.z = maxZ + this.chunkLength;
        chunkObj.group.position.z = chunkObj.z;
      }
    });

    // 雨パーティクルの追従
    if (this.rainParticles) {
      this.rainParticles.position.z = playerZ;
      const pos = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 45 * dt;
        if (y < 0) y = 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // 稲妻フラッシュ
      if (this.lightningLight) {
        if (performance.now() > this.nextLightningTime) {
          this.lightningLight.intensity = 8.0;
          this.nextLightningTime = performance.now() + 4000 + Math.random() * 6000;
        } else {
          this.lightningLight.intensity *= 0.88;
        }
      }
    }
  }

  clear() {
    this.chunks.forEach(c => this.scene.remove(c.group));
    this.chunks = [];
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles = null;
    }
    if (this.lightningLight) {
      this.scene.remove(this.lightningLight);
      this.lightningLight = null;
    }
  }
}
