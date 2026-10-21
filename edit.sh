#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# 🎯 Church Companion — Live Pinpoint & Edit CLI for Termux
# ==============================================================================

PORT=8181
SERVER_URL="http://localhost:${PORT}"
PROJECT_DIR="/data/data/com.termux/files/home/ChurchCompanion"
SERVER_SCRIPT="${PROJECT_DIR}/server.js"
PID_FILE="${PROJECT_DIR}/.server.pid"
LOG_FILE="${PROJECT_DIR}/.server.log"
SKILL_SCRIPT="/data/data/com.termux/files/home/.agents/skills/localhost-live-editor/scripts/check-edits.js"

get_wifi_ip() {
  local ip=""
  if command -v node >/dev/null 2>&1; then
    ip=$(node -e "const os = require('os'); const ifaces = os.networkInterfaces(); for (let k of Object.keys(ifaces)) { if (/wlan|wifi|eth|ap|softap|rndis/i.test(k)) { for (let f of ifaces[k]) { if (f.family === 'IPv4' && !f.internal && f.address !== '127.0.0.1') { console.log(f.address); process.exit(0); } } } } for (let k of Object.keys(ifaces)) { if (!/ccmni|dummy|rmnet|pdp/i.test(k)) { for (let f of ifaces[k]) { if (f.family === 'IPv4' && !f.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(f.address)) { console.log(f.address); process.exit(0); } } } } console.log('localhost');" 2>/dev/null)
  fi
  if [ -z "$ip" ] || [ "$ip" = "localhost" ]; then
    ip=$(ifconfig wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | sed 's/addr://')
  fi
  if [ -z "$ip" ] || [ "$ip" = "localhost" ]; then
    ip=$(ifconfig ap0 2>/dev/null | grep 'inet ' | awk '{print $2}' | sed 's/addr://')
  fi
  if [ -z "$ip" ]; then
    ip="localhost"
  fi
  echo "$ip"
}

WIFI_IP=$(get_wifi_ip)
WIFI_URL="http://${WIFI_IP}:${PORT}"

function show_help() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════════════╗"
  echo "║  🎯 Church Companion — Localhost & Wi-Fi Live Pinpoint CLI (Termux)      ║"
  echo "╠══════════════════════════════════════════════════════════════════════════╣"
  echo "║  📱 Local:     ${SERVER_URL}                                           ║"
  echo "║  📶 Wi-Fi:     ${WIFI_URL}                                       ║"
  echo "╚══════════════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Usage: church-edit [command]  (or ./edit.sh [command])"
  echo ""
  echo "Commands:"
  echo "  start       Start local development server (accessible on local & Wi-Fi)"
  echo "  stop        Stop local development server"
  echo "  restart     Restart the development server"
  echo "  status      Check local server health, Wi-Fi IP and pending edits"
  echo "  open        Open live application in default Android browser"
  echo "  list        List all pending pinpointed edits submitted from localhost"
  echo "  clear       Clear all pending edits from the queue"
  echo "  ip          Show local and Wi-Fi network URLs"
  echo "  help        Show this help message"
  echo ""
}

CMD="${1:-status}"

case "$CMD" in
  start)
    if curl -s "${SERVER_URL}/api/status" >/dev/null 2>&1; then
      echo "[Edit CLI] Server is ALREADY RUNNING!"
      echo "  📱 Local: ${SERVER_URL}"
      echo "  📶 Wi-Fi: ${WIFI_URL}"
    else
      echo "[Edit CLI] Starting Church Companion server on 0.0.0.0:${PORT}..."
      setsid node "${SERVER_SCRIPT}" > "${LOG_FILE}" 2>&1 &
      sleep 1.2
      if curl -s "${SERVER_URL}/api/status" >/dev/null 2>&1; then
        echo ""
        echo "======================================================"
        echo "  ⛪ Church Companion Live Server Started Successfully!"
        echo "  📱 Localhost (This device):  ${SERVER_URL}"
        echo "  📶 Same Wi-Fi Network:       ${WIFI_URL}"
        echo "  🎯 Pinpoint Feature:         ACTIVE"
        echo "======================================================"
        echo ""
      else
        echo "[Edit CLI] Error starting server. Check ${LOG_FILE}:"
        tail -n 15 "${LOG_FILE}" 2>/dev/null || true
      fi
    fi
    ;;
  stop)
    echo "[Edit CLI] Stopping server on port ${PORT}..."
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
    fi
    pkill -f "node.*server.js" 2>/dev/null || true
    sleep 0.8
    echo "[Edit CLI] Server stopped."
    ;;
  restart)
    echo "[Edit CLI] Restarting server..."
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
    fi
    pkill -f "node.*server.js" 2>/dev/null || true
    sleep 0.8
    setsid node "${SERVER_SCRIPT}" > "${LOG_FILE}" 2>&1 &
    sleep 1.2
    if curl -s "${SERVER_URL}/api/status" >/dev/null 2>&1; then
      echo ""
      echo "======================================================"
      echo "  ⛪ Church Companion Live Server Restarted!"
      echo "  📱 Localhost (This device):  ${SERVER_URL}"
      echo "  📶 Same Wi-Fi Network:       ${WIFI_URL}"
      echo "  🎯 Pinpoint Feature:         ACTIVE"
      echo "======================================================"
      echo ""
    else
      echo "[Edit CLI] Error restarting server. Check ${LOG_FILE}"
    fi
    ;;
  status)
    echo "[Edit CLI] Checking server status..."
    if curl -s "${SERVER_URL}/api/status" >/dev/null 2>&1; then
      echo ""
      echo "======================================================"
      echo "  ⛪ Church Companion Server is ONLINE and HEALTHY"
      echo "  📱 Localhost (This device):  ${SERVER_URL}"
      echo "  📶 Same Wi-Fi Network:       ${WIFI_URL}"
      echo "  🎯 Pinpoint Inspector:       ENABLED (Draggable & Select)"
      echo "======================================================"
      echo ""
      curl -s "${SERVER_URL}/api/status" | grep -E "appName|wifiIp|networkUrl|pendingEditsCount" 2>/dev/null || true
      echo ""
    else
      echo "[Edit CLI] Server is OFFLINE."
      echo "To launch it, run: church-edit start"
    fi
    ;;
  ip)
    echo ""
    echo "  📱 Localhost (This device):  ${SERVER_URL}"
    echo "  📶 Same Wi-Fi Network:       ${WIFI_URL}"
    echo ""
    ;;
  open)
    echo "[Edit CLI] Opening ${SERVER_URL} in browser..."
    if command -v termux-open-url >/dev/null 2>&1; then
      termux-open-url "$SERVER_URL"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$SERVER_URL"
    else
      am start -a android.intent.action.VIEW -d "$SERVER_URL" >/dev/null 2>&1
    fi
    echo "[Edit CLI] Browser opened!"
    ;;
  list)
    if [ -f "$SKILL_SCRIPT" ]; then
      node "$SKILL_SCRIPT"
    else
      curl -s "${SERVER_URL}/api/edits/pending"
    fi
    ;;
  clear)
    echo "[Edit CLI] Clearing pending edits..."
    curl -s -X POST "${SERVER_URL}/api/edits/clear"
    echo ""
    echo "[Edit CLI] Pending edits cleared."
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: $CMD"
    show_help
    exit 1
    ;;
esac
