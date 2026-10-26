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
    this.state = 'MENU'; // MENU, PLAYING, WON, LOST
    this.selectedVehicleType = 'patrol';
    this.selectedMap = 'megacity';
    this.selectedTargetType = 'truck';

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
      this.hudPhysicsMode.textContent = this.ultraPhysicsEnabled ? 'ULTRA OVERCLOCK (EXTREME LOAD)' : 'NORMAL 60FPS';
      this.hudPhysicsMode.style.color = this.ultraPhysicsEnabled ? '#ff0055' : '#00f0ff';
    }
    this.showAnnouncement(this.ultraPhysicsEnabled ? 'ULTRA PHYSICS ENGINE ENGAGED: OVERCLOCKING SIMULATION' : 'PHYSICS ENGINE: OPTIMIZED MODE');
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- ゲーム開始 ---
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

    this.playerSpeed = 80;
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

    this.showAnnouncement('INTERCEPTOR DISPATCHED: RAM & NEUTRALIZE TARGET!');
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

    if (this.state === 'PLAYING') {
      this.updatePlayer(dt);
      this.updateTarget(dt);
      this.updateTraffics(dt);
      this.checkCollisions();
      this.updateCamera(dt);
      this.updateHUD();
      this.checkWinLoss();
    }

    // 物理エンジン & 環境更新
    this.physics.update(dt);
    if (this.player) {
      this.environment.update(this.playerPos.z, dt);
    }

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
    const hitLength = 8.5; // トラックの長大な車体

    if (dx < hitWidth && dz < hitLength) {
      this.handlePlayerTargetCrash();
    }
  }

  // プレイヤーと暴走トラックの猛烈なクラッシュ処理
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

    // 1. 超リアル 頂点メッシュ変形（Soft-body Crumple）
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
