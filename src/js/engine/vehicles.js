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

import * as THREE from '../../assets/three.module.js';

export class VehicleFactory {
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
