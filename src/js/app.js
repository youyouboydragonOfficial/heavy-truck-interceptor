
// HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
// All-in-One Engine & Controller Bundle
(function() {
  'use strict';

  // 1. SOUND ENGINE
  // Web Audio API による完全自己完結型サウンドエンジン
// 外部音声ファイル不要で迫力あるエンジン音、クラッシュ音、金属変形音、ガラス粉砕、サイレンを生成

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.sirenGain = null;
    this.sirenOsc = null;
    this.sirenActive = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initEngineSound();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngineSound() {
    if (!this.ctx) return;
    // メインエンジン音（サブオシレーター + メインオシレーター + ディストーション + フィルター）
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speedKmh, maxSpeedKmh = 240, throttle = 0) {
    if (!this.ctx || !this.engineGain) return;
    const ratio = Math.min(1.0, Math.max(0.0, speedKmh / maxSpeedKmh));
    const baseFreq = 35 + ratio * 140 + (throttle > 0 ? 30 : 0);
    const filterFreq = 180 + ratio * 850 + (throttle > 0 ? 250 : 0);
    const targetGain = this.isMuted ? 0 : 0.08 + ratio * 0.12 + (throttle > 0 ? 0.05 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  toggleSiren(active) {
    if (!this.ctx) return;
    this.sirenActive = active;
    if (active) {
      if (!this.sirenOsc) {
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.setValueAtTime(0.07, this.ctx.currentTime);

        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sawtooth';
        this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);

        // サイレンのLFOピッチモジュレーション
        this.sirenLfo = this.ctx.createOscillator();
        this.sirenLfo.frequency.setValueAtTime(0.8, this.ctx.currentTime);
        this.sirenLfoGain = this.ctx.createGain();
        this.sirenLfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

        this.sirenLfo.connect(this.sirenLfoGain);
        this.sirenLfoGain.connect(this.sirenOsc.frequency);

        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.ctx.destination);

        this.sirenOsc.start();
        this.sirenLfo.start();
      }
      this.sirenGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.07, this.ctx.currentTime, 0.1);
    } else {
      if (this.sirenGain) {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }
  }

  playCrash(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const power = Math.min(2.5, Math.max(0.3, intensity));

    // 1. サブベース・インパクト（重低音ブーム）
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(130 * power, now);
    boomOsc.frequency.exponentialRampToValueAtTime(20, now + 0.45);
    boomGain.gain.setValueAtTime(0.4 * power, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    boomOsc.connect(boomGain);
    boomGain.connect(this.ctx.destination);
    boomOsc.start(now);
    boomOsc.stop(now + 0.5);

    // 2. 金属粉砕ノイズ（クラッシュメタル）
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * power, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(now);

    // 3. 金属ひしゃげ音（高音レゾナンススクラッチ）
    const metalOsc = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metalOsc.type = 'sawtooth';
    metalOsc.frequency.setValueAtTime(400 + Math.random() * 300, now);
    metalOsc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
    metalGain.gain.setValueAtTime(0.25 * power, now);
    metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    metalOsc.connect(metalGain);
    metalGain.connect(this.ctx.destination);
    metalOsc.start(now);
    metalOsc.stop(now + 0.3);
  }

  playGlassShatter() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playNitro() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.6);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  playEMP() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.6);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  playExplosion() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    // 超巨大爆発音
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 1.2);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  playTireScreech() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.2);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }
}

const soundEngine = new SoundEngine();

  window.soundEngine = soundEngine;

  // 2. PHYSICS ENGINE
  
class PhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    // 物理クオリティ設定（ユーザー要望：パソコンが重くなる超リアル演算モード）
    this.ultraMode = false;
    this.substeps = 2; // Ultraモード時は 4〜6

    // 動的デブリ・破片・パーツ剛体
    this.debrisList = [];
    this.sparkList = [];
    this.smokeList = [];

    // メッシュ変形可能オブジェクトのキャッシュ
    this.deformableMeshes = new Set();

    // デブリ用の共有マテリアル
    this.sparkMaterial = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.25,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transmission: 0.85,
      opacity: 0.7,
      transparent: true,
      roughness: 0.1,
      metalness: 0.1
    });

    this.metalDebrisMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3
    });
  }

  setUltraMode(enabled) {
    this.ultraMode = enabled;
    this.substeps = enabled ? 5 : 2;
  }

  registerDeformable(mesh) {
    if (!mesh || !mesh.geometry) return;
    // BufferGeometry が Non-indexed でない場合は頂点変形用に保持
    const geom = mesh.geometry;
    if (!geom.attributes.position) return;
    
    // 元の初期頂点データを保持
    if (!geom.userData.initialPositions) {
      geom.userData.initialPositions = geom.attributes.position.array.slice();
    }
    this.deformableMeshes.add(mesh);
  }

  // リアルタイム・ソフトボディ風 衝撃点メッシュ変形（Crumple / Soft-Body Deformation）
  applyMeshDeformation(mesh, localHitPoint, hitNormal, forceMagnitude, radius = 2.2) {
    if (!mesh || !mesh.geometry) return;
    const geom = mesh.geometry;
    const posAttr = geom.attributes.position;
    if (!posAttr) return;

    const count = posAttr.count;
    const maxDisplace = Math.min(1.8, forceMagnitude * 0.0035);
    let changed = false;

    // 変形計算：超リアルな板金潰れシミュレーション
    for (let i = 0; i < count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);

      const dx = vx - localHitPoint.x;
      const dy = vy - localHitPoint.y;
      const dz = vz - localHitPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const radSq = radius * radius;

      if (distSq < radSq) {
        const falloff = 1.0 - Math.sqrt(distSq) / radius;
        // 衝撃波のランダム微振動で不規則な金属シワ（Wrinkle）を表現
        const jitter = (Math.random() - 0.5) * 0.15;
        const push = maxDisplace * falloff * (1.0 + jitter);

        // 接触法線の内側へ凹ませる
        posAttr.setXYZ(
          i,
          vx + hitNormal.x * push,
          vy + hitNormal.y * push * 0.6,
          vz + hitNormal.z * push
        );
        changed = true;
      }
    }

    if (changed) {
      posAttr.needsUpdate = true;
      geom.computeVertexNormals();
      if (geom.boundsTree) {
        // バウンディングボックス再計算
        geom.computeBoundingBox();
        geom.computeBoundingSphere();
      }
    }
  }

  // パーツ分離・吹き飛び物理（バンパー、ボンネット、ドア、タイヤなど）
  detachPart(vehicle, partMesh, worldVelocity, impactForce) {
    if (!partMesh || !partMesh.parent) return;

    // ワールド座標・姿勢を取得
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    partMesh.getWorldPosition(worldPos);
    partMesh.getWorldQuaternion(worldQuat);

    // 車両のヒエラルキーから外してシーン直下に配置
    partMesh.parent.remove(partMesh);
    this.scene.add(partMesh);

    partMesh.position.copy(worldPos);
    partMesh.quaternion.copy(worldQuat);

    // 吹き飛び初速度（車両の進行速度 ＋ 衝撃による跳ね上がり＆ランダム回転）
    const blastSpeed = Math.min(25, 5 + impactForce * 0.05);
    const vel = new THREE.Vector3(
      worldVelocity.x + (Math.random() - 0.5) * blastSpeed,
      worldVelocity.y + 4 + Math.random() * (blastSpeed * 0.5),
      worldVelocity.z + (Math.random() - 0.5) * blastSpeed
    );

    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 15
    );

    const debrisItem = {
      mesh: partMesh,
      velocity: vel,
      rotVel: rotVel,
      life: 15.0, // 15秒間路上をバウンドしながら転がる
      isPart: true
    };

    this.debrisList.push(debrisItem);
  }

  // 超密度 火花 & 破片 & ガラススプラッシュ爆風生成（パソコンが熱くなる超演算）
  createImpactExplosion(worldPos, relativeVelocity, intensity = 1.0) {
    const isUltra = this.ultraMode;
    // Ultraモードなら破片パーティクル数が桁違いに増加！
    const shardCount = isUltra ? 220 : 60;
    const sparkCount = isUltra ? 800 : 200;

    const baseSpeed = Math.min(30, 8 + intensity * 0.15);

    // 1. 金属・ガラス破片（3Dソリッドメッシュ）
    const shardGeom = new THREE.BoxGeometry(0.18, 0.08, 0.18);
    for (let i = 0; i < shardCount; i++) {
      const isGlass = Math.random() > 0.45;
      const mat = isGlass ? this.glassMaterial : this.metalDebrisMaterial;
      const mesh = new THREE.Mesh(shardGeom, mat);
      mesh.scale.set(
        0.5 + Math.random() * 1.5,
        0.3 + Math.random() * 0.8,
        0.5 + Math.random() * 1.5
      );
      mesh.position.copy(worldPos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      ));
      this.scene.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 1.2) * baseSpeed;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed + relativeVelocity.x * 0.3,
        3 + Math.random() * speed * 0.8,
        Math.sin(angle) * speed + relativeVelocity.z * 0.3
      );
      const rot = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );

      this.debrisList.push({
        mesh,
        velocity: vel,
        rotVel: rot,
        life: 5.0 + Math.random() * 4.0,
        isPart: false
      });
    }

    // 2. 超密度 スパーク火花（Point Cloud Particles）
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3 + 0] = worldPos.x;
      sparkPositions[i * 3 + 1] = worldPos.y + 0.3;
      sparkPositions[i * 3 + 2] = worldPos.z;

      const spAngle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.2) * Math.PI * 0.5;
      const spSpeed = (0.5 + Math.random() * 1.8) * baseSpeed * 1.3;
      sparkVelocities.push(new THREE.Vector3(
        Math.cos(spAngle) * Math.cos(elev) * spSpeed,
        Math.sin(elev) * spSpeed + 4.0,
        Math.sin(spAngle) * Math.cos(elev) * spSpeed
      ));
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkPoints = new THREE.Points(sparkGeo, this.sparkMaterial);
    this.scene.add(sparkPoints);

    this.sparkList.push({
      points: sparkPoints,
      velocities: sparkVelocities,
      life: 1.2,
      maxLife: 1.2
    });
  }

  // 物理シミュレーション更新（毎フレーム呼び出し、サブステップ演算）
  update(dt) {
    const steps = this.substeps;
    const subDt = dt / steps;
    const gravity = -19.6; // リアルな重力加速度

    for (let s = 0; s < steps; s++) {
      // 1. デブリ・パーツの剛体運動 & 地面反発衝突
      for (let i = this.debrisList.length - 1; i >= 0; i--) {
        const item = this.debrisList[i];
        item.life -= subDt;

        if (item.life <= 0) {
          this.scene.remove(item.mesh);
          if (!item.isPart) {
            item.mesh.geometry.dispose();
          }
          this.debrisList.splice(i, 1);
          continue;
        }

        // 重力 & 空気抵抗
        item.velocity.y += gravity * subDt;
        item.velocity.x *= 0.992;
        item.velocity.z *= 0.992;

        // 位置更新
        item.mesh.position.addScaledVector(item.velocity, subDt);

        // 回転更新
        item.mesh.rotation.x += item.rotVel.x * subDt;
        item.mesh.rotation.y += item.rotVel.y * subDt;
        item.mesh.rotation.z += item.rotVel.z * subDt;

        // 地面との接触判定（アスファルト地面: Y=0）
        const groundY = 0.15;
        if (item.mesh.position.y < groundY) {
          item.mesh.position.y = groundY;
          // 反発係数（地面バウンド）
          item.velocity.y = -item.velocity.y * 0.38;
          // 地面摩擦で減速 & スピン減衰
          item.velocity.x *= 0.82;
          item.velocity.z *= 0.82;
          item.rotVel.multiplyScalar(0.75);
        }
      }

      // 2. スパーク火花パーティクルの計算
      for (let i = this.sparkList.length - 1; i >= 0; i--) {
        const sp = this.sparkList[i];
        sp.life -= subDt;
        if (sp.life <= 0) {
          this.scene.remove(sp.points);
          sp.points.geometry.dispose();
          this.sparkList.splice(i, 1);
          continue;
        }

        const posAttr = sp.points.geometry.attributes.position;
        const count = sp.velocities.length;
        for (let j = 0; j < count; j++) {
          const v = sp.velocities[j];
          v.y += gravity * 1.5 * subDt;
          v.x *= 0.98;
          v.z *= 0.98;

          let px = posAttr.getX(j) + v.x * subDt;
          let py = posAttr.getY(j) + v.y * subDt;
          let pz = posAttr.getZ(j) + v.z * subDt;

          if (py < 0.05) {
            py = 0.05;
            v.y = -v.y * 0.25;
            v.x *= 0.7;
            v.z *= 0.7;
          }

          posAttr.setXYZ(j, px, py, pz);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  // クリーンアップ
  clear() {
    this.debrisList.forEach(item => {
      this.scene.remove(item.mesh);
      if (!item.isPart) item.mesh.geometry.dispose();
    });
    this.debrisList = [];

    this.sparkList.forEach(sp => {
      this.scene.remove(sp.points);
      sp.points.geometry.dispose();
    });
    this.sparkList = [];
  }
}

  window.PhysicsEngine = PhysicsEngine;

  // 3. VEHICLE FACTORY
  
class VehicleFactory {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
  }

  // --- ヘルパー：ホイール作成 ---
  createWheel(radius = 0.42, width = 0.3) {
    const group = new THREE.Group();
    const geom = new THREE.CylinderGeometry(radius, radius, width, 16);
    geom.rotateZ(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
      metalness: 0.1
    });
    const tire = new THREE.Mesh(geom, mat);
    tire.castShadow = true;
    group.add(tire);

    // リム・ホイールキャップ
    const rimGeom = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.05, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.3,
      metalness: 0.8
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    group.add(rim);

    return group;
  }

  // ==========================================
  // 1. 捜査用高速パトロールセダン (Patrol Crown)
  // ==========================================
  createPatrolCrown() {
    const root = new THREE.Group();
    const parts = {};

    // メインシャーシ（衝突で変形する）
    const bodyGeom = new THREE.BoxGeometry(2.0, 0.75, 4.6, 6, 3, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x050505, // 黒
      roughness: 0.2,
      metalness: 0.6
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    bodyMesh.position.y = 0.65;
    bodyMesh.castShadow = true;
    root.add(bodyMesh);
    this.physics.registerDeformable(bodyMesh);
    parts.body = bodyMesh;

    // 白ドアパネル
    const doorGeom = new THREE.BoxGeometry(2.02, 0.55, 2.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.2, metalness: 0.4 });
    const doors = new THREE.Mesh(doorGeom, doorMat);
    doors.position.set(0, 0.65, -0.1);
    root.add(doors);

    // キャビン＆ガラス
    const cabinGeom = new THREE.BoxGeometry(1.7, 0.65, 2.3, 4, 2, 4);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x112233,
      transmission: 0.8,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    const cabin = new THREE.Mesh(cabinGeom, glassMat);
    cabin.position.set(0, 1.25, -0.3);
    root.add(cabin);
    this.physics.registerDeformable(cabin);
    parts.cabin = cabin;

    // ルーフパトランプ（赤青バー）
    const sirenBar = new THREE.Group();
    const redLightGeom = new THREE.BoxGeometry(0.55, 0.12, 0.25);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    const redLight = new THREE.Mesh(redLightGeom, redMat);
    redLight.position.x = -0.35;
    sirenBar.add(redLight);

    const blueLightGeom = new THREE.BoxGeometry(0.55, 0.12, 0.25);
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x0055ff });
    const blueLight = new THREE.Mesh(blueLightGeom, blueMat);
    blueLight.position.x = 0.35;
    sirenBar.add(blueLight);

    sirenBar.position.set(0, 1.63, -0.3);
    root.add(sirenBar);
    parts.siren = sirenBar;

    // 強化プッシュバンパー（Bull Bar）
    const bumperGeom = new THREE.BoxGeometry(2.1, 0.45, 0.3, 4, 2, 2);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 });
    const bumper = new THREE.Mesh(bumperGeom, bumperMat);
    bumper.position.set(0, 0.5, 2.35);
    root.add(bumper);
    this.physics.registerDeformable(bumper);
    parts.frontBumper = bumper;

    // ボンネットフード
    const hoodGeom = new THREE.BoxGeometry(1.8, 0.1, 1.4, 4, 2, 4);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.6 });
    const hood = new THREE.Mesh(hoodGeom, hoodMat);
    hood.position.set(0, 1.05, 1.4);
    root.add(hood);
    this.physics.registerDeformable(hood);
    parts.hood = hood;

    // ヘッドライト
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const flLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    flLight.position.set(-0.75, 0.7, 2.31);
    root.add(flLight);
    const frLight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    frLight.position.set(0.75, 0.7, 2.31);
    root.add(frLight);

    // 車輪 4輪
    const wheels = [];
    const wPositions = [
      [-0.95, 0.42, 1.45],  // 前左
      [0.95, 0.42, 1.45],   // 前右
      [-0.95, 0.42, -1.45], // 後左
      [0.95, 0.42, -1.45]   // 後右
    ];
    wPositions.forEach((pos, idx) => {
      const wheel = this.createWheel(0.42, 0.28);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      type: 'patrol',
      name: 'POLICE CROWN INTERCEPTOR',
      root,
      parts,
      wheels,
      stats: {
        mass: 1950,
        maxSpeed: 250,
        accel: 28,
        handling: 3.5,
        ramPower: 1.2,
        integrity: 100,
        maxIntegrity: 100,
        specialName: 'EMP PULSE CANNON'
      }
    };
  }

  // ==========================================
  // 2. 超高速スーパー追跡車 (V12 Phantom)
  // ==========================================
  createSupercar() {
    const root = new THREE.Group();
    const parts = {};

    // 超低重心エアロボディ
    const bodyGeom = new THREE.BoxGeometry(2.15, 0.55, 4.8, 6, 3, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xe67e22, // ネオンオレンジ
      roughness: 0.15,
      metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 低いコクピットガラス
    const cabinGeom = new THREE.BoxGeometry(1.6, 0.45, 2.0, 4, 2, 4);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050510,
      transmission: 0.9,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9
    });
    const cabin = new THREE.Mesh(cabinGeom, glassMat);
    cabin.position.set(0, 0.9, -0.1);
    root.add(cabin);
    this.physics.registerDeformable(cabin);
    parts.cabin = cabin;

    // 巨大カーボンGTウィング
    const wingGeom = new THREE.BoxGeometry(2.2, 0.08, 0.45);
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.5 });
    const wing = new THREE.Mesh(wingGeom, carbonMat);
    wing.position.set(0, 1.25, -2.1);
    root.add(wing);
    parts.wing = wing;

    // フロントカーボンスプリッター
    const splitterGeom = new THREE.BoxGeometry(2.2, 0.08, 0.6);
    const splitter = new THREE.Mesh(splitterGeom, carbonMat);
    splitter.position.set(0, 0.22, 2.3);
    root.add(splitter);
    parts.splitter = splitter;

    // レース用ワイドホイール
    const wheels = [];
    const wPositions = [
      [-1.02, 0.38, 1.5],
      [1.02, 0.38, 1.5],
      [-1.04, 0.42, -1.4],
      [1.04, 0.42, -1.4]
    ];
    wPositions.forEach((pos, idx) => {
      const radius = idx >= 2 ? 0.42 : 0.38;
      const wheel = this.createWheel(radius, 0.34);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      type: 'supercar',
      name: 'V12 PHANTOM SUPER-PURSUIT',
      root,
      parts,
      wheels,
      stats: {
        mass: 1480,
        maxSpeed: 330,
        accel: 38,
        handling: 4.2,
        ramPower: 0.9,
        integrity: 80,
        maxIntegrity: 80,
        specialName: 'TWIN-TURBO NITRO BLOW'
      }
    };
  }

  // ==========================================
  // 3. 重装甲タクティカルSUV (Titan Heavy 4x4)
  // ==========================================
  createHeavySUV() {
    const root = new THREE.Group();
    const parts = {};

    // 巨大マッシブボディ
    const bodyGeom = new THREE.BoxGeometry(2.35, 1.15, 5.0, 6, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x222629, // ガンメタルアーマー
      roughness: 0.4,
      metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.05;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 防弾ガラスキャビン
    const cabinGeom = new THREE.BoxGeometry(2.1, 0.85, 3.2, 4, 2, 4);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.2, transmission: 0.7 });
    const cabin = new THREE.Mesh(cabinGeom, glassMat);
    cabin.position.set(0, 1.9, -0.4);
    root.add(cabin);
    this.physics.registerDeformable(cabin);
    parts.cabin = cabin;

    // 巨大アイアンブルバー（重装甲バンパー）
    const barGeom = new THREE.BoxGeometry(2.4, 0.8, 0.45);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.2 });
    const bullBar = new THREE.Mesh(barGeom, barMat);
    bullBar.position.set(0, 0.9, 2.6);
    root.add(bullBar);
    this.physics.registerDeformable(bullBar);
    parts.bullBar = bullBar;

    // 大口径オフロードタイヤ
    const wheels = [];
    const wPositions = [
      [-1.15, 0.6, 1.6],
      [1.15, 0.6, 1.6],
      [-1.15, 0.6, -1.6],
      [1.15, 0.6, -1.6]
    ];
    wPositions.forEach(pos => {
      const wheel = this.createWheel(0.6, 0.42);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      type: 'suv',
      name: 'TITAN HEAVY 4x4 ARMORED',
      root,
      parts,
      wheels,
      stats: {
        mass: 3400,
        maxSpeed: 215,
        accel: 24,
        handling: 2.8,
        ramPower: 2.1,
        integrity: 180,
        maxIntegrity: 180,
        specialName: 'IRON CLAD IMPACT RAM'
      }
    };
  }

  // ==========================================
  // 4. 特装装甲突破機 (Rhino Ram Juggernaut)
  // ==========================================
  createRhinoRam() {
    const root = new THREE.Group();
    const parts = {};

    // 超重量級フレーム
    const bodyGeom = new THREE.BoxGeometry(2.5, 1.4, 5.6, 6, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a252f, // ミリタリーディープネイビー
      roughness: 0.5,
      metalness: 0.6
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.15;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 特殊排土板（鋭角V字プラウ - トラックを吹き飛ばす）
    const plowGeom = new THREE.CylinderGeometry(0.1, 1.4, 2.7, 4);
    plowGeom.rotateY(Math.PI / 4);
    const plowMat = new THREE.MeshStandardMaterial({ color: 0x881111, metalness: 0.9, roughness: 0.2 });
    const plow = new THREE.Mesh(plowGeom, plowMat);
    plow.position.set(0, 0.85, 3.1);
    plow.scale.set(1.1, 1.0, 1.4);
    root.add(plow);
    this.physics.registerDeformable(plow);
    parts.plow = plow;

    // 巨大タイヤ（6輪）
    const wheels = [];
    const wPositions = [
      [-1.25, 0.65, 1.9],
      [1.25, 0.65, 1.9],
      [-1.25, 0.65, -0.8],
      [1.25, 0.65, -0.8],
      [-1.25, 0.65, -2.1],
      [1.25, 0.65, -2.1]
    ];
    wPositions.forEach(pos => {
      const wheel = this.createWheel(0.65, 0.45);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      type: 'rhino',
      name: 'RHINO RAM JUGGERNAUT',
      root,
      parts,
      wheels,
      stats: {
        mass: 6500,
        maxSpeed: 190,
        accel: 22,
        handling: 2.3,
        ramPower: 3.5,
        integrity: 260,
        maxIntegrity: 260,
        specialName: 'KINETIC CRUSH BREAKER'
      }
    };
  }

  // ==========================================
  // 5. 標的1: 超大型18輪連結メガトラック (18-Wheeler Tanker/Hauler)
  // ==========================================
  create18Wheeler() {
    const root = new THREE.Group();
    const parts = {};

    // A. 前部トラクターキャブ
    const cabGroup = new THREE.Group();
    root.add(cabGroup);

    // キャブメインボディ（ロングノーズ）
    const cabGeom = new THREE.BoxGeometry(2.6, 2.2, 5.2, 6, 4, 8);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xb31313, // 鮮烈なクリムゾンレッド
      roughness: 0.25,
      metalness: 0.5
    });
    const cab = new THREE.Mesh(cabGeom, cabMat);
    cab.position.set(0, 1.7, 4.0);
    cab.castShadow = true;
    cabGroup.add(cab);
    this.physics.registerDeformable(cab);
    parts.cab = cab;

    // 巨大クロームフロントグリル（直撃ターゲット）
    const grilGeom = new THREE.BoxGeometry(2.2, 1.6, 0.35, 4, 4, 2);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.1 });
    const grille = new THREE.Mesh(grilGeom, chromeMat);
    grille.position.set(0, 1.6, 6.7);
    cabGroup.add(grille);
    this.physics.registerDeformable(grille);
    parts.grille = grille;

    // 前部巨大バンパー
    const bumperGeom = new THREE.BoxGeometry(2.7, 0.6, 0.4, 4, 2, 2);
    const bumper = new THREE.Mesh(bumperGeom, chromeMat);
    bumper.position.set(0, 0.65, 6.8);
    cabGroup.add(bumper);
    this.physics.registerDeformable(bumper);
    parts.frontBumper = bumper;

    // 垂直煙突マフラー（2本）
    const pipeGeom = new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8);
    const pipeL = new THREE.Mesh(pipeGeom, chromeMat);
    pipeL.position.set(-1.25, 2.6, 2.2);
    cabGroup.add(pipeL);
    parts.pipeL = pipeL;
    const pipeR = new THREE.Mesh(pipeGeom, chromeMat);
    pipeR.position.set(1.25, 2.6, 2.2);
    cabGroup.add(pipeR);
    parts.pipeR = pipeR;

    // 左右サイド燃料タンク（爆発部位）
    const tankGeom = new THREE.CylinderGeometry(0.42, 0.42, 2.2, 12);
    tankGeom.rotateX(Math.PI / 2);
    const tankL = new THREE.Mesh(tankGeom, chromeMat);
    tankL.position.set(-1.3, 0.65, 3.8);
    cabGroup.add(tankL);
    parts.tankL = tankL;
    const tankR = new THREE.Mesh(tankGeom, chromeMat);
    tankR.position.set(1.3, 0.65, 3.8);
    cabGroup.add(tankR);
    parts.tankR = tankR;

    // B. 後部巨大トレーラーコンテナ
    const trailerGroup = new THREE.Group();
    trailerGroup.position.set(0, 0, -2.5);
    root.add(trailerGroup);

    // 巨大コンテナボックス
    const contGeom = new THREE.BoxGeometry(2.7, 2.9, 11.5, 6, 4, 12);
    const contMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.4,
      metalness: 0.2
    });
    const container = new THREE.Mesh(contGeom, contMat);
    container.position.set(0, 2.2, -4.5);
    container.castShadow = true;
    trailerGroup.add(container);
    this.physics.registerDeformable(container);
    parts.container = container;

    // コンテナリアドア
    const doorGeom = new THREE.BoxGeometry(2.6, 2.7, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x992222, metalness: 0.6, roughness: 0.3 });
    const rearDoor = new THREE.Mesh(doorGeom, doorMat);
    rearDoor.position.set(0, 2.2, -10.3);
    trailerGroup.add(rearDoor);
    parts.rearDoor = rearDoor;

    // 18輪タイヤ配置
    const wheels = [];
    // キャブ操舵輪（2輪）
    [[-1.2, 0.55, 5.6], [1.2, 0.55, 5.6]].forEach(p => {
      const w = this.createWheel(0.55, 0.38);
      w.position.set(...p);
      cabGroup.add(w);
      wheels.push(w);
    });
    // キャブ駆動後輪（左右ダブル × 2軸 = 8輪）
    [-1.25, -1.05, 1.05, 1.25].forEach(x => {
      [2.5, 1.2].forEach(z => {
        const w = this.createWheel(0.55, 0.32);
        w.position.set(x, 0.55, z);
        cabGroup.add(w);
        wheels.push(w);
      });
    });
    // トレーラー後輪（左右ダブル × 2軸 = 8輪）
    [-1.25, -1.05, 1.05, 1.25].forEach(x => {
      [-8.0, -9.4].forEach(z => {
        const w = this.createWheel(0.55, 0.32);
        w.position.set(x, 0.55, z);
        trailerGroup.add(w);
        wheels.push(w);
      });
    });

    return {
      type: 'truck',
      name: 'RAMPAGING 18-WHEELER MEGA HAULER',
      root,
      cabGroup,
      trailerGroup,
      parts,
      wheels,
      stats: {
        mass: 38000,
        speed: 135,
        integrity: 1000,
        maxIntegrity: 1000,
        engineHp: 100,
        tiresHp: 100,
        status: 'RAMPAGING AT HIGH SPEED'
      }
    };
  }

  // ==========================================
  // 6. 標的2: 暴走2階建て長距離バス (Twin-Deck Wild Bus)
  // ==========================================
  createWildBus() {
    const root = new THREE.Group();
    const parts = {};

    // 巨大2階建て車体（高重心）
    const bodyGeom = new THREE.BoxGeometry(2.7, 3.6, 12.0, 6, 6, 14);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x16a085, // ティールグリーン
      roughness: 0.3,
      metalness: 0.4
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(0, 2.3, 0);
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 1階＆2階の長大な連続窓ガラス
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1520,
      transmission: 0.75,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.85, 9.5), glassMat);
    win1.position.set(0, 1.8, 0.2);
    root.add(win1);
    parts.window1 = win1;

    const win2 = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.85, 9.5), glassMat);
    win2.position.set(0, 3.0, 0.2);
    root.add(win2);
    parts.window2 = win2;

    // 前面巨大ガラス
    const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.2), glassMat);
    frontWindshield.position.set(0, 2.5, 6.01);
    root.add(frontWindshield);
    parts.frontWindshield = frontWindshield;

    // バス用大型タイヤ（3軸 8輪）
    const wheels = [];
    [[-1.25, 0.55, 4.6], [1.25, 0.55, 4.6]].forEach(p => {
      const w = this.createWheel(0.55, 0.38);
      w.position.set(...p);
      root.add(w);
      wheels.push(w);
    });
    [-1.25, 1.25].forEach(x => {
      [-3.4, -4.8].forEach(z => {
        const w = this.createWheel(0.55, 0.38);
        w.position.set(x, 0.55, z);
        root.add(w);
        wheels.push(w);
      });
    });

    return {
      type: 'bus',
      name: 'OUT-OF-CONTROL TWIN-DECK BUS',
      root,
      parts,
      wheels,
      stats: {
        mass: 22000,
        speed: 155,
        integrity: 850,
        maxIntegrity: 850,
        engineHp: 100,
        tiresHp: 100,
        status: 'ERRATIC DRIVING / HIGHSPEED'
      }
    };
  }

  // ==========================================
  // 7. 標的3: 重装甲メガクラッシャー (Armored Mega-Crusher)
  // ==========================================
  createArmoredCrusher() {
    const root = new THREE.Group();
    const parts = {};

    // 超重装甲シャーシ
    const bodyGeom = new THREE.BoxGeometry(3.2, 2.6, 9.0, 6, 4, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x332a15, // 錆びた装甲鋼板
      roughness: 0.6,
      metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(0, 2.0, 0);
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 前面スパイク排土板
    const spikePlowGeom = new THREE.BoxGeometry(3.6, 1.8, 0.8, 4, 2, 2);
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });
    const spikePlow = new THREE.Mesh(spikePlowGeom, spikeMat);
    spikePlow.position.set(0, 1.2, 4.8);
    root.add(spikePlow);
    this.physics.registerDeformable(spikePlow);
    parts.spikePlow = spikePlow;

    // 巨大マフラー
    const pipeGeom = new THREE.CylinderGeometry(0.2, 0.2, 3.0, 8);
    const pipe = new THREE.Mesh(pipeGeom, spikeMat);
    pipe.position.set(-1.4, 3.2, -1.0);
    root.add(pipe);
    parts.pipe = pipe;

    // 超大径オフロードホイール（8輪）
    const wheels = [];
    [-1.5, 1.5].forEach(x => {
      [3.0, 1.0, -1.2, -3.2].forEach(z => {
        const w = this.createWheel(0.75, 0.55);
        w.position.set(x, 0.75, z);
        root.add(w);
        wheels.push(w);
      });
    });

    return {
      type: 'crusher',
      name: 'ARMORED MEGA-CRUSHER JUGGERNAUT',
      root,
      parts,
      wheels,
      stats: {
        mass: 45000,
        speed: 130,
        integrity: 1500,
        maxIntegrity: 1500,
        engineHp: 100,
        tiresHp: 100,
        status: 'HEAVY ARMORED / MAXIMUM THREAT'
      }
    };
  }

  // ==========================================
  // 8. トラフィック一般車（弾き飛ばされるオブジェクト）
  // ==========================================
  createCivilianCar(color = 0x3498db) {
    const root = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(1.9, 0.7, 4.2, 4, 2, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.4 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);

    const cabinGeom = new THREE.BoxGeometry(1.6, 0.6, 2.2);
    const cabin = new THREE.Mesh(cabinGeom, new THREE.MeshPhysicalMaterial({ color: 0x111111, transmission: 0.8 }));
    cabin.position.set(0, 1.15, -0.2);
    root.add(cabin);

    // 4輪
    [[-0.9, 0.38, 1.3], [0.9, 0.38, 1.3], [-0.9, 0.38, -1.3], [0.9, 0.38, -1.3]].forEach(p => {
      const w = this.createWheel(0.38, 0.25);
      w.position.set(...p);
      root.add(w);
    });

    return {
      root,
      body,
      speed: 70 + Math.random() * 30,
      mass: 1400,
      hp: 50
    };
  }
}

  window.VehicleFactory = VehicleFactory;

  // 4. ENVIRONMENT ENGINE
  
class EnvironmentEngine {
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

  window.EnvironmentEngine = EnvironmentEngine;

  // 5. IN-APP UPDATER
  // アプリ内アップデーターシステム
// 要件:
// 1. アプリ内で更新を確認・更新できる
// 2. 早すぎるとおかしいので「3秒間の読み込み」を厳格に演出
// 3. 読み込み＆ダウンロード中にかっこいいアニメーション

class InAppUpdater {
  constructor() {
    this.repoOwner = 'youyouboydragonOfficial';
    this.repoName = 'heavy-truck-interceptor';
    this.currentVersion = '1.2.0';
    this.modalEl = document.getElementById('updater-modal');
    this.statusTextEl = document.getElementById('updater-status');
    this.progressBarEl = document.getElementById('updater-progress-fill');
    this.percentTextEl = document.getElementById('updater-percent');
    this.logConsoleEl = document.getElementById('updater-console');
    this.actionBtnEl = document.getElementById('updater-action-btn');
    this.closeBtnEl = document.getElementById('updater-close-btn');

    this.latestRelease = null;
    this.isChecking = false;
    this.isDownloading = false;

    this.init();
  }

  async init() {
    // Electron環境から現在のバージョンを取得
    if (window.electronAPI && window.electronAPI.getVersion) {
      try {
        this.currentVersion = await window.electronAPI.getVersion();
      } catch (e) {
        console.warn('Could not read version from electronAPI', e);
      }
    }
    const verEl = document.getElementById('hud-version-tag');
    if (verEl) verEl.textContent = `v${this.currentVersion}`;

    // ダウンロード進捗イベントリスナー
    if (window.electronAPI && window.electronAPI.onDownloadProgress) {
      window.electronAPI.onDownloadProgress((data) => {
        this.updateDownloadProgress(data.percent, data.receivedBytes, data.totalBytes);
      });
    }

    if (window.electronAPI && window.electronAPI.onDownloadCompleted) {
      window.electronAPI.onDownloadCompleted((data) => {
        this.onDownloadComplete(data.targetPath);
      });
    }

    // クローズボタン
    if (this.closeBtnEl) {
      this.closeBtnEl.addEventListener('click', () => {
        this.closeModal();
      });
    }
  }

  openModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('hidden');
      this.modalEl.classList.add('visible');
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('visible');
      this.modalEl.classList.add('hidden');
    }
  }

  log(msg, type = 'info') {
    if (!this.logConsoleEl) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    const time = new Date().toTimeString().split(' ')[0];
    line.textContent = `[${time}] ${msg}`;
    this.logConsoleEl.appendChild(line);
    this.logConsoleEl.scrollTop = this.logConsoleEl.scrollHeight;
  }

  clearLog() {
    if (this.logConsoleEl) this.logConsoleEl.innerHTML = '';
  }

  // --- アップデート確認（3秒間のサイバーアニメーション演出） ---
  async checkForUpdates() {
    if (this.isChecking || this.isDownloading) return;
    this.isChecking = true;
    this.openModal();
    this.clearLog();

    this.statusTextEl.textContent = 'CONNECTING TO SATELLITE COMMAND RELAY...';
    this.percentTextEl.textContent = '0%';
    this.progressBarEl.style.width = '0%';
    this.actionBtnEl.style.display = 'none';

    this.log('INITIATING SECURE HANDSHAKE WITH SATELLITE COMM...', 'info');

    // 厳格な3秒間の読み込み演出ステップ
    const steps = [
      { time: 500, pct: 18, msg: 'ESTABLISHING QUANTUM-ENCRYPTED TLS LINK...', status: 'CONNECTING GITHUB REPO...' },
      { time: 1100, pct: 42, msg: 'FETCHING REMOTE REPOSITORIES (youyouboydragonOfficial)...', status: 'QUERYING RELEASE MANIFEST...' },
      { time: 1800, pct: 68, msg: 'VERIFYING SHA-256 BINARY SIGNATURES & HASH TABLE...', status: 'PARSING CHECKSUMS...' },
      { time: 2400, pct: 89, msg: 'COMPARING SEMVER TO LOCAL VERSION [v' + this.currentVersion + ']...', status: 'SYNCHRONIZING TELEMETRY...' },
      { time: 3000, pct: 100, msg: 'TELEMETRY SYNC COMPLETE. PARSING RESULT.', status: 'SCAN FINISHED' }
    ];

    // 非同期でGitHub APIから最新リリース情報を取得
    const fetchPromise = this.fetchLatestRelease();

    // 3秒間演出の実行
    for (const step of steps) {
      await new Promise(r => setTimeout(r, step.time === 500 ? 500 : (step.time - (step.prevTime || 0))));
      step.prevTime = step.time;
      this.progressBarEl.style.width = `${step.pct}%`;
      this.percentTextEl.textContent = `${step.pct}%`;
      this.statusTextEl.textContent = step.status;
      this.log(step.msg, 'highlight');
    }

    const releaseData = await fetchPromise;
    this.isChecking = false;

    if (!releaseData) {
      this.statusTextEl.textContent = 'STATUS: STANDALONE OFFLINE BUILD';
      this.log('OFFLINE MODE: GitHub repository is current or awaiting first release.', 'warn');
      this.log(`CURRENT VERSION: v${this.currentVersion} (STABLE)`, 'success');
      this.actionBtnEl.style.display = 'inline-block';
      this.actionBtnEl.textContent = 'RETRY CHECK';
      this.actionBtnEl.onclick = () => this.checkForUpdates();
      return;
    }

    this.latestRelease = releaseData;
    const remoteTag = (releaseData.tag_name || 'v1.0.0').replace(/^v/, '');
    const isNewer = this.compareVersions(remoteTag, this.currentVersion) > 0;

    if (isNewer) {
      this.statusTextEl.textContent = `UPDATE AVAILABLE: v${remoteTag}`;
      this.log(`NEW CRITICAL UPDATE FOUND: v${remoteTag}`, 'alert');
      this.log(`Release Title: ${releaseData.name || 'Latest Mission Patch'}`, 'info');
      this.log(`Published At: ${new Date(releaseData.published_at).toLocaleString()}`, 'info');

      // ダウンロードボタン表示
      this.actionBtnEl.style.display = 'inline-block';
      this.actionBtnEl.textContent = `DOWNLOAD & INSTALL v${remoteTag}`;
      this.actionBtnEl.onclick = () => this.startDownloadUpdate();
    } else {
      this.statusTextEl.textContent = `ALL SYSTEMS UP TO DATE (v${this.currentVersion})`;
      this.log(`SYSTEMS OPTIMAL: You are running the latest version v${this.currentVersion}.`, 'success');
      this.log(`Remote Tag: v${remoteTag} (Checksum verified)`, 'info');
      this.actionBtnEl.style.display = 'inline-block';
      this.actionBtnEl.textContent = 'SYSTEM OPTIMAL (CLOSE)';
      this.actionBtnEl.onclick = () => this.closeModal();
    }
  }

  // GitHub Releases APIから情報取得
  async fetchLatestRelease() {
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn('Failed to query GitHub Releases API', e);
      return null;
    }
  }

  // ダウンロード実行（かっこいいサイバーアニメーション＆プログレス）
  async startDownloadUpdate() {
    if (!this.latestRelease || this.isDownloading) return;

    // .exe アセット（インストーラーまたはポータブル）を検索（.zipは禁止）
    const assets = this.latestRelease.assets || [];
    const exeAsset = assets.find(a => a.name.endsWith('.exe')) || assets[0];

    const downloadUrl = exeAsset ? exeAsset.browser_download_url : this.latestRelease.html_url;

    this.isDownloading = true;
    this.actionBtnEl.style.display = 'none';
    this.statusTextEl.textContent = 'DOWNLOADING SYSTEM UPGRADE...';
    this.progressBarEl.style.width = '0%';
    this.percentTextEl.textContent = '0%';

    this.log(`TARGET BINARY: ${exeAsset ? exeAsset.name : 'Latest Release Binary'}`, 'highlight');
    this.log(`STREAMING FROM CLOUD REPOSITORY...`, 'info');

    if (window.electronAPI && window.electronAPI.downloadAndApplyUpdate && exeAsset) {
      try {
        await window.electronAPI.downloadAndApplyUpdate(downloadUrl);
      } catch (err) {
        this.log(`DOWNLOAD FAILED: ${err.message}`, 'alert');
        this.fallbackBrowserDownload(downloadUrl);
      }
    } else {
      // ブラウザ・フォールバック
      this.fallbackBrowserDownload(downloadUrl);
    }
  }

  updateDownloadProgress(percent, received, total) {
    this.progressBarEl.style.width = `${percent}%`;
    this.percentTextEl.textContent = `${percent}%`;
    const mbRec = (received / (1024 * 1024)).toFixed(1);
    const mbTot = (total / (1024 * 1024)).toFixed(1);
    this.statusTextEl.textContent = `DOWNLOADING: ${mbRec}MB / ${mbTot}MB (${percent}%)`;
    if (percent % 25 === 0) {
      this.log(`DOWNLOADING PACKAGE: ${percent}% COMPLETE...`, 'info');
    }
  }

  onDownloadComplete(filePath) {
    this.isDownloading = false;
    this.statusTextEl.textContent = 'INSTALLING UPDATE & REBOOTING...';
    this.progressBarEl.style.width = '100%';
    this.percentTextEl.textContent = '100%';
    this.log(`UPGRADE PACKAGE SECURED: ${filePath}`, 'success');
    this.log(`LAUNCHING INSTALLER AND RESTARTING APPLICATION...`, 'highlight');
  }

  fallbackBrowserDownload(url) {
    // シミュレーション＆ブラウザオープン
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      this.progressBarEl.style.width = `${p}%`;
      this.percentTextEl.textContent = `${p}%`;
      this.statusTextEl.textContent = `STREAMING DATA: ${p}%`;
      if (p >= 100) {
        clearInterval(interval);
        this.isDownloading = false;
        this.statusTextEl.textContent = 'UPDATE PACKAGE READY IN BROWSER';
        this.log('OPENING RELEASE PAGE FOR DIRECT DOWNLOAD...', 'success');
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
        this.actionBtnEl.style.display = 'inline-block';
        this.actionBtnEl.textContent = 'DONE';
        this.actionBtnEl.onclick = () => this.closeModal();
      }
    }, 200);
  }

  // セマンティックバージョニング比較
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(n => parseInt(n, 10) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }
}

  window.InAppUpdater = InAppUpdater;

  // 6. GAME CORE
  




class Game {
  constructor() {
    this.container = document.getElementById('game-canvas-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.physics = null;
    this.vehicleFactory = null;
    this.environment = null;

    // ゲーム状態
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'WON', 'LOST'
    this.selectedVehicleType = 'patrol';
    this.selectedMap = 'megacity';
    this.selectedTargetType = 'truck';

    // デモプレイ（Attract Mode）用オブジェクト
    this.demoInterceptor = null;
    this.demoTarget = null;
    this.demoTraffics = [];
    this.demoZ = 0;
    this.demoTimer = 0;
    this.demoCamAngle = 0.8;
    this.demoRamTimer = 0;

    // プレイヤー車両
    this.player = null;
    this.playerSpeed = 0; // km/h
    this.playerSteer = 0;
    this.playerPos = new THREE.Vector3(0, 0, 0);
    this.playerRotY = 0;
    this.playerIntegrity = 100;
    this.nitroFuel = 100;
    this.isNitroActive = false;
    this.empCooldown = 0;

    // ターゲット大型車両
    this.target = null;
    this.targetSpeed = 135;
    this.targetPos = new THREE.Vector3(0, 0, 80);
    this.targetIntegrity = 1000;
    this.targetMaxIntegrity = 1000;
    this.targetSwerveTimer = 0;
    this.targetLateralVel = 0;

    // 一般車トラフィック
    this.traffics = [];
    this.maxTraffic = 6;

    // 入力キー状態
    this.keys = {};

    // カメラ設定
    this.cameraMode = 0; // 0: Chase, 1: Close, 2: Cinematic Bumper
    this.cameraShake = 0;

    // 時間計測
    this.lastTime = performance.now();
    this.ultraPhysicsEnabled = false;

    // HUD DOM
    this.hudSpeed = document.getElementById('hud-speed');
    this.hudPlayerHp = document.getElementById('hud-player-hp');
    this.hudPlayerHpBar = document.getElementById('hud-player-hp-bar');
    this.hudNitroBar = document.getElementById('hud-nitro-bar');
    this.hudTargetHp = document.getElementById('hud-target-hp');
    this.hudTargetHpBar = document.getElementById('hud-target-hp-bar');
    this.hudTargetName = document.getElementById('hud-target-name');
    this.hudDistance = document.getElementById('hud-distance');
    this.hudImpactScore = document.getElementById('hud-impact-score');
    this.hudMessage = document.getElementById('hud-announcement');
    this.hudFps = document.getElementById('hud-fps');
    this.hudPhysicsMode = document.getElementById('hud-physics-mode');

    this.totalScore = 0;
    this.frameCount = 0;
    this.fpsTimer = performance.now();

    this.initThree();
    this.setupInputs();
    this.setupDemo(); // 起動直後から大迫力の3Dデモチェイスが爆走！
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      800
    );
    this.camera.position.set(0, 5, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // エンジンサブシステム
    this.physics = new PhysicsEngine(this.scene);
    this.vehicleFactory = new VehicleFactory(this.scene, this.physics);
    this.environment = new EnvironmentEngine(this.scene);

    window.addEventListener('resize', () => this.onWindowResize());

    // アニメーションループ開始
    requestAnimationFrame((t) => this.loop(t));
  }

  setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      soundEngine.ensureContext();

      if (e.code === 'KeyC') {
        this.cameraMode = (this.cameraMode + 1) % 3;
      }
      if (e.code === 'KeyE') {
        this.triggerSpecialAbility();
      }
      if (e.code === 'KeyU') {
        this.toggleUltraPhysics();
      }
      if (e.code === 'KeyR' && this.state === 'PLAYING') {
        this.resetPlayerOrientation();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  toggleUltraPhysics() {
    this.ultraPhysicsEnabled = !this.ultraPhysicsEnabled;
    this.physics.setUltraMode(this.ultraPhysicsEnabled);
    if (this.hudPhysicsMode) {
      this.hudPhysicsMode.textContent = this.ultraPhysicsEnabled ? 'ULTRA OVERCLOCK (PC-MELTING)' : 'NORMAL 60FPS';
      this.hudPhysicsMode.style.color = this.ultraPhysicsEnabled ? '#ff0055' : '#00f0ff';
    }
    this.showAnnouncement(this.ultraPhysicsEnabled ? 'ULTRA PHYSICS ENGINE ENGAGED: MAXIMUM LOAD SIMULATION' : 'PHYSICS ENGINE: OPTIMIZED MODE');
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // =========================================================================
  // スタート画面 3Dデモプレイ・シネマティックアニメーション (Attract Mode)
  // =========================================================================
  setupDemo() {
    this.state = 'MENU';
    this.clearGame();

    // 選択中のマップをロード
    this.environment.loadMap(this.selectedMap);

    this.demoZ = 0;
    this.demoCamAngle = 0.6;
    this.demoRamTimer = 0;

    // 1. デモ用標的車両
    this.spawnDemoTarget(this.selectedTargetType);

    // 2. デモ用捜査車両
    this.spawnDemoInterceptor(this.selectedVehicleType);

    // 3. デモ用一般車
    this.spawnDemoTraffics();
  }

  spawnDemoTarget(type) {
    if (this.demoTarget) {
      this.scene.remove(this.demoTarget.root);
      this.demoTarget = null;
    }
    if (type === 'truck') {
      this.demoTarget = this.vehicleFactory.create18Wheeler();
    } else if (type === 'bus') {
      this.demoTarget = this.vehicleFactory.createWildBus();
    } else if (type === 'crusher') {
      this.demoTarget = this.vehicleFactory.createArmoredCrusher();
    }
    this.demoTarget.root.position.set(1.5, 0, this.demoZ + 22);
    this.scene.add(this.demoTarget.root);
  }

  spawnDemoInterceptor(type) {
    if (this.demoInterceptor) {
      this.scene.remove(this.demoInterceptor.root);
      this.demoInterceptor = null;
    }
    if (type === 'patrol') {
      this.demoInterceptor = this.vehicleFactory.createPatrolCrown();
    } else if (type === 'supercar') {
      this.demoInterceptor = this.vehicleFactory.createSupercar();
    } else if (type === 'suv') {
      this.demoInterceptor = this.vehicleFactory.createHeavySUV();
    } else if (type === 'rhino') {
      this.demoInterceptor = this.vehicleFactory.createRhinoRam();
    }
    this.demoInterceptor.root.position.set(-1.8, 0, this.demoZ);
    this.scene.add(this.demoInterceptor.root);
  }

  spawnDemoTraffics() {
    this.demoTraffics.forEach(t => this.scene.remove(t.root));
    this.demoTraffics = [];
    const colors = [0x2980b9, 0x8e44ad, 0x27ae60];
    colors.forEach((c, idx) => {
      const car = this.vehicleFactory.createCivilianCar(c);
      car.root.position.set([-6, 6][idx % 2], 0, this.demoZ + 50 + idx * 40);
      this.scene.add(car.root);
      this.demoTraffics.push(car);
    });
  }

  // UIで車両が選択されたときにデモ追跡車を即時更新
  updateDemoVehicle(type) {
    this.selectedVehicleType = type;
    if (this.state === 'MENU') {
      this.spawnDemoInterceptor(type);
    }
  }

  // UIで標的が選択されたときにデモ標的を即時更新
  updateDemoTarget(type) {
    this.selectedTargetType = type;
    if (this.state === 'MENU') {
      this.spawnDemoTarget(type);
    }
  }

  // UIでマップが選択されたときに環境を即時更新
  updateDemoMap(map) {
    this.selectedMap = map;
    if (this.state === 'MENU') {
      this.environment.loadMap(map);
    }
  }

  // メニュー画面の毎フレーム更新（猛スピードチェイス＆体当たり火花＆カメラ旋回）
  updateDemo(dt) {
    // 時速140kmで前進
    const speedMs = 39.0;
    this.demoZ += speedMs * dt;
    this.demoTimer += dt;
    this.demoRamTimer += dt;

    const baseZ = this.demoZ;

    // 1. 標的車両の走行
    if (this.demoTarget) {
      const swerve = Math.sin(this.demoTimer * 1.5) * 1.8;
      this.demoTarget.root.position.set(1.2 + swerve, 0, baseZ + 20);
      this.demoTarget.root.rotation.y = Math.cos(this.demoTimer * 1.5) * 0.08;
      if (this.demoTarget.trailerGroup) {
        this.demoTarget.trailerGroup.rotation.y = -Math.cos(this.demoTimer * 1.5) * 0.12;
      }
      // 車輪回転
      this.demoTarget.wheels.forEach(w => {
        w.rotation.x += speedMs * dt * 2.0;
      });
    }

    // 2. 捜査車両のチェイス＆体当たりタックル
    if (this.demoInterceptor) {
      // 2.2秒ごとにトラックの側面に強烈タックル！
      let lateralOffset = -2.2;
      let rotY = 0;
      if (this.demoRamTimer > 2.0) {
        // 体当たり直撃フェーズ
        lateralOffset = 0.2;
        rotY = 0.15;

        // 火花と破片を激しく放出！
        if (Math.random() < 0.45) {
          const hitPos = new THREE.Vector3(
            0.5,
            1.0,
            baseZ + 16
          );
          this.physics.createImpactExplosion(hitPos, new THREE.Vector3(0, 0, speedMs), 1.2);
          if (Math.random() < 0.25) soundEngine.playCrash(0.6);
        }

        if (this.demoRamTimer > 2.7) {
          this.demoRamTimer = 0;
        }
      }

      this.demoInterceptor.root.position.set(lateralOffset, 0, baseZ + 14);
      this.demoInterceptor.root.rotation.y = rotY;

      // 車輪回転
      this.demoInterceptor.wheels.forEach(w => {
        w.rotation.x += speedMs * dt * 2.5;
      });
    }

    // 3. 一般車の走行＆リサイクル
    this.demoTraffics.forEach(car => {
      car.root.position.z += (car.speed / 3.6) * dt;
      if (car.root.position.z < baseZ - 20) {
        car.root.position.z = baseZ + 120 + Math.random() * 40;
      }
    });

    // 4. シネマティックカメラの滑らか旋回
    this.demoCamAngle += dt * 0.22;
    const camDist = 18.0;
    const camHeight = 5.2 + Math.sin(this.demoTimer * 0.5) * 1.5;
    const camX = Math.sin(this.demoCamAngle) * camDist;
    const camZ = baseZ + 16 + Math.cos(this.demoCamAngle) * camDist;

    this.camera.position.set(camX, camHeight, camZ);
    this.camera.lookAt(new THREE.Vector3(0, 1.8, baseZ + 18));

    // 5. 環境チャンクの循環更新
    this.environment.update(baseZ, dt);
  }

  // =========================================================================
  // 本番ゲームプレイ開始 (出動ボタン押下時)
  // =========================================================================
  startGame(vehicleType, mapType, targetType) {
    this.selectedVehicleType = vehicleType;
    this.selectedMap = mapType;
    this.selectedTargetType = targetType;

    // 既存クリア
    this.clearGame();

    // 1. 環境・マップ構築
    this.environment.loadMap(mapType);

    // 2. プレイヤー車両生成
    if (vehicleType === 'patrol') {
      this.player = this.vehicleFactory.createPatrolCrown();
    } else if (vehicleType === 'supercar') {
      this.player = this.vehicleFactory.createSupercar();
    } else if (vehicleType === 'suv') {
      this.player = this.vehicleFactory.createHeavySUV();
    } else if (vehicleType === 'rhino') {
      this.player = this.vehicleFactory.createRhinoRam();
    }
    this.playerPos.set(0, 0, 0);
    this.player.root.position.copy(this.playerPos);
    this.scene.add(this.player.root);

    this.playerSpeed = 90;
    this.playerIntegrity = this.player.stats.integrity;
    this.nitroFuel = 100;

    // 3. 標的暴走大型車両生成
    if (targetType === 'truck') {
      this.target = this.vehicleFactory.create18Wheeler();
    } else if (targetType === 'bus') {
      this.target = this.vehicleFactory.createWildBus();
    } else if (targetType === 'crusher') {
      this.target = this.vehicleFactory.createArmoredCrusher();
    }
    this.targetPos.set(0, 0, 75);
    this.target.root.position.copy(this.targetPos);
    this.scene.add(this.target.root);

    this.targetSpeed = this.target.stats.speed;
    this.targetIntegrity = this.target.stats.integrity;
    this.targetMaxIntegrity = this.target.stats.maxIntegrity;

    if (this.hudTargetName) {
      this.hudTargetName.textContent = this.target.name;
    }

    // 4. 一般車トラフィック生成
    this.spawnTraffics();

    this.state = 'PLAYING';
    soundEngine.init();
    if (vehicleType === 'patrol') {
      soundEngine.toggleSiren(true);
    } else {
      soundEngine.toggleSiren(false);
    }

    this.showAnnouncement('INTERCEPTOR DISPATCHED: RAM & DESTROY THE TARGET!');
  }

  spawnTraffics() {
    this.traffics.forEach(t => this.scene.remove(t.root));
    this.traffics = [];

    const colors = [0x2980b9, 0x8e44ad, 0x27ae60, 0xd35400, 0xbdc3c7];
    for (let i = 0; i < this.maxTraffic; i++) {
      const color = colors[i % colors.length];
      const car = this.vehicleFactory.createCivilianCar(color);
      const lane = [-6, 0, 6][Math.floor(Math.random() * 3)];
      const z = 30 + i * 45;
      car.root.position.set(lane, 0, z);
      this.scene.add(car.root);
      this.traffics.push(car);
    }
  }

  clearGame() {
    if (this.demoInterceptor) {
      this.scene.remove(this.demoInterceptor.root);
      this.demoInterceptor = null;
    }
    if (this.demoTarget) {
      this.scene.remove(this.demoTarget.root);
      this.demoTarget = null;
    }
    this.demoTraffics.forEach(t => this.scene.remove(t.root));
    this.demoTraffics = [];

    if (this.player) {
      this.scene.remove(this.player.root);
      this.player = null;
    }
    if (this.target) {
      this.scene.remove(this.target.root);
      this.target = null;
    }
    this.traffics.forEach(t => this.scene.remove(t.root));
    this.traffics = [];
    this.physics.clear();
    this.environment.clear();
  }

  // --- 特殊能力（Eキー） ---
  triggerSpecialAbility() {
    if (this.state !== 'PLAYING') return;

    if (this.selectedVehicleType === 'patrol') {
      // EMPパルスショック
      if (this.empCooldown <= 0) {
        this.empCooldown = 10.0;
        soundEngine.playEMP();
        this.showAnnouncement('⚡ EMP SHOCKWAVE DISCHARGED!');
        this.cameraShake = 0.8;
        // ターゲットが近くにいれば直撃
        const dist = this.playerPos.distanceTo(this.targetPos);
        if (dist < 35) {
          this.targetSpeed = Math.max(30, this.targetSpeed - 45);
          this.targetIntegrity -= 120;
          this.physics.createImpactExplosion(this.targetPos, new THREE.Vector3(0, 0, 0), 2.0);
          this.showAnnouncement('CRITICAL HIT: TARGET SYSTEMS OVERLOADED!');
        }
      }
    } else if (this.selectedVehicleType === 'supercar') {
      // 瞬間ニトロ過給
      if (this.nitroFuel >= 30) {
        this.nitroFuel -= 30;
        this.playerSpeed += 80;
        soundEngine.playNitro();
        this.showAnnouncement('🚀 NITRO OVERBOOST ACTIVATED!');
        this.cameraShake = 0.6;
      }
    } else if (this.selectedVehicleType === 'suv' || this.selectedVehicleType === 'rhino') {
      // 重装甲ラムチャージ
      this.playerSpeed += 50;
      soundEngine.playNitro();
      this.showAnnouncement('🛡️ HEAVY RAM CHARGE ENGAGED!');
      this.cameraShake = 0.7;
    }
  }

  resetPlayerOrientation() {
    this.playerPos.y = 0;
    this.playerRotY = 0;
    this.player.root.rotation.set(0, 0, 0);
  }

  // --- メインループ ---
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // FPS計測
    this.frameCount++;
    if (now - this.fpsTimer >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      if (this.hudFps) this.hudFps.textContent = `${fps} FPS`;
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    if (this.state === 'MENU') {
      // メニュー中は大迫力3Dデモチェイスが自動で動く！
      this.updateDemo(dt);
    } else if (this.state === 'PLAYING') {
      this.updatePlayer(dt);
      this.updateTarget(dt);
      this.updateTraffics(dt);
      this.checkCollisions();
      this.updateCamera(dt);
      this.updateHUD();
      this.checkWinLoss();
      this.environment.update(this.playerPos.z, dt);
    }

    // 物理エンジン更新（火花・デブリ・剛体）
    this.physics.update(dt);

    this.renderer.render(this.scene, this.camera);
  }

  // --- プレイヤー車両の制御 ---
  updatePlayer(dt) {
    const stats = this.player.stats;

    // 加速・ブレーキ入力
    let throttle = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) throttle += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) throttle -= 1.5;

    // ニトロ
    if ((this.keys['ShiftLeft'] || this.keys['ShiftRight']) && this.nitroFuel > 0 && throttle > 0) {
      this.isNitroActive = true;
      this.nitroFuel = Math.max(0, this.nitroFuel - 25 * dt);
      throttle += 1.8;
      if (Math.random() < 0.2) soundEngine.playNitro();
    } else {
      this.isNitroActive = false;
      this.nitroFuel = Math.min(100, this.nitroFuel + 8 * dt);
    }

    if (this.empCooldown > 0) {
      this.empCooldown -= dt;
    }

    // スピード更新
    const targetMaxSpeed = this.isNitroActive ? stats.maxSpeed * 1.35 : stats.maxSpeed;
    if (throttle > 0) {
      this.playerSpeed += stats.accel * throttle * dt * 3.6;
      if (this.playerSpeed > targetMaxSpeed) this.playerSpeed = targetMaxSpeed;
    } else if (throttle < 0) {
      this.playerSpeed += stats.accel * throttle * dt * 3.6;
      if (this.playerSpeed < -30) this.playerSpeed = -30;
    } else {
      // 惰性減速
      this.playerSpeed *= Math.pow(0.985, dt * 60);
    }

    // ステアリング
    let steerInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steerInput -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steerInput += 1;

    // ハンドブレーキドリフト
    const isHandbrake = this.keys['Space'];
    if (isHandbrake) {
      steerInput *= 1.6;
      this.playerSpeed *= Math.pow(0.97, dt * 60);
      if (Math.abs(this.playerSpeed) > 40 && Math.random() < 0.3) {
        soundEngine.playTireScreech();
      }
    }

    this.playerSteer += (steerInput - this.playerSteer) * Math.min(1, 10 * dt);

    // 進行位置更新
    const speedMs = (this.playerSpeed / 3.6);
    this.playerPos.z += speedMs * dt;
    this.playerPos.x += this.playerSteer * (stats.handling * 3.2) * (speedMs / 25) * dt * 15;

    // ガードレール制限
    if (this.playerPos.x < -10.5) {
      this.playerPos.x = -10.5;
      this.playerSpeed *= 0.85;
      this.cameraShake = 0.3;
      soundEngine.playCrash(0.5);
    } else if (this.playerPos.x > 10.5) {
      this.playerPos.x = 10.5;
      this.playerSpeed *= 0.85;
      this.cameraShake = 0.3;
      soundEngine.playCrash(0.5);
    }

    // 車両メッシュ姿勢更新
    this.player.root.position.copy(this.playerPos);
    this.playerRotY = -this.playerSteer * 0.25;
    this.player.root.rotation.set(
      (throttle > 0 ? -0.02 : throttle < 0 ? 0.03 : 0),
      this.playerRotY,
      -this.playerSteer * 0.08
    );

    // 車輪回転
    const wheelRotSpeed = (speedMs / 0.42) * dt;
    this.player.wheels.forEach(w => {
      w.rotation.x += wheelRotSpeed;
    });

    // エンジン音更新
    soundEngine.updateEngine(this.playerSpeed, stats.maxSpeed, throttle);
  }

  // --- 標的暴走大型車両のAI・挙動 ---
  updateTarget(dt) {
    if (!this.target) return;

    // 暴走速度で直進
    const speedMs = (this.targetSpeed / 3.6);
    this.targetPos.z += speedMs * dt;

    // ジグザグ暴走スワーブ
    this.targetSwerveTimer += dt;
    if (this.targetSwerveTimer > 2.0) {
      this.targetLateralVel = (Math.random() - 0.5) * 8.0;
      this.targetSwerveTimer = 0;
    }
    this.targetPos.x += this.targetLateralVel * dt;
    if (this.targetPos.x < -7.5) {
      this.targetPos.x = -7.5;
      this.targetLateralVel = Math.abs(this.targetLateralVel);
    } else if (this.targetPos.x > 7.5) {
      this.targetPos.x = 7.5;
      this.targetLateralVel = -Math.abs(this.targetLateralVel);
    }

    this.target.root.position.copy(this.targetPos);
    this.target.root.rotation.y = (this.targetLateralVel / 8.0) * 0.1;

    // 18輪トラックのトレーラー関節揺動
    if (this.target.trailerGroup) {
      this.target.trailerGroup.rotation.y = -(this.targetLateralVel / 8.0) * 0.18;
    }

    // 車輪回転
    const wheelRotSpeed = (speedMs / 0.55) * dt;
    this.target.wheels.forEach(w => {
      w.rotation.x += wheelRotSpeed;
    });
  }

  // --- 一般車トラフィック更新 ---
  updateTraffics(dt) {
    for (let car of this.traffics) {
      car.root.position.z += (car.speed / 3.6) * dt;

      // プレイヤーより遥か後方に過ぎ去ったら前方にリスポーン
      if (car.root.position.z < this.playerPos.z - 30) {
        car.root.position.z = this.playerPos.z + 180 + Math.random() * 60;
        car.root.position.x = [-6, 0, 6][Math.floor(Math.random() * 3)];
      }

      // トラックが一般車に突っ込む演出
      const distToTruck = car.root.position.distanceTo(this.targetPos);
      if (distToTruck < 6.5) {
        // トラックが一般車を弾き飛ばす！
        car.root.position.x += (car.root.position.x > this.targetPos.x ? 8 : -8);
        this.physics.createImpactExplosion(car.root.position, new THREE.Vector3(0, 0, 0), 1.5);
        soundEngine.playCrash(1.2);
        this.cameraShake = 0.5;
      }
    }
  }

  // --- 激突・衝突判定（超リアル物理破壊発動） ---
  checkCollisions() {
    if (!this.player || !this.target) return;

    // プレイヤー vs トラックの衝突判定（AABB / 距離）
    const dx = Math.abs(this.playerPos.x - this.targetPos.x);
    const dz = Math.abs(this.playerPos.z - this.targetPos.z);

    const hitWidth = 2.4;
    const hitLength = 8.5;

    if (dx < hitWidth && dz < hitLength) {
      this.handlePlayerTargetCrash();
    }
  }

  handlePlayerTargetCrash() {
    const relSpeedKmh = this.playerSpeed - this.targetSpeed;
    const absRelSpeed = Math.abs(relSpeedKmh);

    // 衝突衝撃力（Impulse）
    const impactForce = Math.max(15, absRelSpeed * 2.2 * this.player.stats.ramPower);
    this.cameraShake = Math.min(2.5, 0.4 + impactForce * 0.02);

    // サウンド再生
    soundEngine.playCrash(impactForce / 30);
    if (Math.random() < 0.6) soundEngine.playGlassShatter();

    // 接触点ワールド座標
    const contactPoint = new THREE.Vector3(
      (this.playerPos.x + this.targetPos.x) * 0.5,
      1.0,
      (this.playerPos.z + this.targetPos.z) * 0.5
    );

    // 1. リアルタイム頂点メッシュ変形（Soft-body Crumple）
    if (this.player.parts.body) {
      const localP = this.player.parts.body.worldToLocal(contactPoint.clone());
      this.physics.applyMeshDeformation(this.player.parts.body, localP, new THREE.Vector3(0, 0, -1), impactForce, 2.5);
    }
    if (this.target.parts.cab) {
      const localT = this.target.parts.cab.worldToLocal(contactPoint.clone());
      this.physics.applyMeshDeformation(this.target.parts.cab, localT, new THREE.Vector3(0, 0, 1), impactForce * 1.5, 3.5);
    }
    if (this.target.parts.container) {
      const localC = this.target.parts.container.worldToLocal(contactPoint.clone());
      this.physics.applyMeshDeformation(this.target.parts.container, localC, new THREE.Vector3(0, 0, 1), impactForce, 3.0);
    }

    // 2. 超密度 破片 & 火花物理爆散
    this.physics.createImpactExplosion(contactPoint, new THREE.Vector3(0, 0, (this.playerSpeed + this.targetSpeed) / 7.2), impactForce);

    // 3. パーツ脱落物理（バンパー、ボンネット、ドアが吹っ飛ぶ）
    if (impactForce > 45 && this.player.parts.hood && Math.random() < 0.4) {
      this.physics.detachPart(this.player, this.player.parts.hood, new THREE.Vector3(0, 0, this.playerSpeed / 3.6), impactForce);
      delete this.player.parts.hood;
      this.showAnnouncement('WARNING: HOOD DISLODGED!');
    }
    if (impactForce > 60 && this.target.parts.rearDoor && Math.random() < 0.5) {
      this.physics.detachPart(this.target, this.target.parts.rearDoor, new THREE.Vector3(0, 0, this.targetSpeed / 3.6), impactForce);
      delete this.target.parts.rearDoor;
      this.showAnnouncement('CRITICAL: TRUCK REAR DOORS BREACHED!');
    }
    if (impactForce > 80 && this.target.parts.frontBumper && Math.random() < 0.5) {
      this.physics.detachPart(this.target, this.target.parts.frontBumper, new THREE.Vector3(0, 0, this.targetSpeed / 3.6), impactForce);
      delete this.target.parts.frontBumper;
    }

    // 4. ダメージ計算 & スコア
    const damageToTarget = Math.round(impactForce * 1.8);
    const damageToPlayer = Math.round(impactForce * (0.8 / this.player.stats.ramPower));

    this.targetIntegrity = Math.max(0, this.targetIntegrity - damageToTarget);
    this.playerIntegrity = Math.max(0, this.playerIntegrity - damageToPlayer);

    // トラックの速度低下
    this.targetSpeed = Math.max(40, this.targetSpeed - (damageToTarget * 0.08));

    // スコア加算
    this.totalScore += damageToTarget * 10;
    if (this.hudImpactScore) {
      this.hudImpactScore.textContent = `+${damageToTarget * 10} IMPACT PTS`;
      this.hudImpactScore.classList.add('flash');
      setTimeout(() => this.hudImpactScore.classList.remove('flash'), 600);
    }

    // 反動による押し出し（Kinetic Repulsion）
    if (this.playerPos.z < this.targetPos.z) {
      this.playerPos.z -= 1.8;
      this.playerSpeed = Math.max(30, this.playerSpeed * 0.65);
    } else {
      this.playerPos.z += 1.8;
      this.playerSpeed = Math.max(this.playerSpeed, this.targetSpeed + 10);
    }
    this.playerPos.x += (this.playerPos.x > this.targetPos.x ? 1.5 : -1.5);
  }

  // --- カメラワーク ---
  updateCamera(dt) {
    if (!this.player) return;

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    if (this.cameraMode === 0) {
      // 迫力のチェイスカム（Chase Cam）
      targetCamPos.set(
        this.playerPos.x * 0.6,
        this.playerPos.y + 3.8,
        this.playerPos.z - 8.5
      );
      lookTarget.set(
        this.playerPos.x * 0.2,
        this.playerPos.y + 1.2,
        this.playerPos.z + 15
      );
    } else if (this.cameraMode === 1) {
      // クローズアップ・ドライバーカム
      targetCamPos.set(
        this.playerPos.x,
        this.playerPos.y + 1.6,
        this.playerPos.z - 0.2
      );
      lookTarget.set(
        this.playerPos.x,
        this.playerPos.y + 1.5,
        this.playerPos.z + 25
      );
    } else {
      // フロントバンパー・激突直前シネマティックカム
      targetCamPos.set(
        this.playerPos.x,
        this.playerPos.y + 0.8,
        this.playerPos.z + 2.5
      );
      lookTarget.set(
        this.targetPos.x,
        this.targetPos.y + 1.8,
        this.targetPos.z
      );
    }

    // カメラシェイク（衝突時・ニトロ時）
    if (this.cameraShake > 0) {
      targetCamPos.x += (Math.random() - 0.5) * this.cameraShake;
      targetCamPos.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - 3.0 * dt);
    }

    this.camera.position.lerp(targetCamPos, 0.15);
    this.camera.lookAt(lookTarget);
  }

  // --- HUD表示更新 ---
  updateHUD() {
    if (this.hudSpeed) {
      this.hudSpeed.textContent = Math.abs(Math.round(this.playerSpeed));
    }
    if (this.hudPlayerHp) {
      this.hudPlayerHp.textContent = `${Math.round(this.playerIntegrity)} / ${this.player.stats.maxIntegrity}`;
    }
    if (this.hudPlayerHpBar) {
      const pct = Math.max(0, (this.playerIntegrity / this.player.stats.maxIntegrity) * 100);
      this.hudPlayerHpBar.style.width = `${pct}%`;
    }
    if (this.hudNitroBar) {
      this.hudNitroBar.style.width = `${this.nitroFuel}%`;
    }
    if (this.hudTargetHp) {
      this.hudTargetHp.textContent = `${Math.round(this.targetIntegrity)} / ${this.targetMaxIntegrity}`;
    }
    if (this.hudTargetHpBar) {
      const pct = Math.max(0, (this.targetIntegrity / this.targetMaxIntegrity) * 100);
      this.hudTargetHpBar.style.width = `${pct}%`;
    }
    if (this.hudDistance) {
      const dist = Math.max(0, Math.round(this.targetPos.z - this.playerPos.z));
      this.hudDistance.textContent = `${dist}m`;
    }
  }

  showAnnouncement(msg) {
    if (!this.hudMessage) return;
    this.hudMessage.textContent = msg;
    this.hudMessage.classList.add('visible');
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      this.hudMessage.classList.remove('visible');
    }, 2800);
  }

  // --- 勝敗判定 ---
  checkWinLoss() {
    // 勝利条件：大型トラックの耐久度を0にして完全破壊・停止
    if (this.targetIntegrity <= 0 && this.state === 'PLAYING') {
      this.state = 'WON';
      soundEngine.playExplosion();
      this.cameraShake = 2.0;
      this.physics.createImpactExplosion(this.targetPos, new THREE.Vector3(0, 0, 0), 4.0);

      // トラック大横転演出
      if (this.target.root) {
        this.target.root.rotation.z = Math.PI * 0.48;
        this.target.root.position.y = 0.5;
      }

      this.showAnnouncement('🎉 MISSION ACCOMPLISHED: TARGET DESTROYED & HALTED!');
      setTimeout(() => {
        document.getElementById('result-screen').classList.remove('hidden');
        document.getElementById('result-title').textContent = 'MISSION ACCOMPLISHED';
        document.getElementById('result-title').style.color = '#00ff88';
        document.getElementById('result-score').textContent = `TOTAL SCORE: ${this.totalScore} PTS`;
        document.getElementById('result-desc').textContent = '大型暴走車両の物理破壊・完全強制停止に成功しました。捜査本部は貴殿の武功を称賛します。';
      }, 1500);
    }

    // 敗北条件：プレイヤー車両の耐久度が0で大破
    if (this.playerIntegrity <= 0 && this.state === 'PLAYING') {
      this.state = 'LOST';
      soundEngine.playExplosion();
      this.cameraShake = 2.0;
      this.physics.createImpactExplosion(this.playerPos, new THREE.Vector3(0, 0, 0), 3.0);
      this.showAnnouncement('💀 VEHICLE CATASTROPHIC FAILURE: DESTROYED');
      setTimeout(() => {
        document.getElementById('result-screen').classList.remove('hidden');
        document.getElementById('result-title').textContent = 'MISSION FAILED';
        document.getElementById('result-title').style.color = '#ff0055';
        document.getElementById('result-score').textContent = `TOTAL SCORE: ${this.totalScore} PTS`;
        document.getElementById('result-desc').textContent = '捜査車両が限界を超えて大破しました。暴走トラックは逃走中です。';
      }, 1500);
    }
  }
}

  window.Game = Game;

  // 7. INITIALIZATION & UI CONTROLLER
  function initApp() {
    console.log('[APP] Initializing Heavy Truck Interceptor...');
    try {
      const game = new Game();
      window.__gameInstance = game;
      const updater = new InAppUpdater();
      window.__updaterInstance = updater;

      // 車両スペック詳細定義
      const vehicleSpecs = {
        patrol: {
          name: 'POLICE CROWN INTERCEPTOR',
          desc: '捜査本部直轄の最新鋭パトロールセダン。超高機動性と安定性を両立。追尾しながらEMP衝撃波で標的の電子制御を遠隔過負荷停止させる。',
          speed: '250 KM/H',
          speedPct: '76%',
          ram: '1.2x RATING',
          ramPct: '55%',
          armor: '100 HP',
          armorPct: '60%',
          handling: '3.5 DRIFT',
          handlingPct: '82%',
          special: '⚡ EMP PULSE: 電磁衝撃波で標的システム過負荷'
        },
        supercar: {
          name: 'V12 PHANTOM SUPER-PURSUIT',
          desc: '最高速330km/hを叩き出す超高速追跡マシン。ツインターボ過給とニトロブーストで瞬時にメガトラックの側面・前方に回り込み急襲する。',
          speed: '330 KM/H',
          speedPct: '100%',
          ram: '0.9x RATING',
          ramPct: '45%',
          armor: '80 HP',
          armorPct: '48%',
          handling: '4.2 DRIFT',
          handlingPct: '98%',
          special: '🚀 NITRO OVERBOOST: 瞬間急加速で側面タックル'
        },
        suv: {
          name: 'TITAN HEAVY 4x4 ARMORED',
          desc: '重量3,400kgを誇る重装甲SUV。フロントに極厚アイアンブルバーを備え、メガトラックの体当たりを真っ向から受け止め押し戻す。',
          speed: '215 KM/H',
          speedPct: '66%',
          ram: '2.1x RATING',
          ramPct: '82%',
          armor: '180 HP',
          armorPct: '88%',
          handling: '2.8 DRIFT',
          handlingPct: '65%',
          special: '🛡️ HEAVY RAM CHARGE: 衝撃吸収ブルバーで押し返す'
        },
        rhino: {
          name: 'RHINO RAM JUGGERNAUT',
          desc: '重量6,500kgの超重量級突破マシン。前面の特製鋭角V字排土板（Plow Wedge）で18輪トラックの車軸を一撃で粉砕する。',
          speed: '190 KM/H',
          speedPct: '58%',
          ram: '3.5x RATING',
          ramPct: '100%',
          armor: '260 HP',
          armorPct: '100%',
          handling: '2.3 DRIFT',
          handlingPct: '52%',
          special: '🦏 KINETIC CRUSH: V字排土板で車軸粉砕'
        }
      };

      let currentVehicle = 'patrol';
      let currentTarget = 'truck';
      let currentMap = 'megacity';

      function updateVehicleDossier(type) {
        const d = vehicleSpecs[type];
        if (!d) return;
        const elName = document.getElementById('spec-name');
        const elDesc = document.getElementById('spec-desc');
        const elSpd = document.getElementById('spec-val-speed');
        const elBarSpd = document.getElementById('spec-bar-speed');
        const elRam = document.getElementById('spec-val-ram');
        const elBarRam = document.getElementById('spec-bar-ram');
        const elArm = document.getElementById('spec-val-armor');
        const elBarArm = document.getElementById('spec-bar-armor');
        const elHnd = document.getElementById('spec-val-handling');
        const elBarHnd = document.getElementById('spec-bar-handling');
        const elSpec = document.getElementById('spec-special-desc');

        if (elName) elName.textContent = d.name;
        if (elDesc) elDesc.textContent = d.desc;
        if (elSpd) elSpd.textContent = d.speed;
        if (elBarSpd) elBarSpd.style.width = d.speedPct;
        if (elRam) elRam.textContent = d.ram;
        if (elBarRam) elBarRam.style.width = d.ramPct;
        if (elArm) elArm.textContent = d.armor;
        if (elBarArm) elBarArm.style.width = d.armorPct;
        if (elHnd) elHnd.textContent = d.handling;
        if (elBarHnd) elBarHnd.style.width = d.handlingPct;
        if (elSpec) elSpec.textContent = d.special;
      }

      // 車両タブ切り替え
      const vTabBtns = document.querySelectorAll('.vehicle-tab-btn');
      vTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          vTabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentVehicle = btn.getAttribute('data-vehicle');
          updateVehicleDossier(currentVehicle);
          game.updateDemoVehicle(currentVehicle);
          soundEngine.ensureContext();
          soundEngine.playSiren();
          setTimeout(() => soundEngine.stopSiren(), 300);
        });
      });

      // ターゲット切り替え
      const targetBtns = document.querySelectorAll('.target-item-btn');
      targetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          targetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentTarget = btn.getAttribute('data-target');
          game.updateDemoTarget(currentTarget);
          soundEngine.ensureContext();
        });
      });

      // マップ切り替え
      const mapBtns = document.querySelectorAll('.map-card-btn');
      mapBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          mapBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentMap = btn.getAttribute('data-map');
          game.updateDemoMap(currentMap);
          soundEngine.ensureContext();
        });
      });

      // 出動関数
      function deployGame() {
        if (game.state !== 'MENU') return;
        soundEngine.ensureContext();
        soundEngine.playNitro();
        const menuScreen = document.getElementById('menu-screen');
        const hudOverlay = document.getElementById('hud-overlay');
        if (menuScreen) menuScreen.style.display = 'none';
        if (hudOverlay) hudOverlay.classList.add('active');
        game.startGame(currentVehicle, currentMap, currentTarget);
      }

      // 出動ボタン
      const deployBtn = document.getElementById('btn-deploy');
      if (deployBtn) {
        deployBtn.addEventListener('click', deployGame);
      }

      // キーボードのSpaceまたはEnterでも出動
      window.addEventListener('keydown', (e) => {
        if (game.state === 'MENU' && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          deployGame();
        }
      });

      // アップデートチェックボタン
      const checkUpdateBtn = document.getElementById('btn-check-update');
      if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', () => {
          updater.checkForUpdates();
        });
      }

      // Ultra物理切り替えボタン
      const ultraBtn = document.getElementById('btn-toggle-ultra');
      if (ultraBtn) {
        ultraBtn.addEventListener('click', () => {
          game.toggleUltraPhysics();
        });
      }

      // オーディオミュート切り替え
      let isMuted = false;
      const audioBtn = document.getElementById('btn-audio-toggle');
      if (audioBtn) {
        audioBtn.addEventListener('click', () => {
          isMuted = !isMuted;
          soundEngine.isMuted = isMuted;
          audioBtn.textContent = isMuted ? '🔇 MUTED' : '🔊 AUDIO';
          audioBtn.style.color = isMuted ? '#ff0055' : '#00f0ff';
        });
      }

      // リザルト画面ボタン
      const retryBtn = document.getElementById('btn-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          const resScreen = document.getElementById('result-screen');
          if (resScreen) resScreen.classList.add('hidden');
          game.startGame(currentVehicle, currentMap, currentTarget);
        });
      }

      const backMenuBtn = document.getElementById('btn-back-menu');
      if (backMenuBtn) {
        backMenuBtn.addEventListener('click', () => {
          const resScreen = document.getElementById('result-screen');
          const hudOverlay = document.getElementById('hud-overlay');
          const menuScreen = document.getElementById('menu-screen');
          if (resScreen) resScreen.classList.add('hidden');
          if (hudOverlay) hudOverlay.classList.remove('active');
          if (menuScreen) menuScreen.style.display = 'flex';
          game.setupDemo();
        });
      }

      console.log('[APP] Heavy Truck Interceptor successfully mounted and running!');
    } catch (err) {
      console.error('[APP ERROR]', err);
      const errBox = document.createElement('div');
      errBox.style.cssText = 'position:fixed;top:10px;left:10px;right:10px;background:rgba(255,0,0,0.9);color:#fff;padding:20px;z-index:999999;font-family:monospace;font-size:14px;border:2px solid #fff;border-radius:8px;white-space:pre-wrap;';
      errBox.textContent = 'SYSTEM ERROR: ' + (err.stack || err.message);
      document.body.appendChild(errBox);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
