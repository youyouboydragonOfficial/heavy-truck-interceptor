// =========================================================================
// HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
// HIGH-SPEED DYNAMIC CHASE ENGINE
// - 完璧な直感ステアリング（左右入力の完全一致）
// - オートクルーズ & 超高速ニトロ追跡（急停止・スタックの完全根絶）
// - リアルタイム変形 & パーツ脱落クラッシュ物理
// - Web Audio シンセサイザー BGM & リアルタイムエンジン音連動
// =========================================================================

import * as THREE from '../../assets/three.module.js';
import { PhysicsEngine } from './physics.js';
import { VehicleFactory } from './vehicles.js';
import { EnvironmentEngine } from './environment.js';
import { soundEngine } from './audio.js';

export class Game {
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
