import * as THREE from '../../assets/three.module.js';

export class PhysicsEngine {
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
