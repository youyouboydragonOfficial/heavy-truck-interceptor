const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const engineDir = path.join(srcDir, 'js', 'engine');

function cleanCode(code) {
  return code
    .replace(/^import\s+.*?['"].*?['"];?\s*$/gm, '')
    .replace(/^export\s+class\s+(\w+)/gm, 'class $1')
    .replace(/^export\s+const\s+(\w+)/gm, 'const $1')
    .replace(/^export\s+default\s+/gm, '');
}

const audioCode = cleanCode(fs.readFileSync(path.join(engineDir, 'audio.js'), 'utf8'));
const physicsCode = cleanCode(fs.readFileSync(path.join(engineDir, 'physics.js'), 'utf8'));
const vehiclesCode = cleanCode(fs.readFileSync(path.join(engineDir, 'vehicles.js'), 'utf8'));
const environmentCode = cleanCode(fs.readFileSync(path.join(engineDir, 'environment.js'), 'utf8'));
const updaterCode = cleanCode(fs.readFileSync(path.join(engineDir, 'updater.js'), 'utf8'));
const gameCode = cleanCode(fs.readFileSync(path.join(engineDir, 'game.js'), 'utf8'));

const bundleCode = `
// HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
// All-in-One Engine & Controller Bundle
(function() {
  'use strict';

  // 1. SOUND ENGINE
  ${audioCode}
  window.soundEngine = soundEngine;

  // 2. PHYSICS ENGINE
  ${physicsCode}
  window.PhysicsEngine = PhysicsEngine;

  // 3. VEHICLE FACTORY
  ${vehiclesCode}
  window.VehicleFactory = VehicleFactory;

  // 4. ENVIRONMENT ENGINE
  ${environmentCode}
  window.EnvironmentEngine = EnvironmentEngine;

  // 5. IN-APP UPDATER
  ${updaterCode}
  window.InAppUpdater = InAppUpdater;

  // 6. GAME CORE
  ${gameCode}
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
`;

fs.writeFileSync(path.join(srcDir, 'js', 'app.js'), bundleCode);
console.log('Successfully created src/js/app.js! Size:', fs.statSync(path.join(srcDir, 'js', 'app.js')).size);
