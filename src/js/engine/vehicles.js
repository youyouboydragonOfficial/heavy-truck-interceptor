import * as THREE from '../../assets/three.module.js';

export class VehicleFactory {
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
