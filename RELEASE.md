# Release Configuration

## GitHub Actions 自動リリース設定

### 必要な設定

1. **NPM_TOKEN の設定**
   - GitHub リポジトリの Settings > Secrets and variables > Actions
   - `NPM_TOKEN` を追加（npmjs.com のアクセストークン）

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
