# 财税问答本地启动约束

本文件补充父目录规则。当前交接文件为 `docs/context.md`，启动说明为 `docs/一键启动.md`。

- 用户已确认使用 V1 Agent（0.3.0）+ V2 RAG。V2 Agent 暂时停用，仅保留源码与历史。
- 本地启动入口为 `pnpm run tax-ai:up`；默认 Agent 源码为相邻目录 `税务Agent客服-v1-local`，镜像为 `tax-agent-service:v1-agent-v2-rag-local`。
- 不把 `税务Agent客服` 主目录中的 V2 Agent 或旧的 0.4.0 镜像重新设为默认；重新启用 V2 需要用户明确改变当前决定。
- 保持 `tax-ai:up/down/status/logs` 命令兼容。`tax-ai:check` 只作离线配置检查。
- 用户可通过 `pnpm run tax-ai:test` 进入独立测试页 `http://127.0.0.1:8788`，不启动网站或要求验证码登录；测试页只转发现有 V1 `/chat` 协议，不改变问答逻辑。
- 源码版本、镜像版本与实际运行版本分别验证；已有镜像默认复用，修改 V1 源码后使用 `TAX_AGENT_SKIP_BUILD=0` 重建。
- 外部信息检索关闭，政策资料由用户手动更新；模型 API 调用仍然保留。
- 本地测试授权不等于云端发布授权。用户将完成多轮人工验证后自行上传云端。
- 相关回归：`pnpm exec vitest run __tests__/local-tax-ai-startup.test.ts`；脚本语法：`bash -n scripts/local-tax-ai.sh`。
