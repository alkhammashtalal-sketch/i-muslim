#!/usr/bin/env bash
# Every wrangler command goes through this script (reply 0033-add1 §4; CLAUDE.md §13), from window 1 and from every agent:
#   scripts/wr.sh <wrangler arguments…>        e.g. scripts/wr.sh deploy --env next
# Reads run as they are. A command that writes is refused unless it targets env next (Worker i-muslim-next, D1
# imuslim-next) or the static site Worker i-muslim-site (site/wrangler.jsonc). Written after 13 October, when
# `wrangler pages project create i-muslim`, run by an agent from worker/, became a Workers deploy of worker/wrangler.jsonc's
# top-level (frozen production) configuration under the name i-muslim (docs/incidents/2026-10-13-live-deploy.md).
# WR_DRY=1 prints the decision (ALLOW / REFUSE) and does not run wrangler (worker/test/wr-guard.test.ts).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_NAME="i-muslim-site"
NEXT_NAME="i-muslim-next"
NEXT_DB="imuslim-next"
# Vectorize indexes of env next (reply 0048 §1): imuslim-next-passages, imuslim-next-hadiths. The live imuslim-passages
# never matches: --env next does not bind a vectorize command to an index, so the name is checked too.
NEXT_INDEX_PREFIX="imuslim-next-"

refuse() {
  echo "REFUSE: $1" >&2
  echo "❌ scripts/wr.sh: $1 (reply 0033-add1 §4). Writes go only to --env next or to the site Worker ${SITE_NAME}." >&2
  exit 2
}
allow() {
  if [ "${WR_DRY:-}" = "1" ]; then
    echo "ALLOW: $1"
    exit 0
  fi
  exec npx wrangler "${ARGS[@]}"
}

ARGS=("$@")
[ ${#ARGS[@]} -gt 0 ] || refuse "no command"

# Options that matter, wherever they are; the positionals in order.
ENV_NAME="" NAME="" CONFIG="" CWDOPT="" REMOTE=0 LOCAL=0
POS=()
i=0
while [ $i -lt ${#ARGS[@]} ]; do
  a="${ARGS[$i]}"
  next="${ARGS[$((i + 1))]:-}"
  case "$a" in
    --env | -e) ENV_NAME="$next"; i=$((i + 2)); continue ;;
    --env=*) ENV_NAME="${a#--env=}" ;;
    --name) NAME="$next"; i=$((i + 2)); continue ;;
    --name=*) NAME="${a#--name=}" ;;
    --config | -c) CONFIG="$next"; i=$((i + 2)); continue ;;
    --config=*) CONFIG="${a#--config=}" ;;
    --cwd) CWDOPT="$next"; i=$((i + 2)); continue ;;
    --cwd=*) CWDOPT="${a#--cwd=}" ;;
    --remote) REMOTE=1 ;;
    --local) LOCAL=1 ;;
    # Options whose value is a separate word, so the value is not taken for a positional.
    --command | --file | --message | -m | --tag | --production-branch | --compatibility-date | --compatibility-flag | --compatibility-flags | --format | --profile | --env-file | --port | --ip | --persist-to | --outdir | --var | --define | --assets | --routes | --route | --triggers | --zone | \
    --dimensions | --metric | --preset | --description | --property-name | --propertyName | --type | --batch-size | --ids | --top-k | --vector | --vector-id | --filter | --namespace | --count | --cursor)
      i=$((i + 2)); continue ;;
    -*) ;;
    *) POS+=("$a") ;;
  esac
  i=$((i + 1))
done
CMD="${POS[0]:-}"
SUB="${POS[1]:-}"
SUB2="${POS[2]:-}"

# The Worker a config file names (top-level "name").
config_name() {
  local f="$1"
  [ -f "$f" ] || { echo ""; return; }
  sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$f" | head -1
}
# The config wrangler would read: -c, else wrangler.jsonc / wrangler.json / wrangler.toml in the directory it runs in
# (--cwd, else the current one).
BASE="${CWDOPT:-.}"
CFG_FILE="$CONFIG"
if [ -n "$CFG_FILE" ] && [ -n "$CWDOPT" ] && [ "${CFG_FILE#/}" = "$CFG_FILE" ]; then CFG_FILE="$CWDOPT/$CFG_FILE"; fi
if [ -z "$CFG_FILE" ]; then
  for f in wrangler.jsonc wrangler.json wrangler.toml; do [ -f "$BASE/$f" ] && { CFG_FILE="$BASE/$f"; break; }; done
fi
CFG_NAME=""
[ -n "$CFG_FILE" ] && CFG_NAME="$(config_name "$CFG_FILE")"
is_site=0
if [ "$CFG_NAME" = "$SITE_NAME" ] && [ -z "$ENV_NAME" ] && { [ -z "$NAME" ] || [ "$NAME" = "$SITE_NAME" ]; }; then
  # The site config must be static assets only: no Worker code, no D1, no Vectorize, no triggers.
  if ! grep -qE '"(main|d1_databases|vectorize|triggers|routes)"' "$CFG_FILE"; then is_site=1; fi
fi
is_next=0
if [ "$ENV_NAME" = "next" ] && { [ -z "$NAME" ] || [ "$NAME" = "$NEXT_NAME" ]; }; then is_next=1; fi

case "$CMD" in
  "" )
    case " ${ARGS[*]} " in *" --version "* | *" -v "* | *" --help "* | *" -h "*) allow "help or version" ;; esac
    refuse "no command" ;;
  whoami | tail | types | docs | login | logout)
    allow "read: $CMD" ;;
  deployments)
    [ "$SUB" = "list" ] || [ "$SUB" = "status" ] || [ -z "$SUB" ] && allow "read: deployments $SUB"
    refuse "deployments $SUB" ;;
  versions)
    case "$SUB" in
      list | view) allow "read: versions $SUB" ;;
      upload | deploy | secret)
        [ $is_next = 1 ] && allow "versions $SUB to $NEXT_NAME"
        [ $is_site = 1 ] && allow "versions $SUB to $SITE_NAME"
        refuse "versions $SUB without --env next (or the site config)" ;;
      *) refuse "versions $SUB" ;;
    esac ;;
  pages)
    # The command of the incident lives here; only the project list is read.
    [ "$SUB" = "project" ] && [ "$SUB2" = "list" ] && allow "read: pages project list"
    refuse "pages $SUB $SUB2: Pages commands may deploy a Worker (the 13 October incident)" ;;
  delete)
    # No Cloudflare resource is ever deleted (CLAUDE.md §12, §13), next included.
    refuse "delete: no Cloudflare resource is deleted" ;;
  deploy | rollback | triggers)
    [ $is_next = 1 ] && allow "$CMD to $NEXT_NAME"
    [ $is_site = 1 ] && [ "$CMD" != "triggers" ] && allow "$CMD to $SITE_NAME"
    refuse "$CMD without --env next (or the site config ${SITE_NAME}${NAME:+; --name $NAME})" ;;
  secret)
    [ "$SUB" = "list" ] && allow "read: secret list"
    [ $is_next = 1 ] && allow "secret $SUB on $NEXT_NAME"
    refuse "secret $SUB without --env next" ;;
  dev)
    # Remote dev binds the config's real resources: only env next. Local dev uses local simulators.
    [ $REMOTE = 0 ] && allow "local dev"
    [ $is_next = 1 ] && allow "remote dev on env next"
    refuse "dev --remote without --env next" ;;
  d1)
    DB="${POS[2]:-}"
    case "$SUB" in
      list | info) allow "read: d1 $SUB" ;;
      migrations)
        DB="${POS[3]:-}"
        [ "$SUB2" = "list" ] && allow "read: d1 migrations list $DB"
        [ $LOCAL = 1 ] && [ $REMOTE = 0 ] && allow "local d1 migrations"
        [ "$DB" = "$NEXT_DB" ] && [ "$ENV_NAME" = "next" ] && allow "d1 migrations $SUB2 on $NEXT_DB"
        refuse "d1 migrations $SUB2 on '$DB' (only $NEXT_DB with --env next)" ;;
      execute | import | export | time-travel)
        [ $LOCAL = 1 ] && [ $REMOTE = 0 ] && allow "local d1 $SUB"
        [ "$DB" = "$NEXT_DB" ] && [ "$ENV_NAME" = "next" ] && allow "d1 $SUB on $NEXT_DB"
        refuse "d1 $SUB on '$DB' (only $NEXT_DB with --env next)" ;;
      *) refuse "d1 $SUB" ;;
    esac ;;
  vectorize)
    # Reply 0048 §1: create, insert, upsert and the metadata index with --env next on a next index only; reads on a next
    # index only (the live index is never asked: reply 0031-add7); never a delete, next included.
    IDX="${POS[2]:-}"
    on_next_index=0
    case "$IDX" in "$NEXT_INDEX_PREFIX"?*) on_next_index=1 ;; esac
    case "$SUB" in
      list) allow "read: vectorize list" ;;
      info | get | get-vectors | list-vectors | list-metadata-index | query)
        [ $on_next_index = 1 ] && allow "read: vectorize $SUB $IDX"
        refuse "vectorize $SUB on '$IDX' (only ${NEXT_INDEX_PREFIX}* indexes)" ;;
      create | insert | upsert | create-metadata-index)
        [ "$ENV_NAME" = "next" ] && [ $on_next_index = 1 ] && allow "vectorize $SUB on $IDX"
        refuse "vectorize $SUB on '$IDX' (only ${NEXT_INDEX_PREFIX}* indexes with --env next)" ;;
      delete | delete-vectors | delete-metadata-index)
        refuse "vectorize $SUB: no Cloudflare resource or vector is deleted" ;;
      *) refuse "vectorize $SUB" ;;
    esac ;;
  *)
    refuse "unknown or writing command '$CMD' (add it to scripts/wr.sh with its rule)" ;;
esac
