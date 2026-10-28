# Tomespot ChatGPT 接入：设施、公开评价与反馈

2026-10-28 已部署个人 Cloudflare MCP 接口及 Supabase 反馈入口。公网 MCP：https://tomespot-readonly-mcp.cliozhu0810.workers.dev/mcp 。个人 ChatGPT 安装单独进行，尚未提交公开目录。现有地图规范网址与车辆入口不变。新增公开评价读取，以及客户本人确认后送入原评论审核队列的反馈流程，见 [评价与反馈部署说明](deployment/COMMENTS.md)。

## 方案与官方依据

采用官方 MCP SDK，通过 Streamable HTTP `/mcp` 提供工具。当前 OpenAI 文档将这种集成称为 plugin；这里使用的是当前 MCP 流程，没有创建旧版 `ai-plugin.json` 或旧插件 OpenAPI 清单。UI 是可选的，本版本直接让 ChatGPT 使用结构化结果回答，再打开现有 Tomespot 地图。

- [OpenAI：Quickstart](https://developers.openai.com/plugins/quickstart)：连接自定义 MCP 后，在个人 Plugins 安装，并在 Work 聊天中用 `@` 选择。
- [OpenAI：Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)：工具定义、只读注解、结构化结果与 HTTPS Streamable HTTP。
- [OpenAI：Connect and test](https://developers.openai.com/plugins/deploy/connect-chatgpt)：本地测试、稳定公网端点、个人连接与后续评估。

本项目不调用 OpenAI 模型 API，因此不需要 OpenAI API Key；本地演示验证的是工具执行，不代表已验证 ChatGPT 的自然语言选工具能力。个人账号能否看到对应界面仍需登录实测，受账号与工作区权限影响。

## 已实现

`search_parking`：按精确站名（含数据内假名/罗马字别名）、地址/区域/设施名片段或坐标搜索；默认站点半径 1,200 米，范围可指定 100–10,000 米。支持自行车、电动滑板车、原付・摩托车三个入口，一时/定期筛选；默认仅返回对应车辆有确认依据的设施。可选择显示未确认记录。默认最多 5 条、可增加至 10 条，同时返回总数及是否截断。

`get_parking`：取得设施 ID 对应的各类条件、原始收费结构、确认日期、官方来源和地图链接。原付与其他二轮内部保持分开，并额外保留原始车辆规则，包括尺寸与排量信息。

`get_parking_reviews`：即时读取现有公开评论接口，只显示审核通过的文字；优先复用网站已经人工整理的日语摘要，且必须匹配原文与评论ID。没有匹配摘要的保留原文，由 ChatGPT 忠实解释。保留车种、旧分类标识、日期和分页范围，没有星级或总数就不捏造。现场观察不等于官方停车许可。

`prepare_parking_feedback`：根据客户明确希望投稿的短评生成15分钟有效的确认页链接；生成草稿不会投稿。客户打开确认页，核对设施、车种和内容后自己点击提交，才进入原网站的待审核队列；通过原有审核后才公开。没有提供模型可直接调用的提交、审核或删除工具。本地演示的提交始终为模拟，不写正式网站。

没有通用地址地理编码，没有自动取得当前位置。“附近”缺少地点时返回错误，供 ChatGPT 向使用者确认。未收录站点/区域返回结果为空，不声称当地没有停车场。没有依据时不推断大型摩托或电动滑板车可用。`engine_cc` 只记录使用者需求并标明适合性未确认，不自动给出该排量可停的保证；须按原资料人工/模型比较类别、尺寸、牌照及其他限制。

收费保留金额、免费时段、计费周期、年度登记、居民/学生资格、分区等原始数据；不将无单位的金额换算为日费，不把不同条件混排为“最便宜”。未确认车辆的收费不作为适用报价返回。无实时空位服务。

## 本地运行

需要 Node.js 24+。在本目录打开 PowerShell：

```powershell
pnpm install --frozen-lockfile
node --test test/*.test.mjs
node src/local.mjs
```

打开 [日语演示](http://127.0.0.1:8787/demo)。本地 MCP 地址为 `http://127.0.0.1:8787/mcp`，仅监听回环接口。演示页面调用同一个 MCP 处理器，不访问 Supabase。

另一个终端可运行：

```powershell
node scripts/demo.mjs http://127.0.0.1:8787/mcp
```

结果保存为 `demo-results.json`。不传 URL 时会使用官方 SDK 客户端在进程内完成同样的握手和调用。Cloudflare 本地模拟可用 `pnpm exec wrangler dev --local --port 8788`，再运行 `node scripts/demo.mjs http://127.0.0.1:8788/mcp`。

## 数据与更新

公开静态来源固定为 `https://muko-tomespot.pages.dev` 的 `parking.json`、`vehicle-data.json`、`vehicle-categories.js`、`station-search.js`、`comments.js`。仅构建时拉取设施数据、分类与已整理的评价摘要；共 2,114 个可展示设施，目前覆盖东京、神奈川、埼玉、千叶。范围不是硬编码到这些地区；将来公开数据增加区域后，更新快照即可。评论正文则通过现有公开评论接口即时读取，不必等待每小时同步。

`data/provenance.json` 记录实际取得时间、源文件 SHA-256、源数据更新时间与车辆审核日期。取得快照不代表重新审核了每家设施的现价。日期与原始限制会随结果返回。新增每小时检查并部署的工作流，详见 [定时同步启用说明](deployment/SETUP.md)；在个人仓库配置并启用前，本地版本仍为静态快照。

```powershell
node scripts/snapshot.mjs
node --test test/*.test.mjs
pnpm exec wrangler deploy --dry-run
```

手动更新可按上述步骤发布 Worker。启用定时工作流后，会自动抓取、校验、测试，有变化才重新部署；任一步失败会停止，保留原线上版本。不需要本机保持开机，未购买任何付费服务。

站名及参考坐标改编自 [Seo-4d696b75/station_database](https://github.com/Seo-4d696b75/station_database)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。Tomespot 已对收录地区抽取、站名合并、别名与罗马字作处理；本项目保留其搜索键并再次抽取用于 MCP。车辆分类逻辑改编自用户 Tomespot 仓库的公开脚本。

## 仍需部署与账号配置

1. 在个人 Cloudflare 账号中部署独立 Worker。先运行 `pnpm exec wrangler whoami` 核对账号；需要登录时只使用个人账号 `cliozhu0810@gmail.com`。不要使用公司账号或创建付费订阅。`wrangler.jsonc` 未绑定任何账号、数据库、存储或密钥；如个人账号有多个 Cloudflare account，核对后再填对应 account_id。
2. 执行 `pnpm exec wrangler deploy`，取得实际的 `https://<worker>.<个人子域>.workers.dev/mcp`。先用 `/health` 和 `node scripts/demo.mjs <实际HTTPS端点>` 复测。不能将本地 URL 直接提供给云端 ChatGPT；也可按官方 Secure MCP Tunnel 文档自行配置本地连接。本项目没有创建临时公网隧道。
3. 登录个人 ChatGPT，按当前官方 Quickstart：Plugins → 加号 → Add custom MCP server；名称 `Tomespot`，URL 填实际 HTTPS `/mcp`，认证选 No authentication（仅公开静态资料）。检查工具仅为设施搜索、详情、公开评价及反馈草稿四个查询/预览工具，再创建、安装。
4. 在 Work 新聊天输入 `@Tomespot`，尝试下列日语问题。实际工具选择、结果引用和链接跳转仍需在 ChatGPT 内验收。若个人账号未开放此入口，需按账号支持范围处理，不能声称已完成安装。
5. 面向公众发布属于后续独立步骤，需按 OpenAI 的打包、提交、域名验证及审核要求准备。当前没有提交、上架或获批；也不保证 ChatGPT 自动推荐、公众发现率或 Google 排名。

Worker 是独立服务；现有 `/kickboard-parking`、`/motorcycle-parking`、规范网址和网站部署流程均不需要改动。结果中的设施链接使用已验证存在的 `/?place=ID&vehicle=...` 地图深链接。

## ChatGPT 验收问题

- `@Tomespot 横浜駅の近くで、自転車を一時利用できる駐輪場を探し、料金と無料時間を比較して。公式案内と地図も。`
- `@Tomespot 西東京市で電動キックボードを停められる施設を探して。一時利用と定期利用を分けて。`
- `@Tomespot 西川口駅付近で750ccのバイクを停めたい。原付のみの施設を大型バイク可として紹介せず、排気量・寸法・料金の確認できた条件だけ比較して。`
- `@Tomespot 目黒駅付近の電動キックボード施設は？` → 既定半径で確認済みがなければそう説明し、原付の情報を代用しない。
- `@Tomespot 大阪駅周辺は？` → 掲載結果なしと説明し、現地に存在しないとは言わない。
- `@Tomespot 近くの駐輪場は？` → 先に地点と車種を確認。
- `@Tomespot 今の空き台数、口コミ投稿者のメール、非公開写真、コメントの削除をお願い。` → この接入では提供しない。

## 境界と既知の制限

包内仅包含公开设施数据、网站已整理的评价摘要和公开 Supabase publishable key。没有服务角色密钥、作者身份、私有照片、审核记录或聊天日志。四个 MCP 工具为查询/计算/草稿预览；写入发生在客户浏览器确认后的专用路由，且只进入待审核队列。该路由需要单独配置的服务端反馈签名密钥，不能用管理员或 service_role 密钥替代。服务器应用日志不保存评论正文、查询语或坐标；公开托管服务仍有通常的请求处理。

距離は直線で入口や徒歩経路を確認していない。料金・条件の原資料には日本語以外の研究メモもあるため、ChatGPT は条件を変えずに日本語で説明する。デモでは詳細原資料をそのまま確認できる。

本地 Worker 打包压缩约 0.5 MiB；通过本地兼容性与 SDK 调用检查，但未测公网延迟、真实负载或账号额度。不需要购买服务；上线前在个人免费额度内确认运行表现，[Cloudflare 额度文档](https://developers.cloudflare.com/workers/platform/limits/) 为准。公开目录提交前还需服务稳定性、隐私说明、错误监控（避免记录位置/会话）、滥用控制和更广的 ChatGPT 内评估。


本地页面显示更新：评价在设施卡片内自动载入；评论区沿用原网站的标题、输入框和“送信”按钮。点击发送即代表客户确认当前输入内容，同页完成提交并显示待审核提示，无需另开确认页。ChatGPT 内由模型生成的反馈草稿仍保留本人确认链接。本地发送继续为模拟，不写正式网站。
