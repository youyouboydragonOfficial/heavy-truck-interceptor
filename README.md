# HEAVY TRUCK INTERCEPTOR: CRASH PURSUIT
**超精密ソフトボディ＆破壊物理演算シミュレーター / 大型暴走車両緊急停止ミッション**

[![Release](https://img.shields.io/github/v/release/youyouboydragonOfficial/heavy-truck-interceptor?color=cyan&label=Latest%20Version)](https://github.com/youyouboydragonOfficial/heavy-truck-interceptor/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-blue.svg)](https://github.com/youyouboydragonOfficial/heavy-truck-interceptor)

---

## 🎮 ゲーム概要 (Game Overview)

本物さながらの重厚な車両を操縦し、都市や高速道路を暴走する超大型トラックや長距離バスを追跡・体当たり（RAM）して物理破壊し、完全停止に追い込むハイパー・リアル破壊物理シミュレーターです。

衝突した瞬間、車両の鉄板フレームがリアルタイムに凹み歪む**「頂点ディスプレイスメント・メッシュ変形」**、耐衝撃値を超えると千切れて路上を転がる**「分離パーツ物理」**、そして何千もの火花や金属・ガラス片が飛び散る**「超密度パーティクル物理演算」**を搭載。パソコンが悲鳴をあげるレベルの超リアル演算モード（ULTRA PC-MELTING MODE）も搭載しています。

---

## 🚀 主な特徴 (Features)

### 1. 超リアル破壊物理エンジン (Hyper Destruction Physics)
- **Soft-Body-like Vertex Deformation**: 衝突衝撃点と衝突法線から接触面のポリゴン頂点をリアルタイムに凹ませ、法線ベクトルを再計算して光沢と板金のひしゃげを美麗に再現。
- **Part Detachment**: バンパー、ボンネット、ドア、フロントガラス、排土板、コンテナ後部ドアが衝撃で吹き飛び、独立した剛体として路上をバウンド。
- **Ultra Shrapnel & Spark Engine**: 金属破片、ガラス破片、路面摩擦火花、オイル飛沫、黒煙がリアルタイム物理で四散。
- **ULTRA PC-MELTING MODE (Uキー)**: 演算サブステップを極限まで増やし、最大10,000パーティクルの極大負荷演算を発動可能。

### 2. 捜査側車両 (4種類のプレイアブル車両)
1. **🚓 POLICE CROWN INTERCEPTOR**: 捜査用高速パトロールセダン。最高速250km/h、EMP電磁衝撃波キャノン（Eキー）で遠隔システム過負荷を起こす。
2. **🏎️ V12 PHANTOM SUPER-PURSUIT**: 最高速330km/h。ツインターボ・ニトロ過給（Shiftキー）で矢のように突撃し、トラックの足回りを刈り取る。
3. **🚙 TITAN HEAVY 4x4 ARMORED**: 重量3,400kgの重装甲SUV。極厚アイアンブルバーで正面衝突にも耐え、相手を押し戻す。
4. **🦏 RHINO RAM JUGGERNAUT**: 重量6,500kgの超大型突破機。前面のV字排土板（Plow Wedge）で18輪トラックの車軸を一撃で破壊する。

### 3. 標的暴走大型車両 (3種類のターゲット)
1. **🚛 18-WHEELER MEGA HAULER**: 18輪連結メガトラック。時速135kmで暴走。ラジエーター、燃料タンク、18輪タイヤの部位破壊が可能。
2. **🚌 TWIN-DECK WILD BUS**: 2階建て長距離特急バス。時速155kmの蛇行暴走。高重心のため側面タックルで大横転スライディングを誘発。
3. **🚜 ARMORED MEGA-CRUSHER**: 違法重装甲ブルドーザー。HP1500の凶悪ビースト。一般車を薙ぎ払うボス級車両。

### 4. 多彩なマップ (4つの環境)
- **🏙️ Downtown Megacity**: 摩天楼ビル群、ネオン電飾、破壊可能な街灯・バリケードが立ち並ぶ都市部。
- **🌊 Coastal Highway & Tunnel**: 8車線の長大沿岸ハイウェイ。海沿いから山岳トンネルを抜ける超高速チェイス。
- **🏜️ Desert Badlands & Industrial**: 赤土のキャニオンと工場地帯。ダイナミックな高低差と連続ワインディングロード。
- **⛈️ Rainstorm Cyberway**: 夜間の暴風雨と稲妻。濡れた路面のリアルタイム水たまり反射と激しい水煙。

### 5. アプリ内自動更新システム (In-App Auto Updater)
- アプリ内の「📡 CHECK UPDATES」ボタンからいつでも最新バージョンを確認可能。
- **厳格な3秒間のサイバーHUDアニメーション演出**: 衛星通信リンク、暗号化ハンドシェイク、チェックサム検証を経て最新リリースを検出。
- **ダウンロード中のかっこいいアニメーション**: レーダースキャナー、リアルタイム転送進捗率、ログコンソール、プログレスバーを完備。
- ダウンロード完了後はアプリ内からワンクリックで最新インストーラーを実行・更新。

---

## 🕹️ 操作方法 (Controls)

| キー | 動作 |
|---|---|
| `W` / `↑` | アクセル (加速) |
| `S` / `↓` | ブレーキ / バック |
| `A` / `←` | 左ステアリング |
| `D` / `→` | 右ステアリング |
| `Space` | ハンドブレーキ・緊急ドリフト |
| `Shift` | ニトロブースト / 特攻急加速 |
| `E` | 車両特殊アビリティ (EMP / ニトロ / ラム) |
| `C` | カメラ視点切替 (チェイス / 車内 / バンパー) |
| `U` | 超リアル ULTRA PC-MELTING 物理演算 切替 |
| `R` | 車両姿勢リセット |

---

## 📦 配布形態 (Releases - ZIP禁止・ダイレクトEXE)

本プロジェクトは `.zip` での配布を行わず、Windows x64向け実行ファイル（`.exe`）を直接提供しています：

1. **インストール型**: `HeavyTruckInterceptor-Setup-v1.0.0.exe` (NSISインストーラー)
2. **インストール不要ポータブル型**: `HeavyTruckInterceptor-Portable-v1.0.0.exe` (単体で即遊べるスタンドアロンEXE)

---

## 🛠️ 開発・ビルド環境 (Development)

```bash
# 依存関係のインストール
npm install

# 開発モード起動
npm start

# Windows向けバイナリビルド (インストーラー & ポータブルEXE)
npm run build:win
```

---

## 📄 ライセンス (License)
MIT License - Copyright (c) youyouboydragonOfficial
