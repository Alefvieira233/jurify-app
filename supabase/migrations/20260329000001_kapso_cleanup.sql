-- Final Kapso migration cleanup
-- Removes 'evolution' from conexoes_whatsapp tipo constraint.
-- All existing 'evolution' rows were already migrated to 'kapso' by 20260325000001_kapso_migration.sql.

-- Drop the old constraint that still allows 'evolution'
ALTER TABLE conexoes_whatsapp
  DROP CONSTRAINT IF EXISTS conexoes_whatsapp_tipo_check;

-- Add clean constraint without 'evolution'
ALTER TABLE conexoes_whatsapp
  ADD CONSTRAINT conexoes_whatsapp_tipo_check
  CHECK (tipo IN ('kapso', 'oficial', 'cloud_api'));

-- Safety: verify no rows have tipo='evolution' (would fail constraint)
-- If any exist, the ALTER above would have failed, which is correct behavior.
