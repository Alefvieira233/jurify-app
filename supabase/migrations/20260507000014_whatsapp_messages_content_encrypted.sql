-- Cifragem at-rest do conteúdo de whatsapp_messages (LGPD art. 46/48 — segurança).
-- Chave AES-256 armazenada em vault.secrets (encrypted-at-rest pela Supabase).
-- Estratégia "dual-read window" (2026-05-07 → 2026-06-07):
--   - Novo INSERT cifra content → content_encrypted automaticamente (trigger).
--   - Leitura via RPC decrypt_whatsapp_message_content que decifra ou cai
--     no content plaintext (legacy).
-- Após backfill completo (fase 2), content será setado a NULL e a coluna
-- removida em fase 3.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM vault.secrets WHERE name = 'whatsapp_content_encryption_key';
  IF v_existing_id IS NULL THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'whatsapp_content_encryption_key',
      'AES-256 key for whatsapp_messages.content cifragem at-rest. Created 2026-05-07.'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public._get_whatsapp_msg_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'vault', 'pg_catalog'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
   WHERE name = 'whatsapp_content_encryption_key'
   LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'whatsapp_content_encryption_key não encontrada no vault';
  END IF;
  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public._get_whatsapp_msg_key() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS content_encrypted BYTEA NULL;

COMMENT ON COLUMN public.whatsapp_messages.content_encrypted IS
  'Conteúdo cifrado AES-256 via pgcrypto. Chave em vault.secrets. Campo content (plaintext) está em deprecação — dual-read window 2026-05-07 → 2026-06-07.';

CREATE OR REPLACE FUNCTION public.fn_encrypt_whatsapp_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN
    NEW.content_encrypted := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
    v_key := public._get_whatsapp_msg_key();
    NEW.content_encrypted := extensions.pgp_sym_encrypt(NEW.content, v_key, 'cipher-algo=aes256');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_whatsapp_content ON public.whatsapp_messages;
CREATE TRIGGER trg_encrypt_whatsapp_content
  BEFORE INSERT OR UPDATE OF content ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_encrypt_whatsapp_content();

CREATE OR REPLACE FUNCTION public.decrypt_whatsapp_message_content(_message_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  v_content_encrypted BYTEA;
  v_content_plain TEXT;
  v_tenant UUID;
  v_key TEXT;
  v_caller_has_access BOOLEAN;
BEGIN
  SELECT content_encrypted, content, tenant_id
    INTO v_content_encrypted, v_content_plain, v_tenant
    FROM public.whatsapp_messages
   WHERE id = _message_id;

  IF v_tenant IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = auth.uid()
       AND ur.tenant_id = v_tenant
       AND ur.ativo = true
  ) INTO v_caller_has_access;

  IF NOT v_caller_has_access THEN
    RAISE EXCEPTION 'Access denied for message %', _message_id USING ERRCODE = '42501';
  END IF;

  IF v_content_encrypted IS NOT NULL THEN
    v_key := public._get_whatsapp_msg_key();
    RETURN extensions.pgp_sym_decrypt(v_content_encrypted, v_key);
  END IF;

  RETURN v_content_plain;
END;
$$;

REVOKE ALL ON FUNCTION public.decrypt_whatsapp_message_content(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_whatsapp_message_content(UUID) TO authenticated, service_role;

-- Backfill registros existentes
UPDATE public.whatsapp_messages
   SET content_encrypted = extensions.pgp_sym_encrypt(content, public._get_whatsapp_msg_key(), 'cipher-algo=aes256')
 WHERE content IS NOT NULL
   AND content_encrypted IS NULL;

-- NOTA fase 2 (não aplicar agora): após confirmar que toda leitura usa
-- decrypt_whatsapp_message_content RPC ou VIEW, executar:
--   UPDATE whatsapp_messages SET content = NULL WHERE content_encrypted IS NOT NULL;
-- E em fase 3, ALTER TABLE DROP COLUMN content.
