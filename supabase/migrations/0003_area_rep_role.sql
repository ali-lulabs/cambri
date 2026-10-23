-- New role: area rep (covers several stores, reviews their tickets).
-- Separate migration: Postgres can't use a new enum value in the transaction that adds it.
alter type user_role add value if not exists 'area_rep';
