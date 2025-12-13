# Only My Smartphone

スマートフォンのカメラ映像と加速度センサーを使ったAR斬撃体験Webアプリです。HTTPS 環境での実行を前提にしています。

## ローカル動作確認
1. 任意の静的サーバーを起動します（例: `npx serve` など）。
2. `https://` で配信できる環境で `index.html` を開きます。
3. ブラウザからカメラとモーションセンサーの許可を求められたら許可してください。

> ファイルを直接開く `file://` ではカメラ・センサーが動作しないため、必ず HTTP(S) 経由でアクセスしてください。

## Netlify デプロイ手順
Netlify ではビルド不要の静的ホスティングとして公開できます。`netlify.toml` の設定で公開ディレクトリやヘッダーを定義しています。

1. Netlify のダッシュボードで **Add new site → Import an existing project** を選択。
2. このリポジトリを接続し、Build command を空欄、Publish directory を `./` のまま保存します（`netlify.toml` が自動で反映されます）。
3. デプロイ完了後、サイト URL にスマートフォンからアクセスし、カメラ／モーションセンサーを許可してください。

### 手動デプロイ（ドラッグ＆ドロップ）
ビルドが不要なため、ダッシュボードの **Sites → Deploys → Deploy directory** へリポジトリのルートディレクトリをまとめてアップロードするだけでも公開できます。

### CLI でのデプロイ
Netlify CLI が未インストールでも `npx` で実行できます。`npm` が使える環境を前提にしています。

1. アカウント認証
   ```bash
   npx netlify-cli login
   ```
2. サイト作成（初回のみ。`<your-site-name>` はユニークな名前に変更してください）
   ```bash
   npx netlify-cli sites:create --name <your-site-name>
   ```
   既存サイトに紐付ける場合は `npx netlify-cli link` で選択または `--id <site-id>` を指定してください。
3. 本番デプロイ
   ```bash
   npx netlify-cli deploy --dir . --prod
   ```
   `netlify.toml` の設定が自動で適用され、公開 URL が表示されます。

## 付加情報
- `netlify.toml` の `Permissions-Policy` ヘッダーでカメラ・加速度センサーの使用を許可しています。
- 実機カメラとモーションセンサーは HTTPS でのみ利用可能です。Netlify では自動的に https 化されます。
