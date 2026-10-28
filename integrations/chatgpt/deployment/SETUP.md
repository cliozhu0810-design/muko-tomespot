# 每小时同步公开设施数据

此工作流管理正式 MCP 数据同步。具体启用状态及最近运行结果请查看本仓库 GitHub Actions。这里的“定时”是服务部署工作流，不是聊天提醒。

## 行为

每小时第 17 分钟，个人 GitHub 仓库检查网站五个公开静态文件（设施数据、分类、站点搜索和页面已整理的评价摘要）。文件内容指纹未变化就结束，不重新部署；有变化则生成新快照，运行全部测试和 Worker 打包检查，通过后部署独立 MCP Worker。同步任务不会投稿、读取审核队列或访问照片。公开评论正文在客户查询时即时读取；反馈由客户确认后独立提交，见 [评论接入](COMMENTS.md)。

数据损坏、为空、ID 重复、来源请求失败、MCP 健康检查失败或测试失败时，不部署，保留上一份线上数据。可以在 GitHub Actions 查看失败原因；搜索结果中的 `snapshotRetrievedAt` 表示当前实际使用版本的获取时间。`/health` 同时提供指纹与数据时间。最近一次成功“检查时间”在 Actions 运行摘要中，数据未变时不改写线上快照获取时间。

已经生成的 ChatGPT 回答不会改写；后续工具查询使用重新部署后的数据。

## 首次启用

1. 将本包放入个人仓库 `cliozhu0810-design/muko-tomespot` 的 `integrations/chatgpt/`。只添加新目录，不覆盖网站原有代码或未提交工作。
2. 将 `deployment/tomespot-sync.yml` 复制到仓库根目录的 `.github/workflows/tomespot-sync.yml`，并合入默认分支。单独放在本包的 `deployment/` 中不会执行。
3. 按 [Cloudflare 官方 CI 配置](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) 在个人 Cloudflare 创建限定于个人账号的 Worker 部署 token。不要使用公司账号、全局 API Key 或 Supabase 密钥。将 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 保存为这个个人 GitHub 仓库的 Actions Secrets；不要把值写进代码或聊天。部署 token 只注入部署步骤，不提供给公开数据抓取步骤。
4. 首次部署：在 GitHub Actions 选择 `Sync Tomespot public parking data`，手动运行并勾选 `force_deploy`。这会跳过与旧端点的比较，但仍须完成公开数据转换、全部测试和打包检查。
5. 取得实际 Worker URL 后，在仓库 Actions Variables 中配置 `TOMESPOT_MCP_URL`，值为实际 HTTPS 地址并以 `/mcp` 结尾。再手动运行一次，不勾选强制部署，验证未变化时正确跳过。然后在个人 ChatGPT 中连接同一端点。
6. 确认下一次定时运行成功。如果只修改了 MCP 代码、公开数据没变化，可手动勾选 `force_deploy` 发布代码更新；本工作流不会因普通网站代码提交而自动触发部署。

2026-10-28 已在个人仓库启用此工作流，保存限定于个人 Cloudflare 的部署凭据与正式 MCP URL。首次强制部署及数据未变化时跳过部署均已在 GitHub Actions 成功验证。

## 运行频率和限制

每小时检查一次，通常在网站更新后的下一次任务完成后生效，不保证一小时以内。GitHub 官方说明定时运行可能延迟，且公开仓库连续 60 天没有活动时会自动禁用定时工作流；届时需要重新启用。详见 [GitHub schedule 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。按个人账号现有 Actions 与 Cloudflare 额度运行，不添加付费订阅。

## 本地验证

```powershell
node --test test/*.test.mjs
node scripts/snapshot.mjs
pnpm exec wrangler deploy --dry-run
```

`scripts/sync.mjs` 可在具有 `TOMESPOT_MCP_URL` 环境变量的终端中检查线上指纹。它本身不会部署；只有工作流后续的 `wrangler deploy` 步骤会发布。
