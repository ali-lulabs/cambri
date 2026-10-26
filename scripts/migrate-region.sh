#!/usr/bin/env bash
# Copy the whole Supabase database (schema, data, auth users + passwords,
# migration history) from the old project to a new one, then compare row counts.
#
# Needs Docker. Reads OLD_DB_URL and NEW_DB_URL from .env.migrate
# (Session pooler connection strings, with the database passwords filled in).
#
#   bash scripts/migrate-region.sh
#
# Follows https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.migrate ]]; then
  echo "Missing .env.migrate with OLD_DB_URL=... and NEW_DB_URL=..." >&2
  exit 1
fi
set -a; source .env.migrate; set +a
: "${OLD_DB_URL:?OLD_DB_URL not set}" "${NEW_DB_URL:?NEW_DB_URL not set}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
echo "Working in $WORK (deleted afterwards; it contains user password hashes)"

psql_new() {
  docker run --rm -i -v "$WORK:/work" -w /work postgres:17 psql "$@"
}

echo "1/4 Dumping old database…"
npx --yes supabase@latest db dump --db-url "$OLD_DB_URL" -f "$WORK/roles.sql" --role-only
npx --yes supabase@latest db dump --db-url "$OLD_DB_URL" -f "$WORK/schema.sql"
npx --yes supabase@latest db dump --db-url "$OLD_DB_URL" -f "$WORK/data.sql" --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"
npx --yes supabase@latest db dump --db-url "$OLD_DB_URL" -f "$WORK/history_schema.sql" --schema supabase_migrations
npx --yes supabase@latest db dump --db-url "$OLD_DB_URL" -f "$WORK/history_data.sql" --use-copy --data-only --schema supabase_migrations

echo "2/4 Restoring into new database (single transaction: all or nothing)…"
psql_new --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_DB_URL"

echo "3/4 Restoring migration history…"
psql_new --single-transaction --variable ON_ERROR_STOP=1 \
  --file history_schema.sql --file history_data.sql --dbname "$NEW_DB_URL"

echo "4/4 Comparing row counts (old vs new)…"
COUNT_SQL="select 'auth.users', count(*) from auth.users
  union all select 'profiles', count(*) from public.profiles
  union all select 'stores', count(*) from public.stores
  union all select 'product_models', count(*) from public.product_models
  union all select 'dispatchers', count(*) from public.dispatchers
  union all select 'tickets', count(*) from public.tickets
  union all select 'ticket_events', count(*) from public.ticket_events
  union all select 'ticket_no_seq', last_value from public.ticket_no_seq
  order by 1;"
docker run --rm postgres:17 psql "$OLD_DB_URL" -At -F ' ' -c "$COUNT_SQL" > "$WORK/old.txt"
docker run --rm postgres:17 psql "$NEW_DB_URL" -At -F ' ' -c "$COUNT_SQL" > "$WORK/new.txt"
paste "$WORK/old.txt" "$WORK/new.txt" | awk '{ status = ($2 == $4) ? "OK" : "MISMATCH"; printf "%-16s old=%-6s new=%-6s %s\n", $1, $2, $4, status }'
if diff -q "$WORK/old.txt" "$WORK/new.txt" >/dev/null; then
  echo "All counts match."
else
  echo "Counts differ. Check before switching the app over." >&2
  exit 1
fi
