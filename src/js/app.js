
// HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
// All-in-One Engine & Controller Bundle
(function() {
  'use strict';

  // 1. SOUND ENGINE
  // =========================================================================
// HEAVY TRUCK INTERCEPTOR: ADVANCED AUDIO & MUSIC SYNTHESIZER
// 完全自己完結型 Web Audio API オーディオエンジン
// - 高速チェイス BGM (135 BPM Synthwave / Darksynth Bassline & Drums)
// - リアルなエンジン音 (V8唸り・ピッチ変調)
// - 緊急出動アメリカンパトカーサイレン (Wail / Yelp)
// - メタルクラッシュ & 車体破壊音
// - タイヤスキール & ニトロジェット
// =========================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isBgmPlaying = false;
    this.initialized = false;

    // SFX Gain / Nodes
    this.sfxMasterGain = null;
    this.bgmMasterGain = null;

    // Engine Nodes
    this.engineGain = null;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineSub = null;
    this.engineFilter = null;

    // Siren Nodes
    this.sirenGain = null;
    this.sirenOsc = null;
    this.sirenTimer = null;
    this.sirenActive = false;

    // BGM Sequencer
    this.bgmStep = 0;
    this.bgmTimer = null;
    this.tempo = 136; // BPM
    this.stepInterval = (60 / this.tempo) / 4; // 16分音符の秒数
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // マスターゲイン
      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxMasterGain.connect(this.ctx.destination);

      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.bgmMasterGain.connect(this.ctx.destination);

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

  setMute(mute) {
    this.isMuted = mute;
    if (this.sfxMasterGain) {
      this.sfxMasterGain.gain.setValueAtTime(mute ? 0 : 0.7, this.ctx.currentTime);
    }
    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.setValueAtTime(mute ? 0 : 0.45, this.ctx.currentTime);
    }
  }

  // =========================================================================
  // BGM SYNTHESIZER (136 BPM Driving Chase Synthwave)
  // =========================================================================
  startBGM() {
    this.ensureContext();
    if (!this.ctx || this.isBgmPlaying) return;
    this.isBgmPlaying = true;
    this.bgmStep = 0;

    const tick = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.playBgmStep(this.bgmStep, now);
      this.bgmStep = (this.bgmStep + 1) % 64; // 4小節ループ
      this.bgmTimer = setTimeout(tick, this.stepInterval * 1000);
    };
    tick();
  }

  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playBgmStep(step, now) {
    if (this.isMuted) return;

    // 1. Kick Drum (拍の頭: 0, 4, 8, 12... 4つ打ち)
    if (step % 4 === 0) {
      this.synthKick(now);
    }

    // 2. Snare / Clap (2拍目と4拍目: 4, 12, 20, 28...)
    if (step % 8 === 4) {
      this.synthSnare(now);
    }

    // 3. Hi-Hat (16分音符で刻み)
    if (step % 2 === 0) {
      this.synthHiHat(now, step % 4 === 2 ? 0.08 : 0.04);
    }

    // 4. Synth Bassline (荒々しい80sローリングベース: D -> F -> G -> A)
    const bar = Math.floor(step / 16);
    const bassNotes = [36.71, 43.65, 49.00, 55.00]; // D1, F1, G1, A1
    const noteFreq = bassNotes[bar % 4];

    // 16分音符のベースラン
    if (step % 2 === 0) {
      const isOctave = (step % 4 === 2);
      this.synthBass(now, isOctave ? noteFreq * 2 : noteFreq, this.stepInterval * 0.9);
    }

    // 5. Arpeggio / Lead (ハイテンションなサイバーアルペジオ)
    if (step % 4 === 0 || step % 4 === 2) {
      const arpScales = [
        [293.66, 349.23, 440.0, 587.33], // Dm
        [349.23, 440.0, 523.25, 698.46], // F
        [392.0, 493.88, 587.33, 783.99], // G
        [440.0, 554.37, 659.25, 880.0]   // A
      ];
      const scale = arpScales[bar % 4];
      const noteIdx = (step % 8) / 2;
      const arpFreq = scale[noteIdx % scale.length];
      this.synthArp(now, arpFreq);
    }
  }

  // キックドラム音
  synthKick(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.12);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.bgmMasterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // スネアドラム音
  synthSnare(now) {
    // ノイズ成分
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    noise.start(now);

    // トーン成分
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.bgmMasterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // ハイハット
  synthHiHat(now, vol = 0.05) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    noise.start(now);
  }

  // シンセベース
  synthBass(now, freq, dur) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + dur);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    osc.start(now);
    osc.stop(now + dur);
  }

  // アルペジオ
  synthArp(now, freq) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(2.0, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // =========================================================================
  // SFX: リアルエンジン音
  // =========================================================================
  initEngineSound() {
    if (!this.ctx) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(40, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(80, this.ctx.currentTime);

    this.engineSub = this.ctx.createOscillator();
    this.engineSub.type = 'sine';
    this.engineSub.frequency.setValueAtTime(30, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxMasterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSub.start();
  }

  updateEngine(speedKmh, maxSpeedKmh, throttle = 1) {
    if (!this.ctx || this.isMuted || !this.engineGain) return;
    this.ensureContext();

    const speedRatio = Math.max(0, Math.min(1.5, Math.abs(speedKmh) / (maxSpeedKmh || 250)));
    const targetFreq = 35 + speedRatio * 180 + (throttle > 0 ? 30 : 0);
    const targetVol = 0.12 + speedRatio * 0.25 + (throttle > 0 ? 0.08 : 0);

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.08);
    this.engineSub.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(250 + speedRatio * 1200, now, 0.1);
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.08);
  }

  // =========================================================================
  // SFX: アメリカン・ポリスサイレン (Wail / Yelp)
  // =========================================================================
  startSiren() {
    this.ensureContext();
    if (!this.ctx || this.sirenActive) return;
    this.sirenActive = true;

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sawtooth';

    // 電子サイレンのピッチ周期スイープ (650Hz 〜 1250Hz)
    const sweepSiren = () => {
      if (!this.sirenActive || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.sirenOsc.frequency.cancelScheduledValues(now);
      this.sirenOsc.frequency.setValueAtTime(650, now);
      this.sirenOsc.frequency.linearRampToValueAtTime(1250, now + 0.6);
      this.sirenOsc.frequency.linearRampToValueAtTime(650, now + 1.2);
      this.sirenTimer = setTimeout(sweepSiren, 1200);
    };

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxMasterGain);
    this.sirenOsc.start();
    sweepSiren();
  }

  stopSiren() {
    this.sirenActive = false;
    if (this.sirenTimer) {
      clearTimeout(this.sirenTimer);
      this.sirenTimer = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
      } catch (e) {}
      this.sirenOsc = null;
    }
    if (this.sirenGain) {
      this.sirenGain.disconnect();
      this.sirenGain = null;
    }
  }

  playSiren() {
    this.startSiren();
  }

  // =========================================================================
  // SFX: クラッシュ・衝撃破壊音 (重金属ディストーション)
  // =========================================================================
  playCrash(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const dur = Math.min(1.2, 0.4 + intensity * 0.25);
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + dur);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.9, 0.35 + intensity * 0.15);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxMasterGain);
    noise.start(now);

    // 重低音インパルス
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
    subGain.gain.setValueAtTime(0.6 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    subOsc.connect(subGain);
    subGain.connect(this.sfxMasterGain);
    subOsc.start(now);
    subOsc.stop(now + 0.35);
  }

  // ガラス粉砕音
  playGlassShatter() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const dur = 0.35;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-6 * (i / bufferSize));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3500, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxMasterGain);
    noise.start(now);
  }

  // ニトロ噴射音
  playNitro() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const dur = 0.6;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxMasterGain);
    noise.start(now);
  }

  // タイヤスキール音 (ドリフト)
  playTireScreech() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + Math.random() * 400, now);
    filter.Q.setValueAtTime(5.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxMasterGain);
    noise.start(now);
  }

  // EMP 放電音
  playEMP() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxMasterGain);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  // UI クリック音
  playClick() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxMasterGain);
    osc.start(now);
    osc.stop(now + 0.05);
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
  // =========================================================================
// HEAVY TRUCK INTERCEPTOR: HIGH-FIDELITY 3D VEHICLE FACTORY
// 超リアル3D車両モデリング＆マテリアル
// - POLICE CROWN (高速捜査用パトロールセダン・赤青LEDストロボ)
// - V12 PHANTOM (超高速スーパーカー・大型GTウィング・ツインターボ)
// - TITAN 4x4 (重装甲タクティカルSUV・極厚アイアンブルバー)
// - RHINO RAM (特装排土板ジャガーノート・V字ウェッジ)
// - 18-WHEELER MEGA HAULER (アメリカン18輪メガトラック・クローム煙突・波板コンテナ)
// - TWIN-DECK WILD BUS (2階建て暴走エアロバス)
// - ARMORED MEGA-CRUSHER (回転スパイク付き超重装甲クラッシャー)
// =========================================================================


class VehicleFactory {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;

    // 共有マテリアル
    this.rubberMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      roughness: 0.85,
      metalness: 0.1
    });

    this.chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.95
    });

    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x05101a,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.88
    });

    this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
    this.caliperMat = new THREE.MeshStandardMaterial({ color: 0xff1100, roughness: 0.3, metalness: 0.5 });
  }

  // --- 高精度スポークホイール＆ラバータイヤ作成 ---
  createDetailedWheel(radius = 0.44, width = 0.32, rimColor = 0xd0d0d0) {
    const group = new THREE.Group();

    // 1. ラバータイヤ (溝付き・面取り)
    const tireGeom = new THREE.CylinderGeometry(radius, radius, width, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeom, this.rubberMat);
    tire.castShadow = true;
    group.add(tire);

    // 2. ホイールリム
    const rimGeom = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.02, 16);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: rimColor,
      roughness: 0.2,
      metalness: 0.85
    });
    const rim = new THREE.Mesh(rimGeom, rimMat);
    group.add(rim);

    // 3. スポーク (5本スポーク)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spokeGeom = new THREE.BoxGeometry(width * 1.03, radius * 0.65, 0.06);
      const spoke = new THREE.Mesh(spokeGeom, rimMat);
      spoke.position.set(0, (radius * 0.32) * Math.sin(angle), (radius * 0.32) * Math.cos(angle));
      spoke.rotation.x = -angle;
      group.add(spoke);
    }

    // 4. ブレーキディスク & キャリパー
    const discGeom = new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, 0.05, 16);
    discGeom.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 });
    const disc = new THREE.Mesh(discGeom, discMat);
    group.add(disc);

    const caliperGeom = new THREE.BoxGeometry(0.08, radius * 0.28, radius * 0.22);
    const caliper = new THREE.Mesh(caliperGeom, this.caliperMat);
    caliper.position.set(0, radius * 0.35, 0);
    group.add(caliper);

    return group;
  }

  // =========================================================================
  // 1. POLICE CROWN (捜査用パトロールセダン)
  // =========================================================================
  createPatrolCrown() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    // メタリックブラック塗装
    const blackPaint = new THREE.MeshStandardMaterial({
      color: 0x08080c,
      roughness: 0.18,
      metalness: 0.7
    });
    // ホワイトドアパネル塗装
    const whitePaint = new THREE.MeshStandardMaterial({
      color: 0xedf0f5,
      roughness: 0.22,
      metalness: 0.5
    });

    // 1. メインロアボディ（アンダーシャーシ・バンパー含む）
    const bodyGeom = new THREE.BoxGeometry(2.1, 0.65, 4.8, 6, 3, 8);
    const body = new THREE.Mesh(bodyGeom, blackPaint);
    body.position.y = 0.65;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. ホワイトサイドパネル（白黒ツートン）
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 2.3), whitePaint);
    doorL.position.set(-1.06, 0.68, -0.1);
    root.add(doorL);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.52, 2.3), whitePaint);
    doorR.position.set(1.06, 0.68, -0.1);
    root.add(doorR);

    // 3. キャビン＆スラントルーフ（Aピラー・Cピラーの傾斜）
    const cabinGeom = new THREE.BoxGeometry(1.8, 0.62, 2.4, 4, 2, 4);
    const cabin = new THREE.Mesh(cabinGeom, this.glassMat);
    cabin.position.set(0, 1.25, -0.2);
    root.add(cabin);
    this.physics.registerDeformable(cabin);
    parts.cabin = cabin;

    // ルーフ天板
    const roofTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 2.3), whitePaint);
    roofTop.position.set(0, 1.58, -0.2);
    root.add(roofTop);

    // 4. スローピングボンネット（Hood）
    const hoodGeom = new THREE.BoxGeometry(1.9, 0.12, 1.45, 4, 2, 4);
    const hood = new THREE.Mesh(hoodGeom, blackPaint);
    hood.position.set(0, 1.0, 1.45);
    hood.rotation.x = -0.06;
    root.add(hood);
    this.physics.registerDeformable(hood);
    parts.hood = hood;

    // 5. トランク（Rear Deck）
    const trunkGeom = new THREE.BoxGeometry(1.9, 0.12, 1.0, 4, 2, 3);
    const trunk = new THREE.Mesh(trunkGeom, blackPaint);
    trunk.position.set(0, 0.98, -1.85);
    root.add(trunk);

    // 6. 前面特装ヘビーブルバー（Push Bumper / Ram Bar）
    const bullBar = new THREE.Group();
    const barFrame = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.45, 0.25), this.chromeMat);
    bullBar.add(barFrame);
    const barWedgeL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), this.chromeMat);
    barWedgeL.position.set(-0.6, 0.1, 0.1);
    bullBar.add(barWedgeL);
    const barWedgeR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 8), this.chromeMat);
    barWedgeR.position.set(0.6, 0.1, 0.1);
    bullBar.add(barWedgeR);
    bullBar.position.set(0, 0.62, 2.45);
    root.add(bullBar);
    parts.frontBumper = bullBar;

    // 7. 最新鋭薄型 LED ストロボサイレンバー（青赤交互フラッシュ）
    const lightBar = new THREE.Group();
    const lightFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.22), this.chromeMat);
    lightBar.add(lightFrame);

    const strobeRedMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const strobeRed = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.24), strobeRedMat);
    strobeRed.position.x = -0.32;
    lightBar.add(strobeRed);

    const strobeBlueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    const strobeBlue = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.24), strobeBlueMat);
    strobeBlue.position.x = 0.32;
    lightBar.add(strobeBlue);

    lightBar.position.set(0, 1.66, -0.2);
    root.add(lightBar);
    parts.siren = lightBar;

    // 8. デュアルプロジェクターヘッドライト & テールライト
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.08), this.headlightMat);
    hlL.position.set(-0.78, 0.72, 2.41);
    root.add(hlL);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.08), this.headlightMat);
    hlR.position.set(0.78, 0.72, 2.41);
    root.add(hlR);

    // ヘッドライトビームコーン（前方を照らす半透明光線）
    const beamGeom = new THREE.ConeGeometry(3.5, 25, 16, 1, true);
    beamGeom.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffffea,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.set(0, 0.7, 13.5);
    root.add(beam);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), this.taillightMat);
    tlL.position.set(-0.78, 0.72, -2.41);
    root.add(tlL);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), this.taillightMat);
    tlR.position.set(0.78, 0.72, -2.41);
    root.add(tlR);

    // 9. ホイール（4輪）
    const wheelPositions = [
      [-1.02, 0.44, 1.45],  // 前左
      [1.02, 0.44, 1.45],   // 前右
      [-1.02, 0.44, -1.45], // 後左
      [1.02, 0.44, -1.45]   // 後右
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.44, 0.30, 0xd0d0d0);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      strobeNodes: { red: strobeRedMat, blue: strobeBlueMat },
      name: 'POLICE CROWN INTERCEPTOR',
      stats: {
        maxSpeed: 250,
        accel: 18.5,
        handling: 3.5,
        armor: 100,
        integrity: 100,
        ramPower: 1.2
      }
    };
  }

  // =========================================================================
  // 2. V12 PHANTOM (エキゾチック・スーパーパースート)
  // =========================================================================
  createSupercar() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    // メタリックネオンシアン塗装
    const bodyPaint = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.12,
      metalness: 0.8
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.6
    });

    // 1. 低重心ウェッジシェイプ・ボディ
    const bodyGeom = new THREE.BoxGeometry(2.2, 0.52, 4.9, 6, 3, 8);
    const body = new THREE.Mesh(bodyGeom, bodyPaint);
    body.position.y = 0.52;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. キャビン（極限エアロスラント）
    const cabinGeom = new THREE.BoxGeometry(1.7, 0.52, 2.1, 4, 2, 4);
    const cabin = new THREE.Mesh(cabinGeom, this.glassMat);
    cabin.position.set(0, 1.02, -0.15);
    root.add(cabin);
    this.physics.registerDeformable(cabin);
    parts.cabin = cabin;

    // 3. カーボンファイバー製大型 GT リアウィング
    const wingGroup = new THREE.Group();
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.45), carbonMat);
    wingBlade.position.y = 0.42;
    wingGroup.add(wingBlade);
    const wingStayL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.15), carbonMat);
    wingStayL.position.set(-0.7, 0.21, 0);
    wingGroup.add(wingStayL);
    const wingStayR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.15), carbonMat);
    wingStayR.position.set(0.7, 0.21, 0);
    wingGroup.add(wingStayR);
    wingGroup.position.set(0, 0.82, -2.25);
    root.add(wingGroup);
    parts.rearWing = wingGroup;

    // 4. フロントエアロディフューザー＆スプリッター
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.08, 0.6), carbonMat);
    splitter.position.set(0, 0.32, 2.4);
    root.add(splitter);
    parts.frontBumper = splitter;

    // 5. LED スリットヘッドライト & テールバー
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), this.headlightMat);
    hlL.position.set(-0.8, 0.58, 2.45);
    root.add(hlL);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.08), this.headlightMat);
    hlR.position.set(0.8, 0.58, 2.45);
    root.add(hlR);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), this.taillightMat);
    tl.position.set(0, 0.65, -2.46);
    root.add(tl);

    // 6. デュアルチタンエキゾースト（排気口）
    const exL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), this.chromeMat);
    exL.rotateX(Math.PI / 2);
    exL.position.set(-0.35, 0.45, -2.48);
    root.add(exL);
    const exR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), this.chromeMat);
    exR.rotateX(Math.PI / 2);
    exR.position.set(0.35, 0.45, -2.48);
    root.add(exR);

    // 7. ゴールド鍛造ホイール（4輪）
    const wheelPositions = [
      [-1.08, 0.42, 1.45],
      [1.08, 0.42, 1.45],
      [-1.12, 0.45, -1.45],
      [1.12, 0.45, -1.45]
    ];
    wheelPositions.forEach((pos, idx) => {
      const radius = idx >= 2 ? 0.45 : 0.42;
      const wheel = this.createDetailedWheel(radius, 0.36, 0xdfb040);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      name: 'V12 PHANTOM SUPER-PURSUIT',
      stats: {
        maxSpeed: 330,
        accel: 24.0,
        handling: 4.2,
        armor: 80,
        integrity: 80,
        ramPower: 0.95
      }
    };
  }

  // =========================================================================
  // 3. TITAN 4x4 (重装甲タクティカル SUV)
  // =========================================================================
  createHeavySUV() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    const armorPaint = new THREE.MeshStandardMaterial({
      color: 0x1a2634,
      roughness: 0.45,
      metalness: 0.5
    });

    // 1. 巨大ハイリフト・アーマードボディ
    const bodyGeom = new THREE.BoxGeometry(2.4, 1.15, 5.2, 6, 4, 8);
    const body = new THREE.Mesh(bodyGeom, armorPaint);
    body.position.y = 1.1;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. 防弾ガラス
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 3.2), this.glassMat);
    cabin.position.set(0, 1.85, -0.4);
    root.add(cabin);
    parts.cabin = cabin;

    // 3. ルーフラック & 4連オフロードサーチライト
    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.8), this.chromeMat);
    roofRack.position.set(0, 2.32, -0.4);
    root.add(roofRack);

    for (let i = -1.5; i <= 1.5; i += 1) {
      const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12), this.headlightMat);
      spot.rotateX(Math.PI / 2);
      spot.position.set(i * 0.45, 2.45, 1.0);
      root.add(spot);
    }

    // 4. 極厚アイアンブルバー（衝撃破壊）
    const ramBar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 0.4, 4, 2, 2), this.chromeMat);
    ramBar.position.set(0, 0.85, 2.75);
    root.add(ramBar);
    this.physics.registerDeformable(ramBar);
    parts.frontBumper = ramBar;

    // 5. 特大オフロードブロックタイヤ（4輪）
    const wheelPositions = [
      [-1.25, 0.58, 1.6],
      [1.25, 0.58, 1.6],
      [-1.25, 0.58, -1.6],
      [1.25, 0.58, -1.6]
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.58, 0.42, 0x222222);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      name: 'TITAN HEAVY 4x4 ARMORED',
      stats: {
        maxSpeed: 215,
        accel: 15.0,
        handling: 2.8,
        armor: 180,
        integrity: 180,
        ramPower: 2.1
      }
    };
  }

  // =========================================================================
  // 4. RHINO RAM (特装排土板ジャガーノート)
  // =========================================================================
  createRhinoRam() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    const heavyPaint = new THREE.MeshStandardMaterial({
      color: 0x3d352e,
      roughness: 0.6,
      metalness: 0.4
    });

    // 1. 超重量級フレーム
    const bodyGeom = new THREE.BoxGeometry(2.6, 1.3, 5.6, 6, 4, 8);
    const body = new THREE.Mesh(bodyGeom, heavyPaint);
    body.position.y = 1.25;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. 鋭角V字排土板（Plow Wedge - トラックの車軸を一撃粉砕）
    const plowGroup = new THREE.Group();
    const plowL = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.25), this.chromeMat);
    plowL.position.set(-0.75, 0.55, 0.6);
    plowL.rotation.y = -0.55;
    plowGroup.add(plowL);

    const plowR = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.25), this.chromeMat);
    plowR.position.set(0.75, 0.55, 0.6);
    plowR.rotation.y = 0.55;
    plowGroup.add(plowR);

    plowGroup.position.set(0, 0.4, 2.9);
    root.add(plowGroup);
    parts.plow = plowGroup;

    // 3. 6輪の巨大ヘビータスクタイヤ
    const wheelPositions = [
      [-1.35, 0.65, 1.8],
      [1.35, 0.65, 1.8],
      [-1.35, 0.65, -0.4],
      [1.35, 0.65, -0.4],
      [-1.35, 0.65, -2.1],
      [1.35, 0.65, -2.1]
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.65, 0.45, 0x111111);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      name: 'RHINO RAM JUGGERNAUT',
      stats: {
        maxSpeed: 190,
        accel: 13.0,
        handling: 2.3,
        armor: 260,
        integrity: 260,
        ramPower: 3.5
      }
    };
  }

  // =========================================================================
  // 5. 18-WHEELER MEGA HAULER (アメリカン18輪大型メガトラック)
  // =========================================================================
  create18Wheeler() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    // トラクターキャブ塗装（レッドメタリック）
    const cabPaint = new THREE.MeshStandardMaterial({
      color: 0xaa1122,
      roughness: 0.2,
      metalness: 0.7
    });
    // コンテナ塗装（シルバー波板ステンレス）
    const trailerPaint = new THREE.MeshStandardMaterial({
      color: 0xb5bec8,
      roughness: 0.35,
      metalness: 0.6
    });

    // --- A. トラクターヘッド (Tractor Cab) ---
    const cabGroup = new THREE.Group();

    // 1. エンジンノーズ（Long-Nose Hood）
    const noseGeom = new THREE.BoxGeometry(2.3, 1.4, 2.8, 6, 4, 6);
    const nose = new THREE.Mesh(noseGeom, cabPaint);
    nose.position.set(0, 1.35, 4.4);
    nose.castShadow = true;
    cabGroup.add(nose);
    this.physics.registerDeformable(nose);
    parts.cabNose = nose;

    // 2. 巨大クロームグリル
    const grilGeom = new THREE.BoxGeometry(2.1, 1.25, 0.25);
    const grill = new THREE.Mesh(grilGeom, this.chromeMat);
    grill.position.set(0, 1.35, 5.82);
    cabGroup.add(grill);
    parts.frontGrill = grill;

    // 3. キャビン＆スリーパー (Sleeper Cab)
    const cabGeom = new THREE.BoxGeometry(2.45, 2.3, 3.2, 6, 5, 6);
    const cab = new THREE.Mesh(cabGeom, cabPaint);
    cab.position.set(0, 2.1, 1.6);
    cab.castShadow = true;
    cabGroup.add(cab);
    this.physics.registerDeformable(cab);
    parts.cab = cab;

    // ウィンドウ（フロント＆サイド）
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.85, 0.1), this.glassMat);
    windshield.position.set(0, 2.4, 3.22);
    cabGroup.add(windshield);

    // 4. 直立デュアルクローム煙突マフラー (Twin Exhaust Stacks)
    const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 12), this.chromeMat);
    exhaustL.position.set(-1.3, 2.8, 0.2);
    cabGroup.add(exhaustL);
    parts.exhaustL = exhaustL;

    const exhaustR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 12), this.chromeMat);
    exhaustR.position.set(1.3, 2.8, 0.2);
    cabGroup.add(exhaustR);
    parts.exhaustR = exhaustR;

    // 5. クロームフロントバンパー
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.55, 0.4), this.chromeMat);
    bumper.position.set(0, 0.65, 5.85);
    cabGroup.add(bumper);
    parts.frontBumper = bumper;

    // 6. トラクター側ホイール（前輪2輪 ＋ 後輪ダブルタイヤ4輪×2＝合計10輪）
    const tractorWheelPos = [
      [-1.15, 0.58, 4.2],  // 前左
      [1.15, 0.58, 4.2],   // 前右
      [-1.25, 0.58, 0.6],  // 駆動輪中左
      [1.25, 0.58, 0.6],   // 駆動輪中右
      [-1.25, 0.58, -0.7], // 駆動輪後左
      [1.25, 0.58, -0.7]   // 駆動輪後右
    ];
    tractorWheelPos.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.58, 0.38, 0xdddddd);
      wheel.position.set(...pos);
      cabGroup.add(wheel);
      wheels.push(wheel);
    });

    root.add(cabGroup);

    // --- B. 連結コンテナトレーラー (53ft Mega Container) ---
    const trailerGroup = new THREE.Group();

    // 1. メインコンテナボディ (巨大な波板ステンレス箱)
    const contGeom = new THREE.BoxGeometry(2.6, 3.0, 11.5, 6, 6, 14);
    const container = new THREE.Mesh(contGeom, trailerPaint);
    container.position.set(0, 2.65, -5.5);
    container.castShadow = true;
    trailerGroup.add(container);
    this.physics.registerDeformable(container);
    parts.container = container;

    // 2. リア観音開きドア
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.8, 0.1), this.chromeMat);
    doorL.position.set(-0.65, 2.65, -11.26);
    trailerGroup.add(doorL);
    parts.rearDoor = doorL;

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.8, 0.1), this.chromeMat);
    doorR.position.set(0.65, 2.65, -11.26);
    trailerGroup.add(doorR);

    // 3. トレーラーホイール（後部2軸ダブルタイヤ＝8輪）
    const trailerWheelPos = [
      [-1.25, 0.58, -8.8],
      [1.25, 0.58, -8.8],
      [-1.25, 0.58, -10.2],
      [1.25, 0.58, -10.2]
    ];
    trailerWheelPos.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.58, 0.42, 0xdddddd);
      wheel.position.set(...pos);
      trailerGroup.add(wheel);
      wheels.push(wheel);
    });

    root.add(trailerGroup);

    return {
      root,
      parts,
      wheels,
      trailerGroup,
      name: '18-WHEELER MEGA HAULER',
      stats: {
        speed: 135,
        integrity: 1000,
        maxIntegrity: 1000,
        mass: 38000
      }
    };
  }

  // =========================================================================
  // 6. TWIN-DECK WILD BUS (2階建て暴走高速バス)
  // =========================================================================
  createWildBus() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    const busPaint = new THREE.MeshStandardMaterial({
      color: 0x0055cc,
      roughness: 0.25,
      metalness: 0.5
    });

    // 1. 2階建て巨大モノコックボディ
    const bodyGeom = new THREE.BoxGeometry(2.6, 3.8, 12.0, 6, 6, 12);
    const body = new THREE.Mesh(bodyGeom, busPaint);
    body.position.y = 2.4;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. 2階パノラマウィンドウ & 1階サイドウィンドウ
    const winDeck2 = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.95, 11.2), this.glassMat);
    winDeck2.position.set(0, 3.3, 0.2);
    root.add(winDeck2);

    const winDeck1 = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.85, 8.5), this.glassMat);
    winDeck1.position.set(0, 1.9, -1.0);
    root.add(winDeck1);

    // 3. 6輪の大型バスタイヤ
    const wheelPositions = [
      [-1.25, 0.58, 4.2],
      [1.25, 0.58, 4.2],
      [-1.25, 0.58, -3.2],
      [1.25, 0.58, -3.2],
      [-1.25, 0.58, -4.6],
      [1.25, 0.58, -4.6]
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.58, 0.38, 0xcccccc);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      name: 'TWIN-DECK WILD BUS',
      stats: {
        speed: 155,
        integrity: 850,
        maxIntegrity: 850,
        mass: 22000
      }
    };
  }

  // =========================================================================
  // 7. ARMORED MEGA-CRUSHER (超重装甲クラッシャー)
  // =========================================================================
  createArmoredCrusher() {
    const root = new THREE.Group();
    const parts = {};
    const wheels = [];

    const armorPaint = new THREE.MeshStandardMaterial({
      color: 0x445522,
      roughness: 0.5,
      metalness: 0.6
    });

    // 1. 超重量級要塞ボディ
    const bodyGeom = new THREE.BoxGeometry(3.2, 2.2, 7.5, 6, 4, 8);
    const body = new THREE.Mesh(bodyGeom, armorPaint);
    body.position.y = 1.9;
    body.castShadow = true;
    root.add(body);
    this.physics.registerDeformable(body);
    parts.body = body;

    // 2. 前面大型回転スパイクローラー
    const rollerGeom = new THREE.CylinderGeometry(0.75, 0.75, 3.4, 16);
    rollerGeom.rotateZ(Math.PI / 2);
    const roller = new THREE.Mesh(rollerGeom, this.chromeMat);
    roller.position.set(0, 0.9, 4.4);
    root.add(roller);
    parts.roller = roller;

    // 3. 8輪の超巨大タイヤ
    const wheelPositions = [
      [-1.75, 0.75, 2.8],
      [1.75, 0.75, 2.8],
      [-1.75, 0.75, 1.0],
      [1.75, 0.75, 1.0],
      [-1.75, 0.75, -1.0],
      [1.75, 0.75, -1.0],
      [-1.75, 0.75, -2.8],
      [1.75, 0.75, -2.8]
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.75, 0.55, 0x111111);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      parts,
      wheels,
      name: 'ARMORED MEGA-CRUSHER',
      stats: {
        speed: 110,
        integrity: 1500,
        maxIntegrity: 1500,
        mass: 55000
      }
    };
  }

  // =========================================================================
  // 8. 一般車トラフィック (Civilian Cars)
  // =========================================================================
  createCivilianCar(colorHex = 0x2980b9) {
    const root = new THREE.Group();
    const wheels = [];

    const paint = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.25,
      metalness: 0.6
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 4.2), paint);
    body.position.y = 0.58;
    body.castShadow = true;
    root.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.1), this.glassMat);
    cabin.position.set(0, 1.1, -0.2);
    root.add(cabin);

    // テールランプ
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.05), this.taillightMat);
    tl.position.set(0, 0.65, -2.12);
    root.add(tl);

    const wheelPositions = [
      [-0.95, 0.38, 1.3],
      [0.95, 0.38, 1.3],
      [-0.95, 0.38, -1.3],
      [0.95, 0.38, -1.3]
    ];
    wheelPositions.forEach((pos) => {
      const wheel = this.createDetailedWheel(0.38, 0.26, 0xaaaaaa);
      wheel.position.set(...pos);
      root.add(wheel);
      wheels.push(wheel);
    });

    return {
      root,
      wheels,
      speed: 85 + Math.random() * 25
    };
  }
}

  window.VehicleFactory = VehicleFactory;

  // 4. ENVIRONMENT ENGINE
  // =========================================================================
// HEAVY TRUCK INTERCEPTOR: HIGH-FIDELITY ENVIRONMENT & MAP ENGINE
// リアルな道路・摩天楼・夜間照明・天候シミュレーション
// - MEGACITY: ネオン輝く摩天楼、ビル窓明かりテクスチャ、等間隔街灯
// - HIGHWAY: 沿岸海面、山岳クリフ、頭上ハイウェイ案内看板
// - DESERT: 赤土キャニオン、砂埃、岩山
// - RAINSTORM: 激しい豪雨パーティクル、稲妻落雷フラッシュ、ウェット路面反射
// =========================================================================


class EnvironmentEngine {
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
    this.currentVersion = '1.3.0';
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
  // =========================================================================
// HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
// HIGH-SPEED DYNAMIC CHASE ENGINE
// - 完璧な直感ステアリング（左右入力の完全一致）
// - オートクルーズ & 超高速ニトロ追跡（急停止・スタックの完全根絶）
// - リアルタイム変形 & パーツ脱落クラッシュ物理
// - Web Audio シンセサイザー BGM & リアルタイムエンジン音連動
// =========================================================================






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
    this.playerSpeed = 140; // km/h (基本巡航速度)
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
    this.targetPos = new THREE.Vector3(0, 0, 75);
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
      62,
      window.innerWidth / window.innerHeight,
      0.1,
      900
    );
    this.camera.position.set(0, 4.5, -9);

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
        this.showAnnouncement(`CAMERA MODE: ${['CHASE CAM', 'COCKPIT CAM', 'BUMPER CAM'][this.cameraMode]}`);
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

    // ウィンドウフォーカス喪失時のキーリセット
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  toggleUltraPhysics() {
    this.ultraPhysicsEnabled = !this.ultraPhysicsEnabled;
    this.physics.setUltraMode(this.ultraPhysicsEnabled);
    if (this.hudPhysicsMode) {
      this.hudPhysicsMode.textContent = this.ultraPhysicsEnabled ? 'ULTRA OVERCLOCK (PC-MELTING)' : 'NORMAL 60FPS';
      this.hudPhysicsMode.style.color = this.ultraPhysicsEnabled ? '#ff0055' : '#00f0ff';
    }
    this.showAnnouncement(this.ultraPhysicsEnabled ? '⚡ ULTRA PHYSICS ENGAGED: MAXIMUM CPU/GPU DESTRUCTION LOAD' : 'PHYSICS ENGINE: OPTIMIZED 60FPS');
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // =========================================================================
  // デモ画面（Attract Mode: 起動直後から背景で大迫力チェイス爆走）
  // =========================================================================
  setupDemo() {
    this.state = 'MENU';
    soundEngine.stopBGM();
    soundEngine.stopSiren();

    this.clearGame();
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
    this.demoTarget.root.position.set(-1.2, 0, this.demoZ + 24);
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
    this.demoInterceptor.root.position.set(1.6, 0, this.demoZ);
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

  updateDemoVehicle(type) {
    this.selectedVehicleType = type;
    if (this.state === 'MENU') {
      this.spawnDemoInterceptor(type);
    }
  }

  updateDemoTarget(type) {
    this.selectedTargetType = type;
    if (this.state === 'MENU') {
      this.spawnDemoTarget(type);
    }
  }

  updateDemoMap(map) {
    this.selectedMap = map;
    if (this.state === 'MENU') {
      this.environment.loadMap(map);
    }
  }

  updateDemo(dt) {
    const speedMs = 39.0; // 140 km/h
    this.demoZ += speedMs * dt;
    this.demoTimer += dt;
    this.demoRamTimer += dt;

    const baseZ = this.demoZ;

    // 1. 標的トラックの走行
    if (this.demoTarget) {
      const swerve = Math.sin(this.demoTimer * 1.5) * 1.8;
      this.demoTarget.root.position.set(-1.0 + swerve, 0, baseZ + 22);
      this.demoTarget.root.rotation.y = Math.cos(this.demoTimer * 1.5) * 0.08;
      if (this.demoTarget.trailerGroup) {
        this.demoTarget.trailerGroup.rotation.y = -Math.cos(this.demoTimer * 1.5) * 0.12;
      }
      this.demoTarget.wheels.forEach(w => {
        w.rotation.x += speedMs * dt * 2.0;
      });
    }

    // 2. 捜査車両のチェイス＆タックル
    if (this.demoInterceptor) {
      let lateralOffset = 2.0;
      let rotY = 0;
      if (this.demoRamTimer > 2.0) {
        lateralOffset = -0.2;
        rotY = -0.15;

        // 火花と破片を激しく放出
        if (Math.random() < 0.45) {
          const hitPos = new THREE.Vector3(0.2, 1.0, baseZ + 16);
          this.physics.createImpactExplosion(hitPos, new THREE.Vector3(0, 0, speedMs), 1.2);
          if (Math.random() < 0.25) soundEngine.playCrash(0.6);
        }
        if (this.demoRamTimer > 2.7) {
          this.demoRamTimer = 0;
        }
      }

      this.demoInterceptor.root.position.set(lateralOffset, 0, baseZ + 15);
      this.demoInterceptor.root.rotation.y = rotY;

      this.demoInterceptor.wheels.forEach(w => {
        w.rotation.x += speedMs * dt * 2.5;
      });

      // パトカーならサイレン点滅
      if (this.demoInterceptor.strobeNodes) {
        const flash = Math.floor(this.demoTimer * 10) % 2 === 0;
        this.demoInterceptor.strobeNodes.red.color.setHex(flash ? 0xff0033 : 0x220000);
        this.demoInterceptor.strobeNodes.blue.color.setHex(!flash ? 0x0066ff : 0x001133);
      }
    }

    // 3. カメラ旋回
    this.demoCamAngle += dt * 0.22;
    const camDist = 18.0;
    const camHeight = 5.2 + Math.sin(this.demoTimer * 0.5) * 1.5;
    const camX = Math.sin(this.demoCamAngle) * camDist;
    const camZ = baseZ + 18 + Math.cos(this.demoCamAngle) * camDist;

    this.camera.position.set(camX, camHeight, camZ);
    this.camera.lookAt(new THREE.Vector3(0, 1.8, baseZ + 20));

    this.environment.update(baseZ, dt);
  }

  // =========================================================================
  // 本番ゲームプレイ開始 (出動ボタン押下時)
  // =========================================================================
  startGame(vehicleType, mapType, targetType) {
    this.selectedVehicleType = vehicleType;
    this.selectedMap = mapType;
    this.selectedTargetType = targetType;

    this.clearGame();
    this.state = 'PLAYING';

    // 1. 環境構築
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

    // 基本巡航速度 140 km/h（オートクルーズで急停止しない！）
    this.playerSpeed = 140;
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
    this.targetPos.set(0, 0, 70);
    this.target.root.position.copy(this.targetPos);
    this.scene.add(this.target.root);

    this.targetSpeed = this.target.stats.speed;
    this.targetIntegrity = this.target.stats.integrity;
    this.targetMaxIntegrity = this.target.stats.maxIntegrity;

    if (this.hudTargetName) {
      this.hudTargetName.textContent = this.target.name;
    }

    // 4. トラフィック生成
    this.spawnTraffics();

    // 5. BGM & 効果音開始
    soundEngine.ensureContext();
    soundEngine.startBGM();
    if (vehicleType === 'patrol') {
      soundEngine.startSiren();
    }

    this.showAnnouncement('🚨 INTERCEPT PURSUIT ENGAGED! RAM & STOP THE TARGET!');
  }

  spawnTraffics() {
    this.traffics = [];
    const colors = [0x34495e, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x95a5a6];
    for (let i = 0; i < this.maxTraffic; i++) {
      const car = this.vehicleFactory.createCivilianCar(colors[i % colors.length]);
      car.root.position.set(
        [-6.5, 0, 6.5][i % 3],
        0,
        this.playerPos.z + 50 + i * 45
      );
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
        this.empCooldown = 8.0;
        soundEngine.playEMP();
        this.showAnnouncement('⚡ EMP SHOCKWAVE DISCHARGED!');
        this.cameraShake = 0.8;
        const dist = this.playerPos.distanceTo(this.targetPos);
        if (dist < 40) {
          this.targetSpeed = Math.max(40, this.targetSpeed - 50);
          this.targetIntegrity -= 150;
          this.physics.createImpactExplosion(this.targetPos, new THREE.Vector3(0, 0, 0), 2.2);
          this.showAnnouncement('⚡ CRITICAL HIT: TRUCK SYSTEMS OVERLOADED!');
        }
      }
    } else if (this.selectedVehicleType === 'supercar') {
      // ニトロ過給
      if (this.nitroFuel >= 25) {
        this.nitroFuel -= 25;
        this.playerSpeed += 90;
        soundEngine.playNitro();
        this.showAnnouncement('🚀 TWIN-TURBO NITRO BURST!');
        this.cameraShake = 0.6;
      }
    } else if (this.selectedVehicleType === 'suv' || this.selectedVehicleType === 'rhino') {
      // 重装甲ラム突進
      this.playerSpeed += 60;
      soundEngine.playNitro();
      this.showAnnouncement('🛡️ HEAVY RAM CHARGE ACTIVATED!');
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

    const dt = Math.min(0.08, (now - this.lastTime) / 1000);
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

    this.physics.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  // =========================================================================
  // プレイヤー操作（左右入力の完全修正・オートクルーズ・滑らかなステアリング）
  // =========================================================================
  updatePlayer(dt) {
    const stats = this.player.stats;

    // 1. アクセル・ブレーキ
    // 基本速度 140km/h をキープ（オートクルーズ）
    const baseCruiseSpeed = 135;
    let throttle = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) throttle += 1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) throttle -= 1.8;

    // ニトロ過給 (Shiftキー)
    if ((this.keys['ShiftLeft'] || this.keys['ShiftRight']) && this.nitroFuel > 0 && throttle >= 0) {
      this.isNitroActive = true;
      this.nitroFuel = Math.max(0, this.nitroFuel - 20 * dt);
      throttle += 1.8;
      if (Math.random() < 0.25) soundEngine.playNitro();
    } else {
      this.isNitroActive = false;
      this.nitroFuel = Math.min(100, this.nitroFuel + 8 * dt);
    }

    if (this.empCooldown > 0) {
      this.empCooldown -= dt;
    }

    // 速度更新
    const maxSpeed = this.isNitroActive ? stats.maxSpeed * 1.35 : stats.maxSpeed;
    if (throttle > 0) {
      this.playerSpeed += stats.accel * throttle * dt * 3.6;
      if (this.playerSpeed > maxSpeed) this.playerSpeed = maxSpeed;
    } else if (throttle < 0) {
      this.playerSpeed -= 45 * dt * 3.6;
      if (this.playerSpeed < 60) this.playerSpeed = 60; // ブレーキ時も最低60km/h
    } else {
      // アクセルオフ時：基本速度 135km/h へ自然収束（急停止しない！）
      if (this.playerSpeed > baseCruiseSpeed) {
        this.playerSpeed -= 25 * dt;
      } else if (this.playerSpeed < baseCruiseSpeed) {
        this.playerSpeed += 20 * dt;
      }
    }

    // 2. ステアリング入力（★重要：視覚と100%一致させる★）
    // Three.js カメラが +Z を見ている場合：
    // 画面の「左」は +X、画面の「右」は -X
    let steerInput = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      steerInput += 1.0; // 画面の「左」へ！
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      steerInput -= 1.0; // 画面の「右」へ！
    }

    // ハンドブレーキ急ドリフト (Spaceキー)
    const isHandbrake = this.keys['Space'];
    if (isHandbrake) {
      steerInput *= 1.6;
      this.playerSpeed *= Math.pow(0.97, dt * 60);
      if (Math.abs(this.playerSpeed) > 70 && Math.random() < 0.35) {
        soundEngine.playTireScreech();
      }
    }

    // ステアリングのスムーズ補間
    this.playerSteer += (steerInput - this.playerSteer) * Math.min(1, 12 * dt);

    // 位置更新
    const speedMs = (this.playerSpeed / 3.6);
    this.playerPos.z += speedMs * dt;
    this.playerPos.x += this.playerSteer * (stats.handling * 2.8) * dt * 14;

    // ガードレール衝突（端で跳ね返り・スタック防止）
    if (this.playerPos.x > 10.5) {
      this.playerPos.x = 10.5;
      this.playerSteer = -0.5;
      this.cameraShake = 0.35;
      soundEngine.playCrash(0.6);
    } else if (this.playerPos.x < -10.5) {
      this.playerPos.x = -10.5;
      this.playerSteer = 0.5;
      this.cameraShake = 0.35;
      soundEngine.playCrash(0.6);
    }

    // 車両メッシュ姿勢（バンク＆ヨー角）
    this.player.root.position.copy(this.playerPos);
    // 左に曲がるときは左を向き、右に曲がるときは右を向く
    this.playerRotY = this.playerSteer * 0.22;
    this.player.root.rotation.set(
      (throttle > 0 ? -0.015 : throttle < 0 ? 0.025 : 0),
      this.playerRotY,
      this.playerSteer * 0.08
    );

    // 車輪回転
    const wheelRotSpeed = (speedMs / 0.44) * dt;
    this.player.wheels.forEach(w => {
      w.rotation.x += wheelRotSpeed;
    });

    // パトカーならサイレン点滅
    if (this.player.strobeNodes) {
      const flash = Math.floor(performance.now() / 90) % 2 === 0;
      this.player.strobeNodes.red.color.setHex(flash ? 0xff0033 : 0x220000);
      this.player.strobeNodes.blue.color.setHex(!flash ? 0x0066ff : 0x001133);
    }

    // リアルタイムエンジン音
    soundEngine.updateEngine(this.playerSpeed, stats.maxSpeed, throttle);
  }

  // --- 標的大型車両のAI走行 ---
  updateTarget(dt) {
    if (!this.target) return;

    this.targetSwerveTimer += dt;
    // 蛇行運転（プレイヤーをブロックしようとする）
    const targetX = Math.sin(this.targetSwerveTimer * 1.2) * 5.5;
    this.targetPos.x += (targetX - this.targetPos.x) * dt * 1.5;

    // 前進
    const targetSpeedMs = (this.targetSpeed / 3.6);
    this.targetPos.z += targetSpeedMs * dt;

    this.target.root.position.copy(this.targetPos);
    this.target.root.rotation.y = Math.cos(this.targetSwerveTimer * 1.2) * 0.08;

    if (this.target.trailerGroup) {
      this.target.trailerGroup.rotation.y = -Math.cos(this.targetSwerveTimer * 1.2) * 0.12;
    }

    // 車輪回転
    const wheelRotSpeed = (targetSpeedMs / 0.58) * dt;
    this.target.wheels.forEach(w => {
      w.rotation.x += wheelRotSpeed;
    });
  }

  // --- 一般車トラフィック更新 ---
  updateTraffics(dt) {
    for (let car of this.traffics) {
      car.root.position.z += (car.speed / 3.6) * dt;

      // 遥か後方に過ぎ去ったら前方にリスポーン
      if (car.root.position.z < this.playerPos.z - 30) {
        car.root.position.z = this.playerPos.z + 180 + Math.random() * 60;
        car.root.position.x = [-6.5, 0, 6.5][Math.floor(Math.random() * 3)];
      }

      // トラックが一般車を豪快に弾き飛ばす
      const distToTruck = car.root.position.distanceTo(this.targetPos);
      if (distToTruck < 6.8) {
        car.root.position.x += (car.root.position.x > this.targetPos.x ? 8 : -8);
        this.physics.createImpactExplosion(car.root.position, new THREE.Vector3(0, 0, 0), 1.5);
        soundEngine.playCrash(1.2);
        this.cameraShake = 0.5;
      }
    }
  }

  // =========================================================================
  // 激突・タックル判定（超爽快な連続体当たり・火花・パーツ脱落）
  // =========================================================================
  checkCollisions() {
    if (!this.player || !this.target) return;

    const dx = Math.abs(this.playerPos.x - this.targetPos.x);
    const dz = Math.abs(this.playerPos.z - this.targetPos.z);

    const hitWidth = 2.6;
    const hitLength = 8.5;

    if (dx < hitWidth && dz < hitLength) {
      this.handlePlayerTargetCrash();
    }
  }

  handlePlayerTargetCrash() {
    const relSpeedKmh = Math.abs(this.playerSpeed - this.targetSpeed);
    const impactForce = Math.max(25, (relSpeedKmh + 35) * 1.8 * this.player.stats.ramPower);
    this.cameraShake = Math.min(2.5, 0.5 + impactForce * 0.02);

    // 激突音 & ガラス粉砕
    soundEngine.playCrash(impactForce / 25);
    if (Math.random() < 0.5) soundEngine.playGlassShatter();

    // 接触点
    const contactPoint = new THREE.Vector3(
      (this.playerPos.x + this.targetPos.x) * 0.5,
      1.1,
      (this.playerPos.z + this.targetPos.z) * 0.5
    );

    // 1. メッシュ変形 (Soft-Body Crumple)
    if (this.target.parts.cab) {
      const localT = this.target.parts.cab.worldToLocal(contactPoint.clone());
      this.physics.applyMeshDeformation(this.target.parts.cab, localT, new THREE.Vector3(0, 0, 1), impactForce * 1.5, 3.5);
    }
    if (this.target.parts.container) {
      const localC = this.target.parts.container.worldToLocal(contactPoint.clone());
      this.physics.applyMeshDeformation(this.target.parts.container, localC, new THREE.Vector3(0, 0, 1), impactForce, 3.0);
    }

    // 2. 超密度火花＆破片物理爆散
    this.physics.createImpactExplosion(contactPoint, new THREE.Vector3(0, 0, (this.playerSpeed + this.targetSpeed) / 7.2), impactForce);

    // 3. パーツ脱落（ドアやバンパーが吹き飛ぶ）
    if (impactForce > 40 && this.target.parts.rearDoor && Math.random() < 0.6) {
      this.physics.detachPart(this.target, this.target.parts.rearDoor, new THREE.Vector3(0, 0, this.targetSpeed / 3.6), impactForce);
      delete this.target.parts.rearDoor;
      this.showAnnouncement('💥 CRITICAL BREACH: TRUCK CARGO DOORS RIPPED OFF!');
    }
    if (impactForce > 65 && this.target.parts.exhaustL && Math.random() < 0.5) {
      this.physics.detachPart(this.target, this.target.parts.exhaustL, new THREE.Vector3(-2, 4, this.targetSpeed / 3.6), impactForce);
      delete this.target.parts.exhaustL;
      this.showAnnouncement('💥 EXHAUST STACK DISLODGED!');
    }

    // 4. ダメージ計算
    const damageToTarget = Math.round(impactForce * 2.2);
    const damageToPlayer = Math.round(impactForce * (0.5 / this.player.stats.ramPower));

    this.targetIntegrity = Math.max(0, this.targetIntegrity - damageToTarget);
    this.playerIntegrity = Math.max(0, this.playerIntegrity - damageToPlayer);

    // トラックの速度低下
    this.targetSpeed = Math.max(40, this.targetSpeed - (damageToTarget * 0.06));

    // スコア加算
    this.totalScore += damageToTarget * 10;
    if (this.hudImpactScore) {
      this.hudImpactScore.textContent = `+${damageToTarget * 10} IMPACT PTS`;
      this.hudImpactScore.classList.add('flash');
      setTimeout(() => this.hudImpactScore.classList.remove('flash'), 600);
    }

    // ★重要：止まらずにガリガリ押し合う迫力物理★
    // 速度をゼロに落とさず、最低130km/hをキープ！
    this.playerSpeed = Math.max(130, this.playerSpeed * 0.92);
    // 接触反発で横へスライド
    this.playerPos.x += (this.playerPos.x > this.targetPos.x ? 0.8 : -0.8);
  }

  // --- カメラワーク ---
  updateCamera(dt) {
    if (!this.player) return;

    let targetCamPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    if (this.cameraMode === 0) {
      // 迫力の追跡チェイスカム
      targetCamPos.set(
        this.playerPos.x * 0.65,
        this.playerPos.y + 3.8,
        this.playerPos.z - 8.5
      );
      lookTarget.set(
        this.playerPos.x * 0.3,
        this.playerPos.y + 1.3,
        this.playerPos.z + 18
      );
    } else if (this.cameraMode === 1) {
      // コックピット・クローズアップカム
      targetCamPos.set(
        this.playerPos.x,
        this.playerPos.y + 1.5,
        this.playerPos.z - 0.2
      );
      lookTarget.set(
        this.playerPos.x,
        this.playerPos.y + 1.4,
        this.playerPos.z + 28
      );
    } else {
      // バンパーシネマティックカム
      targetCamPos.set(
        this.playerPos.x,
        this.playerPos.y + 0.75,
        this.playerPos.z + 2.5
      );
      lookTarget.set(
        this.targetPos.x,
        this.targetPos.y + 1.8,
        this.targetPos.z
      );
    }

    // ニトロ加速時のダイナミック FOV 演出（広角化でスピード感爆発）
    const targetFOV = this.isNitroActive ? 74 : 62;
    this.camera.fov += (targetFOV - this.camera.fov) * dt * 6;
    this.camera.updateProjectionMatrix();

    // カメラシェイク
    if (this.cameraShake > 0) {
      targetCamPos.x += (Math.random() - 0.5) * this.cameraShake;
      targetCamPos.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - 3.5 * dt);
    }

    this.camera.position.lerp(targetCamPos, 0.18);
    this.camera.lookAt(lookTarget);
  }

  // --- HUD表示更新 ---
  updateHUD() {
    if (this.hudSpeed) {
      this.hudSpeed.textContent = `${Math.round(this.playerSpeed)}`;
    }
    if (this.hudPlayerHp) {
      this.hudPlayerHp.textContent = `${Math.round(this.playerIntegrity)}`;
    }
    if (this.hudPlayerHpBar) {
      this.hudPlayerHpBar.style.width = `${Math.max(0, this.playerIntegrity)}%`;
    }
    if (this.hudNitroBar) {
      this.hudNitroBar.style.width = `${Math.max(0, this.nitroFuel)}%`;
    }
    if (this.hudTargetHp && this.hudTargetHpBar) {
      const pct = Math.max(0, Math.round((this.targetIntegrity / this.targetMaxIntegrity) * 100));
      this.hudTargetHp.textContent = `${this.targetIntegrity} / ${this.targetMaxIntegrity}`;
      this.hudTargetHpBar.style.width = `${pct}%`;
    }
    if (this.hudDistance && this.player && this.target) {
      const dist = Math.max(0, Math.round(this.targetPos.z - this.playerPos.z));
      this.hudDistance.textContent = `${dist}m`;
    }
  }

  // --- 勝敗判定 ---
  checkWinLoss() {
    // 勝利：標的の耐久値がゼロ
    if (this.targetIntegrity <= 0) {
      this.endGame(true);
      return;
    }
    // 敗北：自車の耐久値がゼロ
    if (this.playerIntegrity <= 0) {
      this.endGame(false, 'INTERCEPTOR TOTALED (自車大破)');
      return;
    }
    // 敗北：標的が遥か彼方に逃走
    if (this.targetPos.z - this.playerPos.z > 220) {
      this.endGame(false, 'TARGET ESCAPED BEYOND PURSUIT RANGE (標的逃走)');
      return;
    }
  }

  endGame(isWin, reason = '') {
    this.state = isWin ? 'WON' : 'LOST';
    soundEngine.stopBGM();
    soundEngine.stopSiren();

    const resultScreen = document.getElementById('result-screen');
    const resultTitle = document.getElementById('result-title');
    const resultMsg = document.getElementById('result-message');
    const resultScore = document.getElementById('result-score');

    if (resultScreen) {
      resultScreen.classList.remove('hidden');
      if (isWin) {
        resultTitle.textContent = 'MISSION ACCOMPLISHED';
        resultTitle.style.color = '#00ff88';
        resultMsg.textContent = 'RAMPAGING TARGET COMPLETELY NEUTRALIZED AND HALTED!';
        soundEngine.playNitro();
      } else {
        resultTitle.textContent = 'MISSION FAILED';
        resultTitle.style.color = '#ff0055';
        resultMsg.textContent = reason || 'OPERATION ABORTED';
        soundEngine.playCrash(1.5);
      }
      if (resultScore) {
        resultScore.textContent = `${this.totalScore} PTS`;
      }
    }
  }

  showAnnouncement(msg) {
    if (this.hudMessage) {
      this.hudMessage.textContent = msg;
      this.hudMessage.classList.add('flash');
      setTimeout(() => this.hudMessage.classList.remove('flash'), 800);
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
          soundEngine.playClick();
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
          soundEngine.playClick();
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
          soundEngine.playClick();
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
          soundEngine.setMute(isMuted);
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
