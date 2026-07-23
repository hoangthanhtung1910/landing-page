#!/usr/bin/env bash
set -euo pipefail
: "${MONGO_URI:?MONGO_URI is required}"
: "${STORAGE_LOCAL_DIR:?STORAGE_LOCAL_DIR is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required and must be an explicit safe path}"
uri_without_query="${MONGO_URI%%\?*}"
mongo_database="${MONGO_DATABASE:-${uri_without_query##*/}}"
if [[ -z "$mongo_database" || "$mongo_database" == "$uri_without_query" ]]; then
  echo "MONGO_URI must include a database name, or set MONGO_DATABASE." >&2
  exit 2
fi
test -d "$STORAGE_LOCAL_DIR"
mkdir -p "$BACKUP_DIR/media"
printf '%s\n' "$mongo_database" > "$BACKUP_DIR/database.txt"
mongodump --uri="$MONGO_URI" --archive="$BACKUP_DIR/mongodb.archive" --gzip
cp -R "$STORAGE_LOCAL_DIR"/. "$BACKUP_DIR/media/"
date -u +%FT%TZ > "$BACKUP_DIR/completed-at.txt"
