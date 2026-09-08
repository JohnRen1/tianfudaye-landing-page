# LAN 启动配置

落地页开发白名单与一键启动的手机访问地址从当前网卡自动读取，不再使用 `TAX_LAN_IP` 或固定 IP。已有环境变量可以移除；即使保留，也不会影响这两处配置。

- 运行 `pnpm dev`，或按原流程使用 `pnpm tax-ai:up`。一键启动保留 `0.0.0.0` 监听，多网卡时列出多个候选地址，手机须与所选网卡处于同一局域网。
- 小程序仍使用 `pnpm dev:weapp:lan`。换网后重启落地页与小程序编译，再重新扫码；已编译的小程序不会自动发现电脑的新地址。
- 白名单只影响 Next 开发资源访问，不替代网络连通、端口监听或小程序平台配置；本修改不处理 AppID/AppSecret 缺失。
- 管理后台生成活动二维码的 `PUBLIC_LANDING_PAGE_URL` 不在此次修改范围内。

验证：`node --test scripts/lan-addresses.test.mjs`，`bash -n scripts/local-tax-ai.sh`。
