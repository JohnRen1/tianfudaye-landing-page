# 财税问答本地测试交接

最后更新：2026-10-19。会话：「主业务-V2」`01a04136-e7d4-7862-991e-d021f1f39f5c`。
项目规则：根目录 `AGENTS.md`；操作说明：`docs/一键启动.md`。

## 已确认决定

- 用户于 2026-08-28 选择 V1 Agent + V2 RAG，2026-10-19 明确要求在项目中执行，Agent V2 先停用。
- V1 保留自然回答、解释与必要追问；V2 RAG 保留条款检索、时效、关系链与导图证据。
- 外部信息搜索关闭，RAG 由用户手动更新；DeepSeek 模型 API 继续使用。
- 用户完成几轮本地人工测试后自行上传云端。本轮未获得云端切换或发布授权。

## implemented

- `scripts/local-tax-ai.sh` 默认使用相邻 `税务Agent客服-v1-local`，源码版本要求 0.3.0；默认镜像 `tax-agent-service:v1-agent-v2-rag-local`。
- 已有镜像默认直接复用，缺失时首次构建。`TAX_AGENT_SKIP_BUILD=0` 明确重建，`=1` 禁止自动构建。
- 启动前核验源码、有效 V2 集合和镜像内已安装版本；运行后检查 Agent `/health.version=0.3.0`、RAG `/health.collection` 与有效配置相符。
- `pnpm run tax-ai:check` 作离线配置检查；`up/down/status/logs` 保留，状态命令显示目标组合和镜像。
- 新增 `pnpm run tax-ai:test`：仅启动 Qdrant、V2 RAG、V1 Agent 和 `127.0.0.1:8788` 独立测试页，跳过 Next.js、网站登录和短信验证码；`bash scripts/local-tax-ai.sh check-test` 可仅预检该模式。
- 独立页代码位于 V1 Agent 的 `devtools/chat-test/`，转发服务 `scripts/local_chat_test.py`；密钥只留服务端，SSE 原样转发，不更改问答逻辑。
- V2 主目录 `税务Agent客服/docker_start.sh` 直接提示暂时停用并退出，README 和项目规则保留该决定。
- V1 核心应用代码、本地法规数据、已有人工审核结果、Qdrant 集合均未修改。V1 原有 `docker_start.sh` 未提交修改保留；只在该目录增加独立开发测试工具。

## verified

- `pnpm run tax-ai:check`：实际目录与接口密钥配对通过；RAG 集合为 `tax_regulations_v2_20260901`。
- `pnpm run tax-ai:status`：显示目标组合，四项服务均未运行。
- `pnpm test --run`：17 个测试文件、101 项测试通过；其中启动脚本公共命令回归 15 项，包含不依赖 Next/网站配置的独立测试启动。
- 启动测试使用临时项目及 Docker/curl 的测试替身，覆盖复用、构建、错误版本和集合拦截，不代表真实容器问答测试。
- `pnpm exec tsc --noEmit --incremental false`：通过。
- V1 Agent `.venv/bin/python -m pytest -q -p no:cacheprovider`：68 项通过（新增独立页服务测试 9 项）。测试时置空 RAG/模型连接，审计写入临时目录。
- 独立页浏览器验证使用隔离合成数据，覆盖多轮、流式成功/中断/停止、富文本、引用、新会话、导出，不能代替真实 DeepSeek 问答质量验收。
- 两个启动脚本 `bash -n`、`git diff --check` 通过；直接调用 V2 启动器会退出并提示 V1 入口。
- 本轮改动经独立只读审查，未发现阻断当前需求的确定问题；真实容器验证仍受 Docker daemon 未启动限制。

## pending / blocked

- Docker daemon 未启动，未核实目标镜像是否存在，未启动容器或进行真实 DeepSeek + V2 RAG 多轮回答验收。
- `pnpm lint` 无法运行：`eslint: command not found`。本次没有安装无关依赖或绕过检查。
- `pnpm build` 因 Google Fonts 的 Geist Mono 下载连接失败而中止；来源为既有 `app/layout.tsx` 字体依赖，本轮未修改该页面或字体。
- 人工问答质量、真实引用、上下文和流式回答完成信号由后续本地测试验收；云端尚未更新。

## 下一步

1. 打开 Docker Desktop，在本目录执行 `pnpm run tax-ai:test`；无需再手工选择 V1 目录或镜像，也不需要启动网站。
2. 打开 `http://127.0.0.1:8788`，连续测试退休、发票和政策时效等问题。若要完整落地页仍可执行 `pnpm run tax-ai:up` 并访问 `http://127.0.0.1:3000/tax-ai`。
3. 保存真实回答和引用。人工测试通过后，以 V1 目录作为 Agent 镜像构建上下文，再单独制定云端上传和切换步骤。
