# 學霸 PVZ 帳號服務部署與維護說明

更新日期：2026-07-15
適用專案：`sclife2003/xueba-pvz`
本機專案位置：`C:\Users\Legion9_RTX5080\VibeProjects\xueba`

> 安全聲明：本文件只記錄公開網址、資源 ID、secret 名稱與操作流程，不包含實際 GitHub PAT、`PASSWORD_PEPPER`、使用者密碼或 Session token。

## 1. 系統用途與架構

這套服務讓玩家建立簡單帳號、登入並在不同裝置同步遊戲進度。所有正式服務都在雲端執行，部署完成後不需要讓個人電腦持續開機。

```text
玩家瀏覽器
  ├─ GitHub Pages：遊戲前端
  │    https://sclife2003.github.io/xueba-pvz/
  └─ Cloudflare Worker：帳號與同步 API
       https://xueba-pvz-account.sclife2003.workers.dev
          ├─ Cloudflare KV：24 小時登入 Session
          ├─ Durable Object：密碼雜湊與驗證
          └─ GitHub 私有 repository：帳號與遊戲存檔
               https://github.com/sclife2003/xueba-pvz-data
```

資料分工：

| 元件 | 保存內容 | 是否需要本機開機 |
|---|---|---|
| GitHub Pages | 公開遊戲前端 | 否 |
| Cloudflare Worker | API 程式 | 否 |
| Cloudflare KV | 24 小時 Session | 否 |
| Durable Object | 密碼雜湊運算 | 否 |
| GitHub 私有 repository | 帳號 verifier 與遊戲進度 | 否 |

## 2. 目前正式環境快照

截至 2026-07-15：

| 項目 | 目前值 |
|---|---|
| Cloudflare 帳號 | `sclife2003@gmail.com` |
| Cloudflare Account ID | `f77ac7c3edf4d91acde0391ffd57f825` |
| Worker 名稱 | `xueba-pvz-account` |
| Worker 正式網址 | `https://xueba-pvz-account.sclife2003.workers.dev` |
| Worker 正式版本 | `6f820c39-0d6b-4c0d-ac99-f975d5a5b831`，100% 流量 |
| KV binding | `SESSIONS` |
| KV namespace ID | `bed0fb32df324179813b1f1ca2f68fb2` |
| Durable Object binding | `PASSWORD_HASHER` / `PasswordHasher` |
| Rate Limit binding | `AUTH_RATE_LIMITER`，8 requests / 60 秒 |
| Worker secrets | `GITHUB_TOKEN`、`PASSWORD_PEPPER` |
| 公開程式 repository | `https://github.com/sclife2003/xueba-pvz` |
| 私有資料 repository | `https://github.com/sclife2003/xueba-pvz-data` |
| 正式 Pages commit | `e5c942a6cc4c68234ef77f837a83935ae578f583` |

健康檢查：

```powershell
Invoke-RestMethod `
  -Uri 'https://xueba-pvz-account.sclife2003.workers.dev/v1/health' `
  -Method Get
```

正常結果：

```json
{
  "ok": true,
  "storage": "github-private-repository"
}
```

## 3. 目前待發布的同步策略修改

本機目前已修改、但尚未 commit／push：

- 答題、失血、首次貼紙、升級等一般進度變更：只寫入本機 `localStorage`。
- 完成每個小關卡，例如 `1-1`、`1-2`：自動同步一次雲端。
- 玩家按「立即同步」：手動同步一次。
- 註冊與首次登入：保留必要的初始上傳／下載。
- 每一波敵人結束不算通關，不會同步。
- 整個小學部／章節全部完成也不是唯一同步點；每個小關卡完成就會同步。

待發布檔案：

```text
index.html
scripts/verify_account_client.js
```

這是純前端修改，因此正式發布只需 commit 並 push GitHub Pages；不需要重新部署 Worker。

## 4. 新電腦接手既有服務

換電腦時，不要重新建立 Worker、KV、Durable Object 或 secrets。這些資源都保存在 Cloudflare 帳號內。

### 4.1 安裝必要工具

- Git
- Node.js 22 或相容版本
- GitHub CLI `gh`（需要 push 或查 Pages 時使用）

### 4.2 取得程式

```powershell
Set-Location "$env:USERPROFILE\VibeProjects"
git clone https://github.com/sclife2003/xueba-pvz.git xueba
Set-Location "$env:USERPROFILE\VibeProjects\xueba\worker"
npm ci
```

### 4.3 登入既有 Cloudflare 帳號

```powershell
npx wrangler login
npx wrangler whoami
```

`whoami` 必須顯示：

```text
Email: sclife2003@gmail.com
Account ID: f77ac7c3edf4d91acde0391ffd57f825
```

新電腦只要登入同一個 Cloudflare 帳號，就能管理既有 Worker。實際 secret 值不會下載到新電腦，也不需要重新輸入。

### 4.4 驗證既有雲端資源

```powershell
npx wrangler deployments status --name xueba-pvz-account
npx wrangler secret list --name xueba-pvz-account
npx wrangler kv namespace list
```

預期 secret 名稱：

```text
GITHUB_TOKEN
PASSWORD_PEPPER
```

## 5. GitHub fine-grained PAT 設定

PAT 用於讓 Cloudflare Worker 存取 `xueba-pvz-data` 私有 repository。PAT 只保存在 Cloudflare secret，不能放進 repository、Markdown、`wrangler.jsonc`、`.env` 或聊天紀錄。

### 5.1 建立 PAT

GitHub 路徑：

```text
Settings
→ Developer settings
→ Personal access tokens
→ Fine-grained tokens
→ Generate new token
```

建議設定：

| 欄位 | 設定 |
|---|---|
| Token name | `xueba-pvz-worker` 或其他清楚名稱 |
| Resource owner | `sclife2003` |
| Expiration | 建議 90 天或依維護政策設定固定到期日 |
| Repository access | `Only select repositories` |
| Selected repository | `xueba-pvz-data` |
| Repository permissions → Contents | `Read and write` |
| Metadata | GitHub 自動提供唯讀 |

不要選擇 `All repositories`，也不要給 Issues、Pull requests、Administration 等不必要權限。

### 5.2 把 PAT 放入 Cloudflare secret

```powershell
Set-Location "$env:USERPROFILE\VibeProjects\xueba\worker"
npx wrangler secret put GITHUB_TOKEN
```

Wrangler 顯示互動式 secret 輸入提示後，再貼上 PAT。不要把 PAT 寫在命令列參數中，也不要使用 `echo PAT`。

確認名稱存在：

```powershell
npx wrangler secret list --name xueba-pvz-account
```

### 5.3 PAT 到期或撤銷時

1. 在 GitHub 建立新的 fine-grained PAT，權限維持最小化設定。
2. 執行：

```powershell
npx wrangler secret put GITHUB_TOKEN
```

3. 互動式貼上新 PAT。
4. 驗證健康端點，再用測試帳號執行登入與「立即同步」。
5. 確認新 PAT 正常後，撤銷舊 PAT。

更換 `GITHUB_TOKEN` 不會破壞既有帳號或存檔。

## 6. PASSWORD_PEPPER 設定

`PASSWORD_PEPPER` 是伺服器端密碼保護秘密值，用於產生帳號的密碼 verifier。

首次建立時，用密碼管理器產生至少 32 bytes 的高強度隨機值，再執行：

```powershell
Set-Location "$env:USERPROFILE\VibeProjects\xueba\worker"
npx wrangler secret put PASSWORD_PEPPER
```

在 Wrangler 互動式提示中貼上，不要把值寫入任何檔案。

重要警告：

- 既有帳號建立後，不要任意更換 `PASSWORD_PEPPER`。
- 若遺失或替換 pepper，既有密碼 verifier 將無法使用，玩家會無法登入。
- 換電腦時不需要重新建立 pepper；Cloudflare 已保存正式 secret。
- `wrangler.jsonc` 中的 `secrets.required` 只列出必要名稱，不包含 secret 值。

## 7. 從零建立 Cloudflare 資源

本節只適用於全新的 Cloudflare 帳號或災難重建。一般換電腦不要執行。

### 7.1 安裝依賴並登入

```powershell
Set-Location "$env:USERPROFILE\VibeProjects\xueba\worker"
npm ci
npx wrangler --version
npx wrangler login
npx wrangler whoami
```

專案使用 Wrangler 4.x；以 repository 的 `package-lock.json` 與 `npx wrangler` 為準。

### 7.2 初始化 workers.dev 子網域

首次使用 Cloudflare Workers 時，先登入 Dashboard，開啟「Workers & Pages」頁面一次。Cloudflare 會建立帳號的 `workers.dev` 子網域。

如果沒有先初始化，部署可能出現：

```text
You need a workers.dev subdomain in order to proceed. [code: 10063]
```

處理方式：

1. 開啟 Cloudflare Dashboard。
2. 進入「Workers & Pages」首頁。
3. 等待頁面完成初始化。
4. 回到終端機重新執行 `npm run deploy`。

這個錯誤不代表程式碼或 PAT 錯誤。

### 7.3 建立 KV namespace

```powershell
npx wrangler kv namespace create SESSIONS
```

把回傳的 namespace ID 填入 `worker/wrangler.jsonc`：

```jsonc
"kv_namespaces": [
  {
    "binding": "SESSIONS",
    "id": "<KV_NAMESPACE_ID>"
  }
]
```

目前正式 ID 是：

```text
bed0fb32df324179813b1f1ca2f68fb2
```

不要在既有帳號上重複建立另一個 `SESSIONS` namespace。

### 7.4 Durable Object 與 Rate Limit

專案的 `worker/wrangler.jsonc` 已包含：

```jsonc
"durable_objects": {
  "bindings": [
    {
      "name": "PASSWORD_HASHER",
      "class_name": "PasswordHasher"
    }
  ]
},
"migrations": [
  {
    "tag": "v1",
    "new_sqlite_classes": ["PasswordHasher"]
  }
],
"ratelimits": [
  {
    "name": "AUTH_RATE_LIMITER",
    "namespace_id": "1001",
    "simple": {
      "limit": 8,
      "period": 60
    }
  }
]
```

部署時 Wrangler 會依 migration 建立 Durable Object class。不要刪除或重複使用已發布的 migration tag `v1`。

### 7.5 設定兩個 secrets

```powershell
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put PASSWORD_PEPPER
```

兩個值都必須透過互動式提示輸入。

## 8. Worker 測試與部署

只有修改以下內容時才需要部署 Worker：

- `worker/src/**`
- `worker/wrangler.jsonc`
- KV／Durable Object／Rate Limit binding
- Worker 環境變數

純 `index.html`、遊戲資產或前端同步策略修改不需要部署 Worker。

### 8.1 部署前驗證

```powershell
Set-Location "$env:USERPROFILE\VibeProjects\xueba\worker"
npm ci
npm test
npm run deploy:check
npx wrangler whoami
npx wrangler secret list --name xueba-pvz-account
```

驗證條件：

- Worker tests 全部通過，目前基線是 34/34。
- Dry run 顯示 `PASSWORD_HASHER`、`SESSIONS`、`AUTH_RATE_LIMITER`。
- `ALLOWED_ORIGINS` 必須是 `https://sclife2003.github.io`。
- `GITHUB_DATA_REPO` 必須是 `xueba-pvz-data`。
- Secret list 必須同時包含 `GITHUB_TOKEN` 與 `PASSWORD_PEPPER`。

### 8.2 正式部署

正式部署會改變 Cloudflare 基礎設施狀態，執行前應取得明確核准。

```powershell
npm run deploy
```

部署後檢查：

```powershell
npx wrangler deployments status --name xueba-pvz-account
Invoke-RestMethod `
  -Uri 'https://xueba-pvz-account.sclife2003.workers.dev/v1/health' `
  -Method Get
```

### 8.3 正式功能驗收

至少驗證：

1. 建立測試帳號。
2. 登入後顯示「已同步到雲端」。
3. 完成一個小關卡後，GitHub 私有 repository 的 save revision 增加。
4. 一般答題不應每題建立 GitHub commit。
5. 按「立即同步」後 revision 增加。
6. 第二台裝置登入能讀到最新進度。
7. 登出後舊 token 不可再存取。

## 9. GitHub Pages 前端發布

GitHub Pages 目前使用公開 repository `sclife2003/xueba-pvz` 的 `main` 分支發布。

### 9.1 前端驗證

```powershell
Set-Location "$env:USERPROFILE\VibeProjects\xueba"
node scripts\verify_account_client.js
node scripts\verify_game_contracts.js
git diff --check
git status --short --branch
```

### 9.2 發布「通關或手動同步」修改

目前工作區另有 tickets／handoff 的未提交內容，所以必須只 stage 本次兩個檔案：

```powershell
git add -- index.html scripts\verify_account_client.js
git diff --cached --stat
git diff --cached
git commit -m "perf(account): sync only on level completion"
git push origin main
```

禁止使用 `git add .`，避免把 tickets 001–004、handoff 或其他 BOSS 工作一起提交。

### 9.3 確認 Pages 發布完成

```powershell
gh api repos/sclife2003/xueba-pvz/pages/builds/latest
```

確認：

- `status` 是 `built`。
- `commit` 等於剛推送的 commit SHA。
- `https://sclife2003.github.io/xueba-pvz/` 回傳 HTTP 200。
- `account-service.json` 仍指向正式 Worker。

## 10. 公開前端設定

`account-service.json` 是公開設定，不得包含 secret：

```json
{
  "enabled": true,
  "apiBaseUrl": "https://xueba-pvz-account.sclife2003.workers.dev"
}
```

允許公開：

- Worker URL
- Cloudflare Account ID
- KV namespace ID
- Repository 名稱
- Secret 名稱

禁止公開：

- GitHub PAT 實際值
- `PASSWORD_PEPPER` 實際值
- 玩家密碼
- Bearer Session token
- Cloudflare OAuth token

## 11. 常見問題與排錯

### 11.1 Cloudflare 錯誤 10063

症狀：

```text
You need a workers.dev subdomain in order to proceed.
```

原因：Cloudflare 帳號尚未初始化 `workers.dev` 子網域。開啟 Dashboard 的 Workers 頁面一次，再重新部署。

### 11.2 Worker 健康正常，但登入／同步回傳 503

優先檢查：

```powershell
npx wrangler secret list --name xueba-pvz-account
npx wrangler tail xueba-pvz-account --status error
```

常見原因：

- PAT 到期或被撤銷。
- PAT 沒有選到 `xueba-pvz-data`。
- PAT 的 Contents 權限不是 `Read and write`。
- GitHub API 暫時受限。

不要在排錯輸出中列印 PAT 或 secret 值。

### 11.3 瀏覽器顯示 CORS 錯誤

確認 `worker/wrangler.jsonc`：

```jsonc
"ALLOWED_ORIGINS": "https://sclife2003.github.io"
```

不要填入路徑 `/xueba-pvz/`，CORS origin 只包含協定與主機名。

### 11.4 Wrangler 登入錯誤或帳號不符

```powershell
npx wrangler logout
npx wrangler login
npx wrangler whoami
```

確認登入 `sclife2003@gmail.com` 與正確 Account ID。

### 11.5 密碼雜湊錯誤

Cloudflare Workers 的 PBKDF2 iteration 上限是 100,000。專案目前固定使用 100,000，不要擅自改回高於此值。

### 11.6 GitHub API 容量限制

目前每次雲端存檔都會更新 GitHub Contents API 並建立 commit。因此已改為「小關卡通關或手動同步」，不要恢復每次答題都同步。

## 12. 回復與回滾

### 12.1 Worker 回滾

```powershell
npx wrangler versions list --name xueba-pvz-account
npx wrangler rollback <VERSION_ID>
```

回滾會改變正式流量，必須先取得明確核准。

### 12.2 GitHub Pages 回滾

使用新的 revert commit，不要使用 `git reset --hard` 或強制改寫已發布歷史：

```powershell
git revert <BAD_COMMIT_SHA>
git push origin main
```

### 12.3 Secret 外洩處理

若 PAT 外洩：

1. 立即在 GitHub revoke PAT。
2. 建立新的最小權限 fine-grained PAT。
3. 執行 `npx wrangler secret put GITHUB_TOKEN`。
4. 檢查 GitHub repository audit／commit 狀態。
5. 驗證登入與同步。

若 `PASSWORD_PEPPER` 外洩，不能直接無計畫更換；必須先設計帳號 verifier migration 或要求所有帳號重建密碼。

## 13. 發布前最終清單

### Worker 修改

- [ ] `npm test` 全部通過。
- [ ] `npm run deploy:check` 通過。
- [ ] `npx wrangler whoami` 是正確帳號。
- [ ] Secret 名稱齊全。
- [ ] 沒有 secret 被寫入 Git diff。
- [ ] 已取得正式部署核准。
- [ ] `npm run deploy` 成功。
- [ ] Deployment status 顯示新版本 100% 流量。
- [ ] 健康端點 HTTP 200。
- [ ] 真實登入與同步成功。

### GitHub Pages 修改

- [ ] `verify_account_client.js` 通過。
- [ ] `verify_game_contracts.js` 通過。
- [ ] `git diff --check` 通過。
- [ ] 只 stage 本次檔案。
- [ ] Secret scan 無發現。
- [ ] 已取得 push／發布核准。
- [ ] Pages build 狀態為 `built`。
- [ ] 正式網站 HTTP 200。
- [ ] 通關同步與手動同步已在正式頁面驗收。

## 14. 快速判斷：何時需要做什麼

| 變更 | 要 push GitHub | 要部署 Worker | 要重新設定 PAT |
|---|---:|---:|---:|
| 修改遊戲畫面／`index.html` | 是 | 否 | 否 |
| 修改通關同步策略 | 是 | 否 | 否 |
| 修改 Worker API 程式 | 是 | 是 | 否 |
| 修改 `wrangler.jsonc` binding | 是 | 是 | 否 |
| PAT 到期／撤銷 | 否 | 使用 `secret put` | 是 |
| 換電腦 | 否 | 否 | 否 |
| 關閉舊電腦 | 否 | 否 | 否 |

最重要原則：既有 Cloudflare 與 GitHub 資源都在雲端。換電腦只需 clone 程式並登入同一帳號；不要重建 KV、不要重建 Worker，也不要更換 `PASSWORD_PEPPER`。
