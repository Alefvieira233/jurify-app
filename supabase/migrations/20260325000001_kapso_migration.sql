-- Migration: Evolution API → Kapso API
-- Updates all references from evolution to kapso across the database

-- Update configuracoes_integracoes
UPDATE configuracoes_integracoes
SET nome_integracao = 'whatsapp_kapso',
    observacoes = REPLACE(observacoes, 'Instance: ', 'Kapso Phone: ')
WHERE nome_integracao = 'whatsapp_evolution';

-- Also catch the alternate naming
UPDATE configuracoes_integracoes
SET nome_integracao = 'whatsapp_kapso'
WHERE nome_integracao = 'evolution_whatsapp';

-- Update conexoes_whatsapp tipo constraint
ALTER TABLE conexoes_whatsapp
  DROP CONSTRAINT IF EXISTS conexoes_whatsapp_tipo_check;

ALTER TABLE conexoes_whatsapp
  ADD CONSTRAINT conexoes_whatsapp_tipo_check
  CHECK (tipo IN ('kapso', 'oficial', 'cloud_api', 'evolution'));

-- Update existing connections
UPDATE conexoes_whatsapp
SET tipo = 'kapso', provider = 'kapso_api'
WHERE tipo = 'evolution' AND provider = 'evolution_api';

-- Update column defaults so new connections default to kapso
ALTER TABLE conexoes_whatsapp ALTER COLUMN tipo SET DEFAULT 'kapso';
ALTER TABLE conexoes_whatsapp ALTER COLUMN provider SET DEFAULT 'kapso_api';

-- Update conexoes_logs origin references
UPDATE conexoes_logs
SET origem = 'kapso-manager'
WHERE origem = 'evolution-manager';
