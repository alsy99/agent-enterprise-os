#!/usr/bin/env bash
# Resolve which model/role to use for a skill step.
# Usage:
#   ./scripts/resolve-model.sh market-research
#   ./scripts/resolve-model.sh sales-outbound actor
#   ./scripts/resolve-model.sh sales-outbound verifier
#   ./scripts/resolve-model.sh eng-pr
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ROUTER="$ROOT/integrations/models/router.yaml"
CATALOG="$ROOT/integrations/models/catalog.yaml"

skill="${1:-}"
which="${2:-actor}"

if [ -z "$skill" ]; then
  echo "Usage: $0 <skill> [actor|verifier]" >&2
  exit 1
fi

strip_comment() {
  sed 's/#.*//' | tr -d '"' | tr -d "'" | xargs
}

# Map skill -> department via skill_to_department, else use skill as dept key
dept=$(awk -v s="$skill" '
  $0 ~ /^skill_to_department:/ {p=1; next}
  p && /^[^ ]/ {exit}
  p {
    gsub(/:/, " ")
    if ($1 == s) { print $2; exit }
  }
' "$ROUTER" | strip_comment)

if [ -z "$dept" ]; then
  dept="$skill"
fi

# Allow direct role names
case "$skill" in
  planner|worker|verifier|coder|thinker|failover)
    role="$skill"
    dept=""
    ;;
esac

if [ -z "${role:-}" ]; then
  dept_block=$(awk -v d="$dept" '
    $0 ~ "^  " d ":" {p=1; next}
    p && /^  [a-zA-Z]/ {exit}
    p {print}
  ' "$ROUTER")

  if [ -z "$dept_block" ]; then
    echo "Unknown skill/dept: $skill" >&2
    exit 1
  fi

  if [ "$which" = "verifier" ]; then
    role=$(printf '%s\n' "$dept_block" | sed -n 's/^[[:space:]]*verifier:[[:space:]]*//p' | head -1 | strip_comment)
  else
    role=$(printf '%s\n' "$dept_block" | sed -n 's/^[[:space:]]*actor:[[:space:]]*//p' | head -1 | strip_comment)
  fi
fi

if [ -z "$role" ] || [ "$role" = "human_if_public" ]; then
  echo "skill=$skill"
  echo "which=$which"
  echo "role=${role:-unknown}"
  echo "action=human_gate"
  exit 0
fi

primary=$(awk -v r="$role" '
  $0 ~ "^  " r ":" {p=1; next}
  p && /^  [a-zA-Z]/ {exit}
  p && /primary:/ {
    sub(/^[^:]*:[[:space:]]*/, "")
    print
    exit
  }
' "$ROUTER" | strip_comment)

model_id=$(awk -v m="$primary" '
  $0 ~ "^  " m ":" {p=1; next}
  p && /^  [a-zA-Z0-9_-]+:/ && $0 !~ /^    / {exit}
  p && /^    id:/ {
    sub(/^    id:[[:space:]]*/, "")
    print
    exit
  }
' "$CATALOG" | strip_comment)

provider=$(awk -v m="$primary" '
  $0 ~ "^  " m ":" {p=1; next}
  p && /^  [a-zA-Z0-9_-]+:/ && $0 !~ /^    / {exit}
  p && /provider:/ {
    sub(/^[^:]*:[[:space:]]*/, "")
    print
    exit
  }
' "$CATALOG" | strip_comment)

base=$(awk -v p="$provider" '
  $0 ~ "^  " p ":" {f=1; next}
  f && /^  [a-zA-Z0-9_-]+:/ && $0 !~ /^    / {exit}
  f && /base_url:/ {
    sub(/^[^:]*:[[:space:]]*/, "")
    print
    exit
  }
' "$CATALOG" | strip_comment)

echo "skill=$skill"
echo "dept=${dept:-n/a}"
echo "which=$which"
echo "role=$role"
echo "model_key=$primary"
echo "model_id=$model_id"
echo "provider=$provider"
echo "base_url=$base"
echo "litellm_model=$role"
