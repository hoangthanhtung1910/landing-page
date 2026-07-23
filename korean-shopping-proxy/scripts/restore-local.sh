#!/usr/bin/env bash
set -euo pipefail
: "${MONGO_URI:?MONGO_URI is required}"
: "${STORAGE_LOCAL_DIR:?STORAGE_LOCAL_DIR is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required and must identify one backup}"
test -f "$BACKUP_DIR/completed-at.txt"
test -f "$BACKUP_DIR/database.txt"
test -f "$BACKUP_DIR/mongodb.archive"
source_database="$(tr -d '\r\n' < "$BACKUP_DIR/database.txt")"
uri_without_query="${MONGO_URI%%\?*}"
target_database="${MONGO_DATABASE:-${uri_without_query##*/}}"
if [[ -z "$target_database" || "$target_database" == "$uri_without_query" ]]; then
  echo "MONGO_URI must include a target database name, or set MONGO_DATABASE." >&2
  exit 2
fi
uri_query=""
if [[ "$MONGO_URI" == *"?"* ]]; then
  uri_query="?${MONGO_URI#*\?}"
fi
# A database in the connection URI implicitly filters the archive before
# namespace mapping. Connect at server scope and explicitly include the source.
server_uri="${uri_without_query%/*}${uri_query}"
mongorestore \
  --uri="$server_uri" \
  --archive="$BACKUP_DIR/mongodb.archive" \
  --gzip \
  --drop \
  --nsInclude="$source_database.*" \
  --nsFrom="$source_database.*" \
  --nsTo="$target_database.*"
mkdir -p "$STORAGE_LOCAL_DIR"
cp -R "$BACKUP_DIR/media"/. "$STORAGE_LOCAL_DIR/"
