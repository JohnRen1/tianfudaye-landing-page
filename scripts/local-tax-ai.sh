#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANDING_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
AGENT_ROOT="${TAX_AGENT_ROOT:-${LANDING_ROOT}/../税务Agent客服-v1-local}"
RAG_ROOT="${TAX_RAG_ROOT:-/Volumes/renxubin/税务法规RAG}"
RUN_DIR="${LANDING_ROOT}/.local-tax-ai"

RAG_PID_FILE="${RUN_DIR}/rag-api.pid"
LANDING_PID_FILE="${RUN_DIR}/landing.pid"
RAG_LOG="${RUN_DIR}/rag-api.log"
LANDING_LOG="${RUN_DIR}/landing.log"
TEST_PID_FILE="${RUN_DIR}/chat-test.pid"
TEST_LOG="${RUN_DIR}/chat-test.log"
TEST_URL="http://127.0.0.1:8788"
AGENT_CONTAINER="tax-agent-service"
AGENT_IMAGE="${TAX_AGENT_IMAGE:-tax-agent-service:v1-agent-v2-rag-local}"
AGENT_VERSION=""
RAG_COLLECTION=""

QDRANT_URL=""
RAG_API_HOST=""
RAG_API_PORT=""
RAG_URL=""
AGENT_PORT=""
AGENT_URL=""
LANDING_PORT="3000"
LANDING_HTTPS="${TAX_LANDING_HTTPS:-0}"
LANDING_HTTPS_KEY="${TAX_LANDING_HTTPS_KEY:-}"
LANDING_HTTPS_CERT="${TAX_LANDING_HTTPS_CERT:-}"
# 绑定所有网卡，允许同一局域网内的手机访问本地二维码链接。
# 可通过 TAX_LANDING_BIND_HOST 覆盖，例如仅允许本机访问时设为 127.0.0.1。
LANDING_BIND_HOST="${TAX_LANDING_BIND_HOST:-0.0.0.0}"
LANDING_SCHEME="http"
if [[ "${LANDING_HTTPS}" == "1" || "${LANDING_HTTPS}" == "true" ]]; then
  LANDING_SCHEME="https"
fi
LANDING_URL="${LANDING_SCHEME}://127.0.0.1:${LANDING_PORT}"

say() {
  printf '[税务AI本地环境] %s\n' "$1"
}

fail() {
  printf '[税务AI本地环境][失败] %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1"
}

read_env_value() {
  local env_file="$1"
  local variable_name="$2"
  python3 - "${env_file}" "${variable_name}" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
name = sys.argv[2]
if not path.exists():
    print("")
    raise SystemExit

for raw_line in path.read_text(encoding="utf-8").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    if key.strip() != name:
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        value = value[1:-1]
    else:
        value = value.split(" #", 1)[0].rstrip()
    print(value)
    break
else:
    print("")
PY
}

pid_is_running() {
  local pid_file="$1"
  [[ -f "${pid_file}" ]] || return 1
  local pid
  pid="$(cat "${pid_file}")"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

port_owner() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true
}

assert_port_available() {
  local name="$1"
  local port="$2"
  local pid_file="$3"
  if pid_is_running "${pid_file}"; then
    return
  fi
  rm -f "${pid_file}"
  if [[ -n "$(port_owner "${port}")" ]]; then
    printf '%s\n' "$(port_owner "${port}")" >&2
    fail "${name} 需要端口 ${port}，但该端口已被其他进程占用。请先停止上面的进程。"
  fi
}

wait_for_url() {
  local name="$1"
  local url="$2"
  local attempts="${3:-60}"
  local index=1
  while (( index <= attempts )); do
    local curl_args=(--silent --fail --location --max-time 3)
    [[ "${LANDING_HTTPS}" == "1" || "${LANDING_HTTPS}" == "true" ]] && curl_args+=(--insecure)
    if curl "${curl_args[@]}" "${url}" >/dev/null 2>&1; then
      say "${name} 已就绪：${url}"
      return
    fi
    sleep 1
    index=$((index + 1))
  done
  return 1
}

docker_container_exists() {
  docker ps -a --format '{{.Names}}' | grep -qx "${AGENT_CONTAINER}"
}

docker_container_running() {
  docker ps --format '{{.Names}}' | grep -qx "${AGENT_CONTAINER}"
}

start_background() {
  local name="$1"
  local workdir="$2"
  local pid_file="$3"
  local log_file="$4"
  shift 4

  if pid_is_running "${pid_file}"; then
    say "${name} 已由本脚本启动，PID=$(cat "${pid_file}")"
    return
  fi

  (
    cd "${workdir}"
    # 用独立 session 启动服务，避免 Ctrl+C 退出日志查看时终止服务。
    python3 - "$@" >"${log_file}" 2>&1 </dev/null <<'PY' &
import os
import sys

try:
    os.setsid()
except PermissionError:
    pass
os.execvp(sys.argv[1], sys.argv[1:])
PY
    printf '%s\n' "$!" >"${pid_file}"
  )
  say "正在启动 ${name}，PID=$(cat "${pid_file}")，日志=${log_file}"
}

stop_process() {
  local name="$1"
  local pid_file="$2"
  if ! pid_is_running "${pid_file}"; then
    rm -f "${pid_file}"
    say "${name} 未由本脚本运行"
    return
  fi

  local pid
  pid="$(cat "${pid_file}")"
  kill "${pid}" 2>/dev/null || true
  local index=1
  while (( index <= 20 )); do
    if ! kill -0 "${pid}" 2>/dev/null; then
      break
    fi
    sleep 0.25
    index=$((index + 1))
  done
  if kill -0 "${pid}" 2>/dev/null; then
    kill -9 "${pid}" 2>/dev/null || true
  fi
  rm -f "${pid_file}"
  say "${name} 已停止"
}

validate_stack() {
  AGENT_VERSION="$(python3 - "${AGENT_ROOT}/pyproject.toml" <<'PY'
import pathlib
import re
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
project = re.search(r"(?ms)^\[project\]\s*\n(.*?)(?=^\[|\Z)", text)
match = re.search(r"(?m)^version\s*=\s*(.+)$", project.group(1) if project else "")
print(match.group(1).strip().strip(chr(34) + chr(39)) if match else "unknown")
PY
  )"
  [[ "${AGENT_VERSION}" == "0.3.0" ]] \
    || fail "Agent V2 已暂时停用：当前源码版本 ${AGENT_VERSION}，请使用税务Agent客服-v1-local (0.3.0)"
  case "$(printf '%s' "${AGENT_IMAGE}" | tr '[:upper:]' '[:lower:]')" in
    *:0.4.*|*:v2*) fail "Agent V2 已暂时停用：不能使用镜像 ${AGENT_IMAGE}" ;;
  esac
  # Match BaseSettings precedence: the process environment overrides the .env file.
  RAG_COLLECTION="${COLLECTION_NAME-$(read_env_value "${RAG_ROOT}/.env" COLLECTION_NAME)}"
  [[ "${RAG_COLLECTION}" == tax_regulations_v2* ]] \
    || fail "必须使用 V2 RAG，当前有效 COLLECTION_NAME=${RAG_COLLECTION:-未设置}"
  say "固定组合：V1 Agent (${AGENT_VERSION}) + V2 RAG；Agent V2 暂时停用"
  say "Agent 源码：${AGENT_ROOT}"
  say "Agent 镜像：${AGENT_IMAGE}"
  say "RAG 集合：${RAG_COLLECTION}"
}

validate_environment() {
  local mode="${1:-website}"
  [[ -d "${RAG_ROOT}" ]] || fail "找不到法规 RAG：${RAG_ROOT}"
  [[ -d "${AGENT_ROOT}" ]] || fail "找不到税务 Agent：${AGENT_ROOT}"
  AGENT_ROOT="$(cd "${AGENT_ROOT}" && pwd -P)"
  [[ -f "${RAG_ROOT}/.env" ]] || fail "缺少 ${RAG_ROOT}/.env"
  [[ -f "${AGENT_ROOT}/.env" ]] || fail "缺少 ${AGENT_ROOT}/.env"
  if [[ "${mode}" == "direct" ]]; then
    [[ -x "${AGENT_ROOT}/.venv/bin/python" ]] || fail "V1 Agent 尚未执行 uv sync"
    [[ -f "${AGENT_ROOT}/scripts/local_chat_test.py" ]] || fail "缺少 V1 Agent 独立测试界面脚本"
  else
    [[ -f "${LANDING_ROOT}/.env.local" ]] || fail "缺少 ${LANDING_ROOT}/.env.local"
    [[ -x "${LANDING_ROOT}/node_modules/next/dist/bin/next" ]] \
      || fail "落地页依赖不存在，请先执行 pnpm install"
  fi
  [[ -x "${RAG_ROOT}/.venv/bin/python" ]] || fail "法规 RAG 尚未执行 uv sync"
  validate_stack

  local landing_agent_key
  local agent_key
  local agent_rag_key
  local rag_key
  local landing_app_env
  local landing_app_env_normalized
  local landing_agent_url
  local agent_rag_url
  landing_agent_key="$(read_env_value "${LANDING_ROOT}/.env.local" TAX_AGENT_API_KEY)"
  agent_key="$(read_env_value "${AGENT_ROOT}/.env" AGENT_API_KEY)"
  agent_rag_key="$(read_env_value "${AGENT_ROOT}/.env" RAG_API_KEY)"
  rag_key="$(read_env_value "${RAG_ROOT}/.env" RAG_API_KEY)"
  landing_app_env="$(read_env_value "${LANDING_ROOT}/.env.local" APP_ENV)"
  landing_app_env_normalized="$(printf '%s' "${landing_app_env}" | tr '[:upper:]' '[:lower:]')"
  landing_agent_url="$(read_env_value "${LANDING_ROOT}/.env.local" RAG_CHAT_URL)"
  agent_rag_url="$(read_env_value "${AGENT_ROOT}/.env" RAG_BASE_URL)"

  QDRANT_URL="$(read_env_value "${RAG_ROOT}/.env" QDRANT_URL)"
  RAG_API_HOST="$(read_env_value "${RAG_ROOT}/.env" API_HOST)"
  RAG_API_PORT="$(read_env_value "${RAG_ROOT}/.env" API_PORT)"
  AGENT_PORT="$(read_env_value "${AGENT_ROOT}/.env" PORT)"

  [[ -n "${QDRANT_URL}" ]] || fail "法规 RAG .env 缺少 QDRANT_URL"
  [[ -n "${RAG_API_HOST}" ]] || fail "法规 RAG .env 缺少 API_HOST"
  [[ "${RAG_API_PORT}" =~ ^[0-9]+$ ]] || fail "法规 RAG .env 的 API_PORT 不是有效端口"
  [[ "${AGENT_PORT}" =~ ^[0-9]+$ ]] || fail "Agent .env 的 PORT 不是有效端口"
  if [[ "${mode}" != "direct" ]]; then
    [[ "${landing_app_env_normalized}" != "prod" && "${landing_app_env_normalized}" != "production" ]] \
      || fail "落地页 APP_ENV=${landing_app_env} 会读取 NEXT_RAG_CHAT_URL，不适合本地联调"
  fi

  RAG_URL="http://127.0.0.1:${RAG_API_PORT}"
  AGENT_URL="http://127.0.0.1:${AGENT_PORT}"

  [[ -n "${agent_key}" ]] || fail "Agent .env 缺少 AGENT_API_KEY"
  [[ -n "${rag_key}" ]] || fail "法规 RAG .env 缺少 RAG_API_KEY"
  if [[ "${mode}" != "direct" && "${landing_agent_key}" != "${agent_key}" ]]; then
    fail "落地页 TAX_AGENT_API_KEY 与 Agent AGENT_API_KEY 不一致"
  fi
  if [[ "${agent_rag_key}" != "${rag_key}" ]]; then
    fail "Agent RAG_API_KEY 与法规 RAG RAG_API_KEY 不一致"
  fi

  if [[ "${mode}" != "direct" && "${landing_agent_url%/}" != "${AGENT_URL}/chat" ]]; then
    fail "落地页当前 RAG_CHAT_URL=${landing_agent_url}，本地联调请在 .env.local 中改为 ${AGENT_URL}/chat"
  fi
  if [[ "${agent_rag_url%/}" != "http://host.docker.internal:${RAG_API_PORT}" ]]; then
    fail "Agent 将在 Docker 中运行；请确认 .env 的 RAG_BASE_URL=http://host.docker.internal:${RAG_API_PORT}"
  fi
  if [[ "${QDRANT_URL%/}" != "http://127.0.0.1:6335" ]]; then
    fail "docker-compose.yml 映射 Qdrant 到 6335，但法规 RAG .env 的 QDRANT_URL=${QDRANT_URL}"
  fi
  if [[ "${AGENT_PORT}" != "8003" ]]; then
    fail "docker_start.sh 映射 Agent 到 8003，但 Agent .env 的 PORT=${AGENT_PORT}"
  fi
  if [[ "${mode}" == "direct" ]]; then
    say "V1 Agent → V2 RAG 接口密钥检查通过，独立测试不依赖落地页登录或 Next.js"
    say "环境链路检查通过：独立测试界面 → ${AGENT_URL} → ${RAG_URL} → ${QDRANT_URL}"
  else
    say "三个项目的内部 API Key 对应关系检查通过"
    say "环境链路检查通过：落地页 → ${AGENT_URL} → ${RAG_URL} → ${QDRANT_URL}"
  fi
}

prepare_agent_image() {
  (
    cd "${AGENT_ROOT}"
    case "${TAX_AGENT_SKIP_BUILD:-auto}" in
      1|true)
        docker image inspect "${AGENT_IMAGE}" >/dev/null 2>&1 \
          || fail "找不到 Agent 镜像 ${AGENT_IMAGE}；设置 TAX_AGENT_SKIP_BUILD=0 构建 V1 镜像"
        say "直接使用已有 V1 镜像：${AGENT_IMAGE}"
        ;;
      0|false)
        say "根据 V1 源码重新构建：${AGENT_IMAGE}"
        docker build -t "${AGENT_IMAGE}" .
        ;;
      auto)
        if docker image inspect "${AGENT_IMAGE}" >/dev/null 2>&1; then
          say "直接使用已有 V1 镜像：${AGENT_IMAGE}"
        else
          say "V1 镜像不存在，首次构建：${AGENT_IMAGE}"
          docker build -t "${AGENT_IMAGE}" .
        fi
        ;;
      *) fail "TAX_AGENT_SKIP_BUILD 只能是 auto、0/false 或 1/true" ;;
    esac
    # A tag can point at different code. Check the installed version before
    # replacing the current container, without network, secrets or data volumes.
    local image_version
    image_version="$(docker run --rm --network none --read-only --entrypoint python "${AGENT_IMAGE}" \
      -c 'from importlib.metadata import version; print(version("tax-agent-service"))')" \
      || fail "无法核验 Agent 镜像版本，请设置 TAX_AGENT_SKIP_BUILD=0 重建 V1 镜像"
    [[ "${image_version}" == "0.3.0" ]] \
      || fail "镜像实际版本为 ${image_version}，Agent V2 已停用；请从 V1 源码重新构建"
  )
}

verify_health_field() {
  local url="$1" field="$2" expected="$3"
  curl --silent --fail --max-time 5 "${url}" | python3 -c \
    'import json,sys; value=json.load(sys.stdin).get(sys.argv[1]); sys.exit(0 if value == sys.argv[2] else 1)' \
    "${field}" "${expected}" \
    || fail "服务版本不符合固定组合：${url} 的 ${field} 应为 ${expected}，请检查已有服务"
}

start_all() {
  local mode="${1:-website}"
  require_command docker
  require_command curl
  require_command lsof
  [[ "${mode}" == "direct" ]] || require_command node
  require_command python3
  validate_environment "${mode}"
  mkdir -p "${RUN_DIR}"

  assert_port_available "RAG API" "${RAG_API_PORT}" "${RAG_PID_FILE}"
  if [[ "${mode}" == "direct" ]]; then
    assert_port_available "独立测试界面" "8788" "${TEST_PID_FILE}"
  else
    assert_port_available "落地页" "${LANDING_PORT}" "${LANDING_PID_FILE}"
  fi

  docker info >/dev/null 2>&1 || fail "Docker 未启动，请先启动 Docker Desktop"
  if [[ -n "$(port_owner "${AGENT_PORT}")" ]] && ! docker_container_exists; then
    printf '%s\n' "$(port_owner "${AGENT_PORT}")" >&2
    fail "Agent 需要端口 ${AGENT_PORT}，但该端口已被其他进程占用"
  fi
  prepare_agent_image

  say "1/4 启动法规 Qdrant"
  (
    cd "${RAG_ROOT}"
    docker compose up -d qdrant-regulations
  )
  wait_for_url "Qdrant" "${QDRANT_URL}/healthz" 60 \
    || fail "Qdrant 启动超时，请执行：cd \"${RAG_ROOT}\" && docker compose logs"

  say "2/4 启动法规 RAG API"
  start_background \
    "RAG API" "${RAG_ROOT}" "${RAG_PID_FILE}" "${RAG_LOG}" \
    "${RAG_ROOT}/.venv/bin/python" -m uvicorn tax_regulations.api:app \
    --host "${RAG_API_HOST}" --port "${RAG_API_PORT}"
  wait_for_url "RAG API" "${RAG_URL}/health" 90 \
    || fail "RAG API 启动失败，请查看 ${RAG_LOG}"
  verify_health_field "${RAG_URL}/health" collection "${RAG_COLLECTION}"

  say "3/4 准备税务 Agent 容器"
  (
    cd "${AGENT_ROOT}"
    TAX_AGENT_IMAGE="${AGENT_IMAGE}" ./docker_start.sh --recreate
  )
  wait_for_url "税务 Agent" "${AGENT_URL}/health" 60 \
    || fail "税务 Agent 启动失败，请执行：docker logs ${AGENT_CONTAINER}"
  verify_health_field "${AGENT_URL}/health" version "0.3.0"

  if [[ "${mode}" == "direct" ]]; then
    say "4/4 启动独立对话测试界面"
    start_background "独立测试界面" "${AGENT_ROOT}" "${TEST_PID_FILE}" "${TEST_LOG}" \
      "${AGENT_ROOT}/.venv/bin/python" scripts/local_chat_test.py \
      --agent-url "${AGENT_URL}" --rag-url "${RAG_URL}"
    wait_for_url "独立测试界面" "${TEST_URL}" 30 || fail "测试界面启动失败，请查看 ${TEST_LOG}"
    say "直接打开 ${TEST_URL} 即可连续提问；无需进入落地页或验证码登录"
    show_logs
    return
  fi

  say "4/4 启动落地页（Next.js 自动读取 .env.local）"
  local landing_args=(dev --hostname "${LANDING_BIND_HOST}" --port "${LANDING_PORT}")
  if [[ "${LANDING_HTTPS}" == "1" || "${LANDING_HTTPS}" == "true" ]]; then
    landing_args+=(--experimental-https)
    if [[ -n "${LANDING_HTTPS_KEY}" && -n "${LANDING_HTTPS_CERT}" ]]; then
      landing_args+=(
        --experimental-https-key "${LANDING_HTTPS_KEY}"
        --experimental-https-cert "${LANDING_HTTPS_CERT}"
      )
    fi
  fi
  start_background \
    "落地页" "${LANDING_ROOT}" "${LANDING_PID_FILE}" "${LANDING_LOG}" \
    node "${LANDING_ROOT}/node_modules/next/dist/bin/next" "${landing_args[@]}"
  wait_for_url "落地页" "${LANDING_URL}/tax-ai" 120 \
    || fail "落地页启动失败，请查看 ${LANDING_LOG}"

  printf '\n'
  say "全部启动完成"
  printf '  问答页面：%s/tax-ai\n' "${LANDING_URL}"
  local lan_address
  while IFS= read -r lan_address; do
    [[ -n "${lan_address}" ]] || continue
    printf '  手机访问：%s://%s:%s/tax-ai\n' "${LANDING_SCHEME}" "${lan_address}" "${LANDING_PORT}"
  done < <(node "${SCRIPT_DIR}/lan-addresses.mjs")
  printf '  Agent文档：%s/docs\n' "${AGENT_URL}"
  printf '  RAG健康：%s/health\n' "${RAG_URL}"
  printf '  查看状态：pnpm run tax-ai:status\n'
  printf '  日志跟随：已自动开启，按 Ctrl+C 退出日志查看\n'
  printf '  稍后查看：pnpm run tax-ai:logs\n'
  printf '  一键停止：pnpm run tax-ai:down\n'
  printf '\n'
  show_logs
}

stop_all() {
  mkdir -p "${RUN_DIR}"
  stop_process "独立测试界面" "${TEST_PID_FILE}"
  stop_process "落地页" "${LANDING_PID_FILE}"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker_container_running; then
    docker stop "${AGENT_CONTAINER}" >/dev/null
    say "税务 Agent 容器已停止"
  else
    say "税务 Agent 容器未运行"
  fi
  stop_process "RAG API" "${RAG_PID_FILE}"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    (
      cd "${RAG_ROOT}"
      docker compose stop qdrant-regulations >/dev/null
    )
    say "法规 Qdrant 已停止"
  fi
}

show_status() {
  say "目标组合：V1 Agent (0.3.0) + V2 RAG；Agent V2 暂时停用"
  say "Agent 源码：${AGENT_ROOT}"
  say "目标镜像：${AGENT_IMAGE}"
  if [[ -f "${RAG_ROOT}/.env" && -f "${AGENT_ROOT}/.env" ]]; then
    RAG_API_PORT="$(read_env_value "${RAG_ROOT}/.env" API_PORT)"
    AGENT_PORT="$(read_env_value "${AGENT_ROOT}/.env" PORT)"
    QDRANT_URL="$(read_env_value "${RAG_ROOT}/.env" QDRANT_URL)"
    RAG_URL="http://127.0.0.1:${RAG_API_PORT:-8010}"
    AGENT_URL="http://127.0.0.1:${AGENT_PORT:-8003}"
  fi
  printf '%-12s %-10s %s\n' "服务" "进程" "地址"
  if pid_is_running "${RAG_PID_FILE}"; then
    printf '%-12s %-10s %s\n' "RAG API" "运行中" "${RAG_URL}"
  else
    printf '%-12s %-10s %s\n' "RAG API" "未运行" "${RAG_URL}"
  fi
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker_container_running; then
    printf '%-12s %-10s %s\n' "Agent" "运行中" "${AGENT_URL}"
    docker inspect --format '  实际镜像：{{.Config.Image}}' "${AGENT_CONTAINER}"
    verify_health_field "${AGENT_URL}/health" version "0.3.0"
  else
    printf '%-12s %-10s %s\n' "Agent" "未运行" "${AGENT_URL}"
  fi
  if pid_is_running "${LANDING_PID_FILE}"; then
    printf '%-12s %-10s %s\n' "落地页" "运行中" "${LANDING_URL}/tax-ai"
  else
    printf '%-12s %-10s %s\n' "落地页" "未运行" "${LANDING_URL}/tax-ai"
  fi
  if pid_is_running "${TEST_PID_FILE}"; then
    printf '%-12s %-10s %s\n' "独立测试" "运行中" "${TEST_URL}"
  else
    printf '%-12s %-10s %s\n' "独立测试" "未运行" "${TEST_URL}"
  fi
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker ps --format '{{.Names}}' | grep -qx 'tax-regulations-qdrant'; then
    printf '%-12s %-10s %s\n' "Qdrant" "运行中" "${QDRANT_URL}"
  else
    printf '%-12s %-10s %s\n' "Qdrant" "未运行" "${QDRANT_URL}"
  fi
  if pid_is_running "${RAG_PID_FILE}"; then
    RAG_COLLECTION="${COLLECTION_NAME-$(read_env_value "${RAG_ROOT}/.env" COLLECTION_NAME)}"
    say "目标 RAG 集合：${RAG_COLLECTION}"
    verify_health_field "${RAG_URL}/health" collection "${RAG_COLLECTION}"
  fi
}

show_logs() {
  mkdir -p "${RUN_DIR}"
  touch "${RAG_LOG}" "${LANDING_LOG}" "${TEST_LOG}"
  local tail_pid=""
  local agent_log_pid=""

  cleanup_log_followers() {
    [[ -n "${tail_pid:-}" ]] && kill "${tail_pid}" 2>/dev/null || true
    [[ -n "${agent_log_pid:-}" ]] && kill "${agent_log_pid}" 2>/dev/null || true
  }

  trap cleanup_log_followers EXIT
  trap 'cleanup_log_followers; exit 130' INT TERM

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker_container_exists; then
    say "Agent 最近 100 行日志："
    docker logs --tail 100 "${AGENT_CONTAINER}" 2>&1
  fi
  say "继续查看 RAG API、Agent 与落地页日志；按 Ctrl+C 退出，不会停止服务"

  tail -n 80 -F "${RAG_LOG}" "${LANDING_LOG}" "${TEST_LOG}" &
  tail_pid="$!"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker_container_exists; then
    docker logs --tail 0 -f "${AGENT_CONTAINER}" 2>&1 &
    agent_log_pid="$!"
  fi

  wait
}

show_help() {
  cat <<'EOF'
用法：
  bash scripts/local-tax-ai.sh start   # 依次启动 Qdrant、RAG、Agent、落地页
  bash scripts/local-tax-ai.sh test    # 只启动后端和独立测试界面，不启动落地页
  bash scripts/local-tax-ai.sh stop    # 反向停止全部本地服务
  bash scripts/local-tax-ai.sh status  # 查看状态
  bash scripts/local-tax-ai.sh logs    # 查看 Agent、RAG API 和落地页日志
  bash scripts/local-tax-ai.sh check   # 离线检查 V1 Agent + V2 RAG 配置，不启动服务
  bash scripts/local-tax-ai.sh check-test # 离线检查独立测试配置，不依赖网站配置或 Node

可覆盖项目路径：
  TAX_RAG_ROOT=/path/to/税务法规RAG
  TAX_AGENT_ROOT=/path/to/税务Agent客服-v1-local          # 必须为 V1 (0.3.0)
  TAX_AGENT_IMAGE=tax-agent-service:v1-agent-v2-rag-local # 必须为 V1 镜像
  TAX_AGENT_SKIP_BUILD=auto # 默认：有镜像直接用，没有才构建
  TAX_AGENT_SKIP_BUILD=0    # 修改 V1 源码后，明确要求重建镜像
  TAX_AGENT_SKIP_BUILD=1    # 只允许使用已有镜像，不存在时停止

局域网测试：
  # 启动时自动识别局域网 IPv4，无需设置 TAX_LAN_IP；多个网卡会列出多个地址。
  TAX_LANDING_BIND_HOST=0.0.0.0 # 默认允许同一局域网设备访问
  TAX_LANDING_HTTPS=1            # 启用 Next.js 自签名 HTTPS，浏览器本地验证麦克风
  TAX_LANDING_HTTPS_KEY=/path/to/dev-key.pem
  TAX_LANDING_HTTPS_CERT=/path/to/dev-cert.pem

说明：
  脚本只读取各项目现有的 .env/.env.local，不会修改或临时覆盖环境变量。
  当前固定 V1 Agent + V2 RAG，Agent V2 暂时停用并保留源码。
  启动前检查源码与镜像版本，启动后检查 Agent 0.3.0 和实际 RAG V2 集合。
  HTTPS 模式首次访问会出现自签名证书提示；电脑可继续访问，手机需要额外信任证书。
  本地链路配置不正确时，脚本会在启动任何服务前停止并给出修改提示。
EOF
}

case "${1:-start}" in
  start|up)
    start_all
    ;;
  test)
    start_all direct
    ;;
  stop|down)
    stop_all
    ;;
  status)
    show_status
    ;;
  check)
    require_command python3
    validate_environment
    ;;
  check-test)
    require_command python3
    validate_environment direct
    ;;
  logs)
    show_logs
    ;;
  help|-h|--help)
    show_help
    ;;
  *)
    show_help
    exit 2
    ;;
esac
