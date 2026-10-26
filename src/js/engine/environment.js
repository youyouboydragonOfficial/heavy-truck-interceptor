import * as THREE from '../../assets/three.module.js';

export class EnvironmentEngine {
  constructor(scene) {
    this.scene = scene;
    this.currentMap = 'megacity';
    this.chunks = [];
    this.chunkLength = 120;
    this.chunkCount = 8;
    this.weatherEffects = [];
    this.rainParticles = null;
    this.lightningLight = null;
    this.nextLightningTime = 0;
  }

  // マップ切替
  loadMap(mapType) {
    this.clear();
    this.currentMap = mapType;

    // 天候・ライティング設定
    this.setupLighting(mapType);

    // 初期チャンク生成
    for (let i = 0; i < this.chunkCount; i++) {
      const z = (i - 2) * this.chunkLength;
      this.createChunk(z);
    }
  }

  setupLighting(mapType) {
    // 既存ライトの削除
    const lightsToRemove = [];
    this.scene.traverse(obj => {
      if (obj.isLight) lightsToRemove.push(obj);
    });
    lightsToRemove.forEach(l => this.scene.remove(l));

    if (mapType === 'megacity') {
      // 夕暮れの摩天楼
      this.scene.background = new THREE.Color(0x181528);
      this.scene.fog = new THREE.FogExp2(0x181528, 0.007);

      const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x111122, 0.6);
      this.scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xff8844, 1.2);
      dirLight.position.set(50, 80, 50);
      dirLight.castShadow = true;
      this.scene.add(dirLight);

    } else if (mapType === 'highway') {
      // 晴天の沿岸ハイウェイ
      this.scene.background = new THREE.Color(0x60a5fa);
      this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.004);

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 0.7);
      this.scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xfffaed, 1.5);
      sun.position.set(-60, 100, 80);
      sun.castShadow = true;
      this.scene.add(sun);

    } else if (mapType === 'desert') {
      // 灼熱のキャニオン
      this.scene.background = new THREE.Color(0xca8a04);
      this.scene.fog = new THREE.FogExp2(0xb45309, 0.006);

      const hemiLight = new THREE.HemisphereLight(0xffddaa, 0x553311, 0.6);
      this.scene.add(hemiLight);

      const sun = new THREE.DirectionalLight(0xfff0c2, 1.6);
      sun.position.set(80, 70, -30);
      sun.castShadow = true;
      this.scene.add(sun);

    } else if (mapType === 'rainstorm') {
      // 暴風雨のナイトハイウェイ
      this.scene.background = new THREE.Color(0x05070a);
      this.scene.fog = new THREE.FogExp2(0x05070a, 0.009);

      const hemiLight = new THREE.HemisphereLight(0x223344, 0x05070a, 0.3);
      this.scene.add(hemiLight);

      // 稲妻用フラッシュライト
      this.lightningLight = new THREE.PointLight(0xaaccff, 0, 300);
      this.lightningLight.position.set(0, 80, 0);
      this.scene.add(this.lightningLight);

      // 雨パーティクル
      this.setupRain();
    }
  }

  setupRain() {
    const rainCount = 3500;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.2,
      transparent: true,
      opacity: 0.6
    });
    this.rainParticles = new THREE.Points(geom, mat);
    this.scene.add(this.rainParticles);
  }

  // チャンク（道路セグメント＋周囲の建造物）作成
  createChunk(centerZ) {
    const chunk = new THREE.Group();
    chunk.position.z = centerZ;

    const roadWidth = 24; // 片道4車線の大動脈
    const roadLength = this.chunkLength;

    // 道路アスファルト
    const isWet = this.currentMap === 'rainstorm';
    const roadMat = new THREE.MeshStandardMaterial({
      color: isWet ? 0x08090b : 0x1a1a1e,
      roughness: isWet ? 0.08 : 0.7,
      metalness: isWet ? 0.8 : 0.1
    });
    const roadGeom = new THREE.PlaneGeometry(roadWidth, roadLength);
    roadGeom.rotateX(-Math.PI / 2);
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.receiveShadow = true;
    chunk.add(roadMesh);

    // 道路白線（車線境界線）
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-6, 0, 6].forEach(x => {
      const lineGeom = new THREE.PlaneGeometry(0.35, roadLength);
      lineGeom.rotateX(-Math.PI / 2);
      const lineMesh = new THREE.Mesh(lineGeom, lineMat);
      lineMesh.position.set(x, 0.02, 0);
      chunk.add(lineMesh);
    });

    // 左右ガードレール
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
    [-roadWidth / 2 - 0.4, roadWidth / 2 + 0.4].forEach(x => {
      const railGeom = new THREE.BoxGeometry(0.4, 0.9, roadLength);
      const rail = new THREE.Mesh(railGeom, guardMat);
      rail.position.set(x, 0.45, 0);
      chunk.add(rail);
    });

    // マップ別周囲オブジェクト
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

  // 市街地ビル群
  populateCity(chunk) {
    const buildingColors = [0x1e272e, 0x2f3640, 0x192a56, 0x273c75];
    const neonColors = [0x00f0ff, 0xff0055, 0x00ff66, 0xffbb00];

    // 道路の左右に摩天楼
    [-22, 22].forEach((baseX, sideIdx) => {
      for (let z = -50; z < 50; z += 35) {
        const height = 35 + Math.random() * 55;
        const width = 18 + Math.random() * 12;
        const depth = 25 + Math.random() * 15;
        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

        const bGeom = new THREE.BoxGeometry(width, height, depth);
        const bMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 });
        const bMesh = new THREE.Mesh(bGeom, bMat);
        bMesh.position.set(baseX + (sideIdx === 0 ? -width / 2 : width / 2), height / 2, z);
        chunk.add(bMesh);

        // ネオン電飾サイン看板
        const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        const neonGeom = new THREE.BoxGeometry(sideIdx === 0 ? 0.3 : 0.3, 4, 12);
        const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });
        const neon = new THREE.Mesh(neonGeom, neonMat);
        neon.position.set(baseX + (sideIdx === 0 ? 0.2 : -0.2), 12 + Math.random() * 20, z);
        chunk.add(neon);
      }
    });

    // 街灯
    for (let z = -45; z < 50; z += 30) {
      [-12.5, 12.5].forEach(x => {
        const poleGeom = new THREE.CylinderGeometry(0.12, 0.12, 6, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const pole = new THREE.Mesh(poleGeom, poleMat);
        pole.position.set(x, 3, z);
        chunk.add(pole);

        // 街灯ヘッド
        const lightHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff0aa }));
        lightHead.position.set(x + (x > 0 ? -0.4 : 0.4), 6, z);
        chunk.add(lightHead);
      });
    }
  }

  // 沿岸ハイウェイ
  populateHighway(chunk) {
    // 海（右側）
    const oceanGeom = new THREE.PlaneGeometry(120, this.chunkLength);
    oceanGeom.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({ color: 0x0f4c81, roughness: 0.1, metalness: 0.7 });
    const ocean = new THREE.Mesh(oceanGeom, oceanMat);
    ocean.position.set(75, -2, 0);
    chunk.add(ocean);

    // 山岳崖（左側）
    for (let z = -40; z < 50; z += 30) {
      const hillGeom = new THREE.ConeGeometry(25, 35, 6);
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 });
      const hill = new THREE.Mesh(hillGeom, hillMat);
      hill.position.set(-35, 12, z);
      chunk.add(hill);
    }

    // ハイウェイオーバーヘッド標識（頭上アーチ）
    if (Math.abs(chunk.position.z % (this.chunkLength * 2)) < 10) {
      const archGeom = new THREE.BoxGeometry(26, 0.6, 0.6);
      const archMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
      const arch = new THREE.Mesh(archGeom, archMat);
      arch.position.set(0, 7.5, 0);
      chunk.add(arch);

      // 緑の大型案内標識板
      const signGeom = new THREE.BoxGeometry(10, 3, 0.2);
      const signMat = new THREE.MeshStandardMaterial({ color: 0x008037, roughness: 0.4 });
      const sign = new THREE.Mesh(signGeom, signMat);
      sign.position.set(0, 7.5, 0.4);
      chunk.add(sign);
    }
  }

  // 荒野キャニオン
  populateDesert(chunk) {
    const canyonMat = new THREE.MeshStandardMaterial({ color: 0x8b3a12, roughness: 0.95 });
    [-30, 30].forEach((baseX, idx) => {
      for (let z = -45; z < 50; z += 35) {
        const rockGeom = new THREE.DodecahedronGeometry(14 + Math.random() * 8, 1);
        const rock = new THREE.Mesh(rockGeom, canyonMat);
        rock.position.set(baseX, 6 + Math.random() * 4, z);
        rock.scale.set(1.5, 1.8, 1.5);
        chunk.add(rock);
      }
    });
  }

  // 暴風雨ナイトハイウェイ
  populateRainHighway(chunk) {
    this.populateCity(chunk);
  }

  // プレイヤーの進行（Z軸）に合わせてチャンクを前方へリサイクル循環
  update(playerZ, dt) {
    const forwardZ = playerZ + (this.chunkCount - 3) * this.chunkLength;
    const backwardZ = playerZ - 2.5 * this.chunkLength;

    this.chunks.forEach(item => {
      if (item.z < backwardZ) {
        // 後方に過ぎ去ったチャンクを前方に再配置
        const maxZ = Math.max(...this.chunks.map(c => c.z));
        item.z = maxZ + this.chunkLength;
        item.group.position.z = item.z;
      }
    });

    // 雨天時のパーティクル移動 & 稲妻フラッシュ
    if (this.currentMap === 'rainstorm') {
      if (this.rainParticles) {
        this.rainParticles.position.z = playerZ;
        const pos = this.rainParticles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 35 * dt;
          if (y < 0) y = 40;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      // ランダム稲妻フラッシュ
      if (Date.now() > this.nextLightningTime) {
        if (this.lightningLight) {
          this.lightningLight.intensity = 50 + Math.random() * 80;
          this.lightningLight.position.z = playerZ + (Math.random() - 0.5) * 60;
          setTimeout(() => {
            if (this.lightningLight) this.lightningLight.intensity = 0;
          }, 80);
        }
        this.nextLightningTime = Date.now() + 4000 + Math.random() * 6000;
      }
    }
  }

  clear() {
    this.chunks.forEach(item => {
      this.scene.remove(item.group);
    });
    this.chunks = [];
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainParticles = null;
    }
  }
}
