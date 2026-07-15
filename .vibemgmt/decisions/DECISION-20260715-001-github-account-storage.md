---
type: decision
status: accepted
owner: Codex QA
created: 2026-07-15
related_ticket: TICKET-20260715-005
---

# Decision: GitHub-backed lightweight account service

## User decision

BOSS 要求：玩家可直接建立簡單帳號密碼、跨裝置同步遊戲進度，資料存放在 GitHub。這項產品要求取代 Ticket 005 舊有的 Supabase / Magic Link 草案。

## Chosen architecture

```text
GitHub Pages (public game)
  -> account-service.json (public Worker URL only)
  -> Cloudflare Worker (auth, validation, rate limit, GitHub token)
       -> PasswordHasher Durable Object (PBKDF2 compute, internal only)
       -> Cloudflare KV (24-hour opaque sessions)
       -> private GitHub repo (account verifier + save JSON)
```

- Pages 是靜態前端，不保存 GitHub write token、pepper 或密碼。
- Worker 接受 `register/login/logout/save`，限制允許的 Pages origin，並在 server side 驗證存檔。
- Cloudflare Free 的一般 Worker CPU 預算不足以穩定承擔密碼雜湊；因此 PBKDF2 隔離到 Free plan 可用、每次 invocation 具較高 CPU limit 的內部 SQLite-backed Durable Object。物件沒有公開 route，API 缺少 binding 時直接 503。
- 帳號名稱正規化為 3–20 個小寫英數字與 `._-`；密碼 10–128 字元。
- 密碼先以 secret pepper 做 HMAC-SHA256，再以每帳號隨機 salt 執行 PBKDF2-HMAC-SHA512 100,000 次（Cloudflare Workers Web Crypto 支援上限）；GitHub 只保存 verifier，不保存明文密碼。
- session token 為 256-bit opaque random value；KV key 只保存 token SHA-256 digest，TTL 86,400 秒，logout 立即刪除。
- private data repo 使用不可逆 username hash 當 account path，隨機 UUID 當 save path，避免把使用者名稱暴露在檔名。
- 存檔採 local-first：遊戲先寫既有 `xueba_pvz_save_v1`，登入後 1.5 秒 debounce 上傳。
- 每次雲端更新必須同時符合 app revision 與 GitHub blob SHA；落後裝置收到 409 與目前雲端副本，由玩家明確選擇，不做 last-write-wins。
- 第一版單一 slot，不做 email recovery、排行榜、社群、存檔歷史或自動合併。

## Implemented and deployed

- `worker/src/`: Worker API、PasswordHasher Durable Object、password verifier、KV session、GitHub Contents store。
- `worker/test/`: 34 個 auth/storage/CAS/isolation/validation/runtime-compatibility tests。
- `worker/wrangler.jsonc`: SQLite Durable Object migration、KV、rate-limit binding、公開 vars 與 secret name contract。
- `index.html`: 小書包識別牌 UI、register/login/logout/manual sync、session restore、local-first debounce、衝突選擇。
- `account-service.json`: `enabled:true`，指向正式 `xueba-pvz-account.sclife2003.workers.dev`。
- `scripts/verify_account_client.js`: 前端同步與憑證保存契約。

## Verification evidence

- Worker tests: 34/34 pass。
- Account client contracts: pass。
- Existing game contracts: pass。
- Headless Chromium: account panel + mocked registration/sync pass；無 page error，token 僅存在 `sessionStorage`，密碼與 token 未進 `localStorage`。
- Production Worker `6f820c39-0d6b-4c0d-ac99-f975d5a5b831`: 100% traffic，startup 5 ms；KV、Rate Limit 與 PasswordHasher Durable Object bindings 正常。
- Production E2E: register 201、device B login 200、revision 1 restore、revision 2 update、stale revision 409、雙 logout 204、revoked session 401。
- Production abuse case: 256 KiB chunked body 在 byte limit 提前中止並回 `413 PAYLOAD_TOO_LARGE`。
- Private GitHub repo: visibility `PRIVATE`；account 只有 PBKDF2 verifier/salt/digest，無明文密碼欄位；save revision 2 與 payload 已驗證。
- `npm audit --omit=dev`: 0 vulnerabilities。
- Secret pattern scan: no PAT/private key/connection-string finding。
- Wrangler dry-run: pass。

## Production activation gate

帳號／跨裝置同步部分已完成；Ticket 005 只因素材 cache versioning 尚未實作而保持 open。

1. [完成] 建立 private GitHub data repo `sclife2003/xueba-pvz-data`，並以無秘密 README 初始化 `main`。
2. [完成] 建立只對該 repo 有 Contents read/write 的 fine-grained GitHub token。
3. [完成] Cloudflare 建立 KV namespace，設定 `GITHUB_TOKEN` 與隨機 `PASSWORD_PEPPER` secrets；Durable Object 由 `v1` SQLite migration 建立。
4. [完成] 將 KV id、owner/repo/branch 與精確 Pages origin 寫入正式 Worker config並部署。
5. [完成] 以 Worker `/v1/health` 驗證 no-store/CORS，並把 `account-service.json` 改為正式 URL + `enabled:true`。
6. [完成] 裝置 A 建帳號並產生進度；裝置 B 登入還原；舊 revision 收到 409 與最新版雲端副本，前端兩個衝突選項 contract 通過。
7. [完成] 驗證 private repo 只出現 verifier/save JSON，secret scan 與 dependency audit 無 finding。

## Review outcome

- 首輪 review：REQUEST CHANGES（2 Severe、1 Moderate），涵蓋 409 後 debounce 競態、大型 streaming body 無界緩衝、HP-only 存檔誤判空白。
- 修正方式：衝突狀態取消 pending timer 並由 `syncNow` fail-closed；request body 改 bounded stream reader；`isDefaultSave` 納入 HP。
- 複審：APPROVE；0 Blocking、0 Severe、0 Moderate。完整紀錄見 `.vibemgmt/reviews/QA_2026-07-15_account-service.md`。

## Rollback

把 `account-service.json` 切回 `enabled:false` 即回到 local-only；不得刪除 private repo、KV sessions 或玩家本機存檔。修復 Worker 後再重新啟用。

## Official references

- GitHub Pages static site limits: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- GitHub repository contents API: https://docs.github.com/en/rest/repos/contents
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Worker rate limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- OWASP password storage: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP session management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
