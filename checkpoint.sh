#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# Church Companion — Workspace Checkpoint & Reversion Tool
# Location: ~/storage/shared/Workspace/checkpoint/
# ==============================================================================

set -e

WORKSPACE_DIR="/data/data/com.termux/files/home/storage/shared/Workspace"
PROJECT_DIR="${WORKSPACE_DIR}/ChurchCompanion"
CHECKPOINT_DIR="${WORKSPACE_DIR}/checkpoint"
INDEX_FILE="${CHECKPOINT_DIR}/checkpoints.json"

mkdir -p "${CHECKPOINT_DIR}"

function init_index() {
  if [ ! -f "${INDEX_FILE}" ]; then
    echo "[]" > "${INDEX_FILE}"
  fi
}

function show_help() {
  echo ""
  echo "================================================================="
  echo " 📦 Church Companion — Checkpoint & Revert Manager"
  echo "================================================================="
  echo "Usage: bash checkpoint.sh [command] [arguments]"
  echo ""
  echo "Commands:"
  echo "  create [desc]    Create a new checkpoint of ChurchCompanion"
  echo "  list             List all saved checkpoints with size and timestamp"
  echo "  revert [name]    Revert ChurchCompanion to a saved checkpoint"
  echo "  diff [name]      Show files modified/added compared to checkpoint"
  echo "  help             Show this guidance"
  echo ""
  echo "Checkpoints are stored in: ${CHECKPOINT_DIR}"
  echo "================================================================="
  echo ""
}

function create_checkpoint() {
  local desc="${1:-Manual Checkpoint}"
  local timestamp
  timestamp=$(date +"%Y%m%d_%H%M%S")
  local safe_desc
  safe_desc=$(echo "${desc}" | tr ' ' '_' | tr -cd 'A-Za-z0-9_-')
  local filename="checkpoint_${timestamp}_${safe_desc}.tar.gz"
  local filepath="${CHECKPOINT_DIR}/${filename}"

  echo "[Checkpoint] Archiving ChurchCompanion into ${filename}..."
  
  # Archive project excluding transient files and caches
  tar -czf "${filepath}" \
    --exclude='.server.pid' \
    --exclude='.server.log' \
    --exclude='.gradle' \
    --exclude='build' \
    --exclude='.idea' \
    -C "${WORKSPACE_DIR}" "ChurchCompanion"

  local size
  size=$(du -h "${filepath}" | cut -f1)

  # Update JSON index
  init_index
  local iso_date
  iso_date=$(date -Iseconds 2>/dev/null || date)

  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const file = '${INDEX_FILE}';
      let data = [];
      try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e){}
      data.push({
        id: '${filename}',
        timestamp: '${iso_date}',
        tag: '${desc}',
        size: '${size}',
        file: '${filepath}'
      });
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    "
  fi

  echo "✅ Checkpoint successfully created!"
  echo "   📁 File: ${filepath}"
  echo "   📦 Size: ${size}"
  echo "   🏷️  Tag:  ${desc}"
}

function list_checkpoints() {
  init_index
  echo ""
  echo "================================================================="
  echo " 📋 Saved Checkpoints (${CHECKPOINT_DIR})"
  echo "================================================================="

  if command -v node >/dev/null 2>&1 && [ -f "${INDEX_FILE}" ]; then
    node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('${INDEX_FILE}', 'utf8'));
        if (!data || data.length === 0) {
          console.log('No checkpoints found. Create one with: bash checkpoint.sh create');
          process.exit(0);
        }
        data.forEach((item, idx) => {
          console.log(\`[\${idx + 1}] \${item.id}\`);
          console.log(\`    Created: \${item.timestamp}\`);
          console.log(\`    Tag:     \x1b[33m\${item.tag}\x1b[0m\`);
          console.log(\`    Size:    \${item.size}\`);
          console.log('-----------------------------------------------------------------');
        });
      } catch(e) {
        console.error('Error reading checkpoints index:', e.message);
      }
    "
  else
    ls -lh "${CHECKPOINT_DIR}"/*.tar.gz 2>/dev/null || echo "No .tar.gz checkpoints found."
  fi
  echo ""
}

function revert_checkpoint() {
  local target="$1"
  if [ -z "${target}" ]; then
    echo "❌ Error: Please specify a checkpoint filename or number."
    echo "Run 'bash checkpoint.sh list' to view available checkpoints."
    exit 1
  fi

  # Resolve index number to filename if a digit is passed
  if [[ "${target}" =~ ^[0-9]+$ ]] && command -v node >/dev/null 2>&1; then
    target=$(node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('${INDEX_FILE}', 'utf8'));
        const idx = parseInt('${target}', 10) - 1;
        if (data[idx]) { console.log(data[idx].id); }
      } catch(e){}
    ")
  fi

  local filepath="${CHECKPOINT_DIR}/${target}"
  if [ ! -f "${filepath}" ]; then
    # try adding .tar.gz if missing
    if [ -f "${CHECKPOINT_DIR}/${target}.tar.gz" ]; then
      filepath="${CHECKPOINT_DIR}/${target}.tar.gz"
    else
      echo "❌ Checkpoint file not found: ${filepath}"
      exit 1
    fi
  fi

  echo ""
  echo "⚠️  Preparing to revert ChurchCompanion to: $(basename "${filepath}")"
  echo "[Safety] Creating pre-revert safety backup first..."
  
  local safety_backup="${CHECKPOINT_DIR}/pre_revert_safety_$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "${safety_backup}" \
    --exclude='.server.pid' \
    --exclude='.server.log' \
    --exclude='.gradle' \
    --exclude='build' \
    -C "${WORKSPACE_DIR}" "ChurchCompanion"
  echo "✅ Pre-revert safety backup saved to: $(basename "${safety_backup}")"

  echo "[Checkpoint] Restoring project files from $(basename "${filepath}")..."
  tar -xzf "${filepath}" -C "${WORKSPACE_DIR}"

  echo ""
  echo "🎉 SUCCESS: ChurchCompanion has been restored to $(basename "${filepath}")!"
  echo ""
}

function diff_checkpoint() {
  local target="$1"
  if [ -z "${target}" ]; then
    echo "❌ Error: Please specify a checkpoint filename or number to compare."
    exit 1
  fi

  if [[ "${target}" =~ ^[0-9]+$ ]] && command -v node >/dev/null 2>&1; then
    target=$(node -e "
      const fs = require('fs');
      try {
        const data = JSON.parse(fs.readFileSync('${INDEX_FILE}', 'utf8'));
        const idx = parseInt('${target}', 10) - 1;
        if (data[idx]) { console.log(data[idx].id); }
      } catch(e){}
    ")
  fi

  local filepath="${CHECKPOINT_DIR}/${target}"
  if [ ! -f "${filepath}" ]; then
    if [ -f "${CHECKPOINT_DIR}/${target}.tar.gz" ]; then
      filepath="${CHECKPOINT_DIR}/${target}.tar.gz"
    else
      echo "❌ Checkpoint file not found: ${filepath}"
      exit 1
    fi
  fi

  echo "[Diff] Comparing current ChurchCompanion with $(basename "${filepath}")..."
  tar -dzf "${filepath}" -C "${WORKSPACE_DIR}" 2>&1 | head -n 40 || true
}

CMD="${1:-list}"
shift || true

case "${CMD}" in
  create)
    create_checkpoint "$*"
    ;;
  list)
    list_checkpoints
    ;;
  revert|restore)
    revert_checkpoint "$1"
    ;;
  diff)
    diff_checkpoint "$1"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: ${CMD}"
    show_help
    exit 1
    ;;
esac
