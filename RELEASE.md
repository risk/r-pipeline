# Release Configuration

## GitHub Actions 自動リリース設定

### 必要な設定

1. **NPM Trusted Publishing の設定**（推奨）
   
   NPMのTrusted Publishingを使用することで、より安全にパッケージを公開できます。
   
   **設定手順：**
   
   a. NPM側の設定
   - [npmjs.com](https://www.npmjs.com) にログイン
   - アカウント設定 > Access Tokens > Automation タブ
   - 「Add GitHub Actions」をクリック
   - GitHubリポジトリを選択（例：`risk/r-pipeline`）
   - 「Generate token」をクリック
   - これで、GitHub Actionsから自動的に認証されるようになります
   
   b. GitHub側の設定
   - ワークフローは既にTrusted Publishingに対応済みです
   - `id-token: write` パーミッションが設定されています
   - 追加のシークレット設定は不要です
   
   **従来の方法（NPM_TOKENを使用する場合）：**
   - GitHub リポジトリの Settings > Secrets and variables > Actions
   - `NPM_TOKEN` を追加（npmjs.com のアクセストークン）
   - この場合は、ワークフローの `NODE_AUTH_TOKEN` を `${{ secrets.NPM_TOKEN }}` に変更してください

2. **ブランチ保護ルールの設定**
   - GitHub リポジトリの Settings > Branches
   - `main` ブランチに保護ルールを追加：
     - ✅ Require a pull request before merging
     - ✅ Require approvals (1人以上)
     - ✅ Require status checks to pass before merging
       - `test` (CI ワークフローのテストジョブ)
       - `build` (CI ワークフローのビルドジョブ)
     - ✅ Require conversation resolution before merging
     - ✅ Include administrators

3. **リリース手順**
   ```bash
   # バージョンアップ（例：patch）
   npm version patch
   
   # または手動でタグを作成
   git tag v2.0.1
   git push origin v2.0.1
   ```

4. **自動実行される処理**
   - テストの実行
   - ビルドの実行
   - npm への公開
   - GitHub Release の作成

### ワークフローファイル

- `.github/workflows/ci.yml` - プルリクエスト用のCI
- `.github/workflows/release.yml` - リリース用のワークフロー

### 注意事項

- `prepublishOnly` スクリプトでビルドとテストが自動実行されます
- タグがプッシュされると自動的にリリースが開始されます
- GitHub Release には変更内容が自動で記載されます
- **プルリクエストはテストが通らないとマージできません**
- Trusted Publishingを使用する場合、`--provenance` フラグにより、パッケージの出所が証明されます
- パッケージは `--access public` で公開されます（スコープ付きパッケージの場合）
