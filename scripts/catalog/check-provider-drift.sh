#!/usr/bin/env bash
# Compares every spec listed in catalog/index.json with its provider's spec and
# prints a Markdown table. Informational: exits 0 unless --strict is given and
# drift (or an index status that no longer matches reality) is found.
#
# Usage:
#   scripts/catalog/check-provider-drift.sh                      # fetch raw files from GitHub
#   scripts/catalog/check-provider-drift.sh --providers-dir DIR  # use checkouts at DIR/<repo-name>
#   options: --ref REF     provider ref (default: main; with --providers-dir, origin/REF is
#                          read from git when the checkout is a git repository)
#            --strict      exit 1 on drift or index/status mismatch
#            --out FILE    also write the table to FILE (for $GITHUB_STEP_SUMMARY)
#
# Requires bash, node and curl. When oasdiff is on PATH, the table also shows how
# many breaking errors a mirror PR (catalog copy -> provider spec) would raise.
# Without a token, files are read anonymously from raw.githubusercontent.com,
# which only serves public repos. With a read-only token in PROVIDER_SPECS_TOKEN
# (or GH_TOKEN), files are read through the GitHub contents API, which also
# covers private provider repos. Unreadable providers are reported as
# "unverified", not as drift.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INDEX="$ROOT/catalog/index.json"
RAW_BASE="${RAW_BASE:-https://raw.githubusercontent.com}"
API_BASE="${API_BASE:-https://api.github.com}"
PROVIDERS_DIR=""
REF="main"
STRICT=0
OUT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --providers-dir) PROVIDERS_DIR="$2"; shift 2 ;;
    --ref) REF="$2"; shift 2 ;;
    --strict) STRICT=1; shift ;;
    --out) OUT="$2"; shift 2 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -f "$INDEX" ] || { echo "catalog/index.json not found" >&2; exit 2; }

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# One tab-separated line per entry: file, ownerRepo, providerSpecPath, status
entries="$(node -e '
  const idx = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  for (const e of idx.entries) {
    console.log([e.file ?? "-", e.ownerRepo, e.providerSpecPath ?? "-", e.status].join("\t"));
  }' "$INDEX")"

TOKEN="${PROVIDER_SPECS_TOKEN:-${GH_TOKEN:-}}"
FETCH_CODE=""

# fetch_provider <repo-without-owner> <path> <dest>; returns 0 if fetched.
# Sets FETCH_CODE to the HTTP status (remote mode) or "local".
fetch_provider() {
  local repo="$1" path="$2" dest="$3"
  FETCH_CODE="local"
  if [ -n "$PROVIDERS_DIR" ]; then
    local dir="$PROVIDERS_DIR/$repo"
    if [ -d "$dir/.git" ] || git -C "$dir" rev-parse --git-dir >/dev/null 2>&1; then
      git -C "$dir" show "origin/$REF:$path" > "$dest" 2>/dev/null \
        || git -C "$dir" show "$REF:$path" > "$dest" 2>/dev/null
    else
      [ -f "$dir/$path" ] && cp "$dir/$path" "$dest"
    fi
  else
    if [ -n "$TOKEN" ]; then
      # Authenticated: GitHub contents API with the raw media type (works for
      # private repos). Headers come from stdin so the token never appears in
      # the process list.
      FETCH_CODE="$(printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github.raw"\n' "$TOKEN" \
        | curl -sS -L --retry 3 --config - -o "$dest" -w '%{http_code}' \
            "$API_BASE/repos/COPUR/$repo/contents/$path?ref=$REF" 2>/dev/null || true)"
    else
      # Anonymous: raw.githubusercontent.com (public repos only).
      FETCH_CODE="$(curl -sS -L --retry 3 -o "$dest" -w '%{http_code}' \
        "$RAW_BASE/COPUR/$repo/$REF/$path" 2>/dev/null || true)"
    fi
    [ "$FETCH_CODE" = "200" ]
  fi
}

have_oasdiff=0
command -v oasdiff >/dev/null 2>&1 && have_oasdiff=1

table="| Spec | Owner repo | Index status | Observed | Expected status | Lines +/- | Mirror PR oasdiff ERR |
|---|---|---|---|---|---|---|"
problems=0
unverified=0
n=0

while IFS=$'\t' read -r file owner ppath status; do
  [ -n "$file" ] || continue
  n=$((n + 1))
  repo="${owner#COPUR/}"
  prov="$tmpdir/prov-$n.yaml"
  observed=""; derived=""; delta="-"; breaking="-"

  if [ "$ppath" = "-" ]; then
    observed="no provider spec path"
    case "$status" in
      catalog-only|provider-missing) derived="$status" ;;
      *) derived="provider-missing" ;;
    esac
  elif ! fetch_provider "$repo" "$ppath" "$prov"; then
    if [ "$FETCH_CODE" = "local" ]; then
      observed="provider spec not found"
      derived="provider-missing"
    else
      observed="not readable (HTTP ${FETCH_CODE:-000}; missing, or private repo without token)"
      derived="unverified"
    fi
  elif [ "$file" = "-" ]; then
    observed="provider has spec, not mirrored"
    derived="expected"
  elif cmp -s "$ROOT/$file" "$prov"; then
    observed="identical"
    derived="mirrored"
  else
    observed="differs"
    derived="drifted"
    delta="$( { diff "$ROOT/$file" "$prov" || true; } | awk '/^>/{a++} /^</{d++} END{printf "+%d/-%d", a, d}')"
    if [ "$have_oasdiff" -eq 1 ]; then
      breaking="$(oasdiff breaking --fail-on ERR "$ROOT/$file" "$prov" 2>/dev/null | grep -c '^error' || true)"
    else
      breaking="n/a (no oasdiff)"
    fi
  fi

  if [ "$derived" = "unverified" ]; then
    unverified=$((unverified + 1))
  elif [ "$derived" != "$status" ] || [ "$derived" = "drifted" ]; then
    problems=$((problems + 1))
  fi
  [ "$ppath" = "-" ] && ppath_disp="-" || ppath_disp="\`$ppath\`"
  table+=$'\n'"| \`$file\` | \`$repo\` ($ppath_disp) | $status | $observed | $derived | $delta | $breaking |"
done <<< "$entries"

summary="Provider drift check against \`$REF\` ($( [ -n "$PROVIDERS_DIR" ] && echo "local checkouts" || { [ -n "$TOKEN" ] && echo "GitHub contents API" || echo "raw.githubusercontent.com, anonymous"; } )): $n entries, $problems needing attention (drift or index status out of date), $unverified unverified (provider not readable)."

printf '%s\n\n%s\n' "$summary" "$table"
if [ -n "$OUT" ]; then
  printf '## Provider drift\n\n%s\n\n%s\n' "$summary" "$table" >> "$OUT"
fi

if [ "$STRICT" -eq 1 ] && [ "$problems" -gt 0 ]; then
  exit 1
fi
exit 0
