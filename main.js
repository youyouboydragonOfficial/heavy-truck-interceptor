const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 1024,
    minHeight: 640,
    title: 'HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT',
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableWebSQL: false,
      webgl: true
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC ハンドラー：バージョン取得
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// IPC ハンドラー：外部URLオープン
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// IPC ハンドラー：アップデートバイナリのダウンロード＆適用
ipcMain.handle('download-and-apply-update', async (event, downloadUrl) => {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = app.getPath('temp');
      const filename = path.basename(downloadUrl.split('?')[0]) || 'HeavyTruckInterceptor-Setup.exe';
      const targetPath = path.join(tempDir, filename);

      const file = fs.createWriteStream(targetPath);
      
      const requestWithRedirects = (url, depth = 0) => {
        if (depth > 5) {
          reject(new Error('Too many redirects'));
          return;
        }

        https.get(url, {
          headers: {
            'User-Agent': 'HeavyTruckInterceptor-Updater'
          }
        }, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            requestWithRedirects(response.headers.location, depth + 1);
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
            return;
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          response.on('data', (chunk) => {
            receivedBytes += chunk.length;
            file.write(chunk);
            if (mainWindow) {
              const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
              mainWindow.webContents.send('download-progress', {
                percent,
                receivedBytes,
                totalBytes
              });
            }
          });

          response.on('end', () => {
            file.end(() => {
              // ダウンロード完了
              if (mainWindow) {
                mainWindow.webContents.send('download-completed', { targetPath });
              }
              // 実行
              try {
                if (process.platform === 'win32' && targetPath.endsWith('.exe')) {
                  spawn(targetPath, [], { detached: true, stdio: 'ignore' }).unref();
                  setTimeout(() => {
                    app.quit();
                  }, 1000);
                } else {
                  shell.openPath(targetPath);
                }
                resolve({ success: true, targetPath });
              } catch (e) {
                resolve({ success: true, targetPath, note: 'File downloaded, manual launch needed' });
              }
            });
          });

          response.on('error', (err) => {
            file.close();
            fs.unlink(targetPath, () => {});
            reject(err);
          });
        }).on('error', (err) => {
          file.close();
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      };

      requestWithRedirects(downloadUrl);
    } catch (err) {
      reject(err);
    }
  });
});
