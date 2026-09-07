#!/usr/bin/env bash
# Record a correction and optionally draft an eval case.
# Usage:
#   ./scripts/record-correction.sh
#   OR pipe a block: cat block.txt | ./scripts/record-correction.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/traces/corrections"
mkdir -p "$DIR" "$ROOT/evals"

if [ -t 0 ]; then
  echo "Paste correction block, then Ctrl-D:"
fi
BLOCK="$(cat)"

wrong=$(printf '%s\n' "$BLOCK" | sed -n 's/^WRONG:[[:space:]]*//p' | head -1)
should=$(printf '%s\n' "$BLOCK" | sed -n 's/^SHOULD:[[:space:]]*//p' | head -1)
gap=$(printf '%s\n' "$BLOCK" | sed -n 's/^SOP_GAP:[[:space:]]*//p' | head -1 | tr '[:upper:]' '[:lower:]')
promote=$(printf '%s\n' "$BLOCK" | sed -n 's/^PROMOTE:[[:space:]]*//p' | head -1 | tr '[:upper:]' '[:lower:]')
eval_line=$(printf '%s\n' "$BLOCK" | sed -n 's/^EVAL:[[:space:]]*//p' | head -1)

if [ -z "$wrong" ] || [ -z "$should" ] || [ -z "$gap" ] || [ -z "$promote" ] || [ -z "$eval_line" ]; then
  echo "Need WRONG / SHOULD / SOP_GAP / PROMOTE / EVAL lines" >&2
  exit 1
fi

slug=$(printf '%s' "$wrong" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g' | cut -c1-40)
day=$(date -u +%F)
file="$DIR/${day}-${slug}.md"
{
  echo "---"
  echo "id: ${day}-${slug}"
  echo "promote: ${promote}"
  echo "sop_gap: ${gap}"
  echo "---"
  echo
  printf '%s\n' "$BLOCK"
  echo
  echo "## Resolution"
  if [ "$promote" = "yes" ]; then
    echo "- eval: drafted"
  else
    echo "- eval: none (PROMOTE=no)"
  fi
  if [ "$gap" = "conflict" ]; then
    echo "- sop: FROZEN — human merge required"
  fi
} >"$file"

echo "Wrote $file"

if [ "$promote" = "yes" ]; then
  n=$(find "$ROOT/evals" -name '*.yaml' | wc -l | tr -d ' ')
  n=$((n + 1))
  id=$(printf '%03d' "$n")
  eval_file="$ROOT/evals/${id}-from-correction.yaml"
  {
    echo "# id: \"${id}\""
    echo "name: from-correction-${slug}"
    echo "skill: unknown"
    echo "input: |"
    echo "  ${eval_line%%→*}"
    echo "expect:"
    echo "  from_correction: true"
    echo "  should_note: $(printf '%s' "$should" | sed 's/"/\\"/g')"
  } >"$eval_file"
  echo "Wrote $eval_file — patch the matching SKILL.md next, then commit."
fi
