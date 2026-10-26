import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let fixture: string;
let landing: string;
let agent: string;
let rag: string;

function put(path: string, content = "") {
  writeFileSync(path, content);
}

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "tax-ai-startup-"));
  landing = join(fixture, "landing");
  agent = join(fixture, "税务Agent客服-v1-local");
  rag = join(fixture, "rag");
  for (const path of [join(landing, "scripts"), join(agent, "scripts"), join(agent, ".venv/bin"),
    join(rag, ".venv/bin"), join(landing, "node_modules/next/dist/bin")]) {
    mkdirSync(path, { recursive: true });
  }
  copyFileSync("scripts/local-tax-ai.sh", join(landing, "scripts/local-tax-ai.sh"));
  put(join(agent, "pyproject.toml"), '[project]\nname="tax-agent-service"\nversion="0.3.0"\n');
  put(join(agent, ".env"), "AGENT_API_KEY=fixture-agent\nRAG_API_KEY=fixture-rag\nPORT=8003\nRAG_BASE_URL=http://host.docker.internal:8010\nEXTERNAL_SEARCH_ENABLED=false\n");
  put(join(rag, ".env"), "RAG_API_KEY=fixture-rag\nQDRANT_URL=http://127.0.0.1:6335\nAPI_HOST=0.0.0.0\nAPI_PORT=8010\nCOLLECTION_NAME=tax_regulations_v2_fixture\n");
  put(join(landing, ".env.local"), "APP_ENV=dev\nTAX_AGENT_API_KEY=fixture-agent\nRAG_CHAT_URL=http://127.0.0.1:8003/chat\n");
  put(join(agent, "scripts/local_chat_test.py"), "# fixture local test UI\n");
  for (const path of [join(agent, ".venv/bin/python"), join(rag, ".venv/bin/python"),
    join(landing, "node_modules/next/dist/bin/next")]) {
    put(path, "#!/bin/sh\nexit 0\n");
    chmodSync(path, 0o755);
  }
});

afterEach(() => rmSync(fixture, { recursive: true, force: true }));

function run(command: string, overrides: Record<string, string> = {}) {
  const env = { ...process.env };
  for (const name of ["TAX_AGENT_ROOT", "TAX_AGENT_IMAGE", "TAX_AGENT_SKIP_BUILD", "COLLECTION_NAME"]) delete env[name];
  return spawnSync("bash", [join(landing, "scripts/local-tax-ai.sh"), command], {
    cwd: landing,
    env: { ...env, TAX_RAG_ROOT: rag, ...overrides },
    encoding: "utf8",
    timeout: 10000,
  });
}

function check(overrides: Record<string, string> = {}) {
  return run("check", overrides);
}

function fakeRuntime(overrides: Record<string, string> = {}, command = "start") {
  const bin = join(fixture, "bin");
  mkdirSync(bin);
  const programs = {
    docker: `#!/bin/sh
printf '%s\\n' "$*" >> "$TAX_TEST_DOCKER_LOG"
case "$1 $2" in
  'image inspect') test "\${TAX_TEST_IMAGE_EXISTS:-1}" = 1 ;;
  'run --rm') printf '%s\\n' "\${TAX_TEST_IMAGE_VERSION:-0.3.0}" ;;
  *) exit 0 ;;
esac
`,
    curl: `#!/bin/sh
for url do :; done
case "$url" in
  *8010/health) printf '{"collection":"%s"}' "\${TAX_TEST_RAG_COLLECTION:-tax_regulations_v2_fixture}" ;;
  *8003/health) printf '{"version":"%s"}' "\${TAX_TEST_HEALTH_VERSION:-0.3.0}" ;;
esac
`,
    lsof: "#!/bin/sh\nexit 1\n",
    node: "#!/bin/sh\nexit 0\n",
    tail: "#!/bin/sh\nexit 0\n",
  };
  for (const [name, source] of Object.entries(programs)) {
    put(join(bin, name), source);
    chmodSync(join(bin, name), 0o755);
  }
  put(join(agent, "docker_start.sh"), '#!/bin/sh\ndocker run -d --name tax-agent-service "$TAX_AGENT_IMAGE"\n');
  chmodSync(join(agent, "docker_start.sh"), 0o755);
  const log = join(fixture, "docker-calls.log");
  const result = run(command, { PATH: `${bin}:${process.env.PATH}`, TAX_TEST_DOCKER_LOG: log, ...overrides });
  return { result, calls: readFileSync(log, "utf8") };
}

describe("本地财税问答启动基线", () => {
  it("默认选择 V1 Agent 工作树和 V2 RAG，不依赖 Docker 做配置检查", () => {
    const result = check();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("V1 Agent (0.3.0) + V2 RAG");
    expect(result.stdout).toContain(agent);
    expect(result.stdout).toContain("tax-agent-service:v1-agent-v2-rag-local");
    expect(result.stdout).toContain("tax_regulations_v2_fixture");
  });

  it("拒绝用环境变量把 Agent 源码改回 V2", () => {
    put(join(agent, "pyproject.toml"), '[project]\nversion="0.4.0"\n');
    const result = check({ TAX_AGENT_ROOT: agent });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Agent V2 已暂时停用");
  });

  it("拒绝旧的 V2 镜像启动命令", () => {
    const result = check({ TAX_AGENT_IMAGE: "tax-agent-service:v2-optimized-20260827" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("不能使用镜像");
  });

  it("拒绝进程环境将 RAG 从 V2 覆盖为 V1", () => {
    const result = check({ COLLECTION_NAME: "tax_regulations_v1" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("必须使用 V2 RAG");
  });

  it("已有 V1 镜像时不重复构建，并校验实际镜像版本", () => {
    const { result, calls } = fakeRuntime();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(calls).not.toContain("build -t");
    expect(calls).toContain("run --rm --network none --read-only --entrypoint python");
    expect(result.stdout).toContain("全部启动完成");
  });

  it("镜像不存在时自动从 V1 源码构建", () => {
    const { result, calls } = fakeRuntime({ TAX_TEST_IMAGE_EXISTS: "0" });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(calls).toContain("build -t tax-agent-service:v1-agent-v2-rag-local .");
  });

  it("显式要求重建时更新 V1 镜像", () => {
    const { result, calls } = fakeRuntime({ TAX_AGENT_SKIP_BUILD: "0" });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(calls).toContain("build -t tax-agent-service:v1-agent-v2-rag-local .");
  });

  it("明确禁止构建且镜像不存在时，不启动任何服务", () => {
    const { result, calls } = fakeRuntime({ TAX_AGENT_SKIP_BUILD: "1", TAX_TEST_IMAGE_EXISTS: "0" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("找不到 Agent 镜像");
    expect(calls).not.toContain("build -t");
    expect(calls).not.toContain("compose up");
  });

  it("标签看似 V1 但实际版本为 V2 时，在启动服务前停止", () => {
    const { result, calls } = fakeRuntime({ TAX_TEST_IMAGE_VERSION: "0.4.0" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("镜像实际版本为 0.4.0");
    expect(calls).not.toContain("compose up");
    expect(calls).not.toContain("run -d");
  });

  it("RAG 健康接口实际返回 V1 集合时不启动 Agent", () => {
    const { result, calls } = fakeRuntime({ TAX_TEST_RAG_COLLECTION: "tax_regulations_v1" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("服务版本不符合固定组合");
    expect(calls).not.toContain("run -d");
  });

  it("运行 Agent 版本不符时不继续启动落地页", () => {
    const { result } = fakeRuntime({ TAX_TEST_HEALTH_VERSION: "0.4.0" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("version 应为 0.3.0");
    expect(result.stdout).not.toContain("4/4 启动落地页");
  });

  it.each(["status", "stop", "logs"])("保留 %s 公共命令", (command) => {
    const { result } = fakeRuntime({}, command);
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });

  it("独立测试不需要网站配置、Next.js 或验证码登录", () => {
    rmSync(join(landing, ".env.local"));
    rmSync(join(landing, "node_modules"), { recursive: true });
    const checked = run("check-test");
    expect(checked.status, checked.stdout + checked.stderr).toBe(0);
    const { result } = fakeRuntime({}, "test");
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("http://127.0.0.1:8788");
    expect(result.stdout).not.toContain("4/4 启动落地页");
  });
});
