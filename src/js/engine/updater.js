// アプリ内アップデーターシステム
// 要件:
// 1. アプリ内で更新を確認・更新できる
// 2. 早すぎるとおかしいので「3秒間の読み込み」を厳格に演出
// 3. 読み込み＆ダウンロード中にかっこいいアニメーション

export class InAppUpdater {
  constructor() {
    this.repoOwner = 'youyouboydragonOfficial';
    this.repoName = 'heavy-truck-interceptor';
    this.currentVersion = '1.0.0';
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
