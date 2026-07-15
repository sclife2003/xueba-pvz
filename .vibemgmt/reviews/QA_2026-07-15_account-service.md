---
type: qa-review
status: approved
owner: Codex QA
created: 2026-07-15
scope: github-backed-account-service
related_ticket: TICKET-20260715-005
---

# QA Review: GitHub-backed account service

## Scope

- GitHub Pages 帳號 UI 與 local-first sync client。
- Cloudflare Worker auth、CORS、rate limit、KV session、PasswordHasher Durable Object。
- private GitHub Contents store、revision + blob SHA CAS、409 conflict。
- secrets、部署設定與 production E2E。

## Initial findings

1. **Severe - Data loss**：409 conflict 後，既有 debounce timer 可能用最新 revision 自動覆寫雲端，繞過玩家選擇。
2. **Severe - Availability**：先 `request.text()` 再檢查 150 KiB，無法阻止大型 streaming body 消耗 Worker 記憶體。
3. **Moderate - Data loss**：`isDefaultSave()` 漏看 `hp`，HP-only 本機進度可能被誤判為空白。

首輪結論：**REQUEST CHANGES**。

## Resolution

- 進入 conflict 時取消 pending save；`syncNow()` 在 conflict 預設拒絕寫入，只有玩家明確選「保留本機」時用 explicit override。
- `readJsonBody()` 改為 bounded stream reader，以 raw byte count 在 150 KiB 上限立即 cancel；`Content-Length` 僅作 fast reject。
- `isDefaultSave()` 納入 `hp`。
- 新增 409 in-flight + queued debounce race regression，以及 100 x 64 KiB chunked stream early-cancel regression。

## Verification

- Reviewer re-review：**APPROVE**；0 Blocking、0 Severe、0 Moderate。
- Worker tests：34/34 pass。
- Account client contracts：pass，包含 409 後 PUT count 保持 1。
- Existing game contracts：pass。
- Wrangler dry-run：pass。
- Production Worker version：`6f820c39-0d6b-4c0d-ac99-f975d5a5b831`，100% traffic，startup 5 ms。
- Production chunked 256 KiB probe：`413 PAYLOAD_TOO_LARGE`。
- Production device A/B flow：register 201、login 200、restore revision 1、update revision 2、stale write 409、logout 204、revoked session 401。
- Private GitHub repo：PRIVATE；verifier 有 salt/digest、無明文密碼欄位；save revision 2。
- Staged high-confidence secret scan：0 finding。

## Final decision

**APPROVED** for commit and GitHub Pages publication. Ticket 005 的帳號／跨裝置同步範圍完成；素材 cache versioning 仍另行處理。
