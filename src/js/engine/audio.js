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

export const soundEngine = new SoundEngine();
