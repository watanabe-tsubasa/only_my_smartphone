了解です。
**「実装が軽い / 実機検証しやすい / デプロイが楽」**を最優先にした
**技術スタック案（vanilla JS + Netlify）**としてまとめます。

⸻

技術スタック案

スマートフォンWeb AR斬撃アプリ

⸻

1. 全体方針
	•	フレームワークは使用しない（Vanilla JS）
	•	ビルド工程なし or 最小限
	•	スマホ実機検証を最優先
	•	HTTPS前提（Netlifyで担保）

⸻

2. フロントエンド技術スタック

2.1 言語・記述方式

項目	採用技術	理由
言語	JavaScript (ES2020+)	トランスパイル不要
構成	HTML + CSS + JS	学習コスト最小
モジュール	ES Modules	ファイル分割可能


⸻

2.2 UI・描画

機能	技術	補足
カメラ表示	<video> + getUserMedia	ネイティブAPI
エフェクト描画	<canvas>	軽量・高速
合成	CSS z-index	video下、canvas上


⸻

2.3 センサー利用

センサー	API	備考
加速度	DeviceMotionEvent	iOSは許可必須
傾き	DeviceOrientationEvent	拡張時使用


⸻

3. ディレクトリ構成（最小）

/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ camera.js        // カメラ制御
│  ├─ motion.js        // 加速度検知
│  ├─ slash.js         // 斬撃エフェクト
│  └─ main.js          // 初期化・統合
└─ assets/
   └─ slash.mp3        // 効果音（任意）

👉 役割単位で分離しつつ過剰にしない

⸻

4. API / ライブラリ選定

4.1 標準Web API（必須）

機能	API
カメラ	navigator.mediaDevices.getUserMedia
加速度	window.addEventListener('devicemotion')
Canvas	CanvasRenderingContext2D
音	HTMLAudioElement or Web Audio API


⸻

4.2 外部ライブラリ（初期は不使用）

ライブラリ	方針
Three.js	不使用（過剰）
WebXR	不使用（対応端末限定）
TensorFlow.js	将来拡張時のみ

👉 最初はゼロ依存が最適

⸻

5. デプロイ・ホスティング

5.1 Netlify 採用理由

観点	内容
HTTPS	自動対応
デプロイ	Git連携 / Drag & Drop
設定	ほぼ不要
検証	スマホ即アクセス可能


⸻

5.2 Netlify設定

ビルド設定
	•	Build Command: なし
	•	Publish Directory: /

リダイレクト（不要）
	•	SPA構成でないため設定不要

⸻

6. 実装上の重要ポイント

6.1 iOS対策

項目	対応
加速度許可	DeviceMotionEvent.requestPermission()
カメラ	playsinline 指定
フルスクリーン	CSSで対応


⸻

6.2 パフォーマンス設計
	•	requestAnimationFrameは常時回さない
	•	斬撃イベント時のみCanvas描画
	•	Canvasクリアはフェード方式

⸻

7. 開発・検証フロー

7.1 ローカル開発
	•	VSCode + Live Server
	•	スマホ実機は Netlify Preview で検証

⸻

7.2 実機検証観点

項目	確認内容
感度	振った感覚と一致するか
遅延	斬撃が遅れないか
端末差	iOS / Android
発熱	長時間利用


⸻

8. 将来拡張を見据えた余白
	•	JS → TypeScript への移行余地
	•	Vite導入によるビルド最適化
	•	Web Audio APIで立体音響
	•	WebXR / Three.jsへの拡張

👉 今は軽く、後で強くできる構成

⸻

9. 技術スタックまとめ（1枚で）

Frontend : Vanilla JavaScript (ES Modules)
Rendering: HTML5 Video + Canvas
Sensors  : DeviceMotionEvent
Hosting  : Netlify (Static Hosting + HTTPS)
Build    : なし
Deps     : なし
