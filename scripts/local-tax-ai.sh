#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANDING_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
AGENT_ROOT="${TAX_AGENT_ROOT:-/Users/renxubin/Desktop/工作/主业务/税务Agent客服}"
RAG_ROOT="${TAX_RAG_ROOT:-/Volumes/renxubin/税务法规RAG}"
RUN_DIR="${LANDING_ROOT}/.local-tax-ai"

RAG_PID_FILE="${RUN_DIR}/rag-api.pid"
LANDING_PID_FILE="${RUN_DIR}/landing.pid"
RAG_LOG="${RUN_DIR}/rag-api.log"
LANDING_LOG="${RUN_DIR}/landing.log"
AGENT_CONTAINER="tax-agent-service"
AGENT_IMAGE="tax-agent-service:0.2.0"

QDRANT_URL=""
RAG_API_HOST=""
RAG_API_PORT=""
RAG_URL=""
AGENT_PORT=""
AGENT_URL=""
LANDING_PORT="3000"
LANDING_URL="http://127.0.0.1:${LANDING_PORT}"

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
    if curl --silent --fail --location --max-time 3 "${url}" >/dev/null 2>&1; then
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
    nohup "$@" >"${log_file}" 2>&1 </dev/null &
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

validate_environment() {
  [[ -d "${RAG_ROOT}" ]] || fail "找不到法规 RAG：${RAG_ROOT}"
  [[ -d "${AGENT_ROOT}" ]] || fail "找不到税务 Agent：${AGENT_ROOT}"
  [[ -f "${RAG_ROOT}/.env" ]] || fail "缺少 ${RAG_ROOT}/.env"
  [[ -f "${AGENT_ROOT}/.env" ]] || fail "缺少 ${AGENT_ROOT}/.env"
  [[ -f "${LANDING_ROOT}/.env.local" ]] || fail "缺少 ${LANDING_ROOT}/.env.local"
  [[ -x "${RAG_ROOT}/.venv/bin/python" ]] || fail "法规 RAG 尚未执行 uv sync"
  [[ -x "${LANDING_ROOT}/node_modules/next/dist/bin/next" ]] \
    || fail "落地页依赖不存在，请先执行 pnpm install"

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
  [[ "${landing_app_env_normalized}" != "prod" && "${landing_app_env_normalized}" != "production" ]] \
    || fail "落地页 APP_ENV=${landing_app_env} 会读取 NEXT_RAG_CHAT_URL，不适合本地联调"

  RAG_URL="http://127.0.0.1:${RAG_API_PORT}"
  AGENT_URL="http://127.0.0.1:${AGENT_PORT}"

  [[ -n "${agent_key}" ]] || fail "Agent .env 缺少 AGENT_API_KEY"
  [[ -n "${rag_key}" ]] || fail "法规 RAG .env 缺少 RAG_API_KEY"
  if [[ "${landing_agent_key}" != "${agent_key}" ]]; then
    fail "落地页 TAX_AGENT_API_KEY 与 Agent AGENT_API_KEY 不一致"
  fi
  if [[ "${agent_rag_key}" != "${rag_key}" ]]; then
    fail "Agent RAG_API_KEY 与法规 RAG RAG_API_KEY 不一致"
  fi

  if [[ "${landing_agent_url%/}" != "${AGENT_URL}/chat" ]]; then
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
  say "三个项目的内部 API Key 对应关系检查通过"
  say "环境链路检查通过：落地页 → ${AGENT_URL} → ${RAG_URL} → ${QDRANT_URL}"
}

start_all() {
  require_command docker
  require_command curl
  require_command lsof
  require_command node
  require_command python3
  validate_environment
  mkdir -p "${RUN_DIR}"

  assert_port_available "RAG API" "${RAG_API_PORT}" "${RAG_PID_FILE}"
  assert_port_available "落地页" "${LANDING_PORT}" "${LANDING_PID_FILE}"

  docker info >/dev/null 2>&1 || fail "Docker 未启动，请先启动 Docker Desktop"
  if [[ -n "$(port_owner "${AGENT_PORT}")" ]] && ! docker_container_exists; then
    printf '%s\n' "$(port_owner "${AGENT_PORT}")" >&2
    fail "Agent 需要端口 ${AGENT_PORT}，但该端口已被其他进程占用"
  fi

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

  say "3/4 构建当前源码并启动税务 Agent 容器"
  (
    cd "${AGENT_ROOT}"
    docker build -t "${AGENT_IMAGE}" .
    ./docker_start.sh --recreate
  )
  wait_for_url "税务 Agent" "${AGENT_URL}/health" 60 \
    || fail "税务 Agent 启动失败，请执行：docker logs ${AGENT_CONTAINER}"

  say "4/4 启动落地页（Next.js 自动读取 .env.local）"
  start_background \
    "落地页" "${LANDING_ROOT}" "${LANDING_PID_FILE}" "${LANDING_LOG}" \
    node "${LANDING_ROOT}/node_modules/next/dist/bin/next" dev \
    --hostname 127.0.0.1 --port "${LANDING_PORT}"
  wait_for_url "落地页" "${LANDING_URL}/tax-ai" 120 \
    || fail "落地页启动失败，请查看 ${LANDING_LOG}"

  printf '\n'
  say "全部启动完成"
  printf '  问答页面：%s/tax-ai\n' "${LANDING_URL}"
  printf '  Agent文档：%s/docs\n' "${AGENT_URL}"
  printf '  RAG健康：%s/health\n' "${RAG_URL}"
  printf '  查看状态：pnpm run tax-ai:status\n'
  printf '  查看日志：pnpm run tax-ai:logs\n'
  printf '  一键停止：pnpm run tax-ai:down\n'
}

stop_all() {
  mkdir -p "${RUN_DIR}"
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
  else
    printf '%-12s %-10s %s\n' "Agent" "未运行" "${AGENT_URL}"
  fi
  if pid_is_running "${LANDING_PID_FILE}"; then
    printf '%-12s %-10s %s\n' "落地页" "运行中" "${LANDING_URL}/tax-ai"
  else
    printf '%-12s %-10s %s\n' "落地页" "未运行" "${LANDING_URL}/tax-ai"
  fi
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker ps --format '{{.Names}}' | grep -qx 'tax-regulations-qdrant'; then
    printf '%-12s %-10s %s\n' "Qdrant" "运行中" "${QDRANT_URL}"
  else
    printf '%-12s %-10s %s\n' "Qdrant" "未运行" "${QDRANT_URL}"
  fi
}

show_logs() {
  mkdir -p "${RUN_DIR}"
  touch "${RAG_LOG}" "${LANDING_LOG}"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 \
    && docker_container_exists; then
    say "Agent 最近 100 行日志："
    docker logs --tail 100 "${AGENT_CONTAINER}" 2>&1
  fi
  say "继续查看 RAG API 与落地页日志；按 Ctrl+C 退出，不会停止服务"
  tail -n 80 -F "${RAG_LOG}" "${LANDING_LOG}"
}

show_help() {
  cat <<'EOF'
用法：
  bash scripts/local-tax-ai.sh start   # 依次启动 Qdrant、RAG、Agent、落地页
  bash scripts/local-tax-ai.sh stop    # 反向停止全部本地服务
  bash scripts/local-tax-ai.sh status  # 查看状态
  bash scripts/local-tax-ai.sh logs    # 查看 Agent、RAG API 和落地页日志

可覆盖项目路径：
  TAX_RAG_ROOT=/path/to/税务法规RAG
  TAX_AGENT_ROOT=/path/to/税务Agent客服

说明：
  脚本只读取各项目现有的 .env/.env.local，不会修改或临时覆盖环境变量。
  本地链路配置不正确时，脚本会在启动任何服务前停止并给出修改提示。
EOF
}

case "${1:-start}" in
  start|up)
    start_all
    ;;
  stop|down)
    stop_all
    ;;
  status)
    show_status
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
