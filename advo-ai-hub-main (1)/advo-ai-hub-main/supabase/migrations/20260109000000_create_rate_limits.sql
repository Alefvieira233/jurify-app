-- =========================================================
-- MIGRATION: Rate Limiting Table
-- Criado em: 2026-01-09
-- Propósito: Armazenar contadores de rate limiting
-- =========================================================

-- Cria tabela de rate limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    namespace TEXT NOT NULL DEFAULT 'default',
    identifier TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_namespace_identifier ON public.rate_limits(namespace, identifier);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_updated_at_trigger
    BEFORE UPDATE ON public.rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rate_limits_updated_at();

-- Comentários
COMMENT ON TABLE public.rate_limits IS 'Armazena contadores de rate limiting para Edge Functions';
COMMENT ON COLUMN public.rate_limits.key IS 'Chave única: namespace:identifier';
COMMENT ON COLUMN public.rate_limits.namespace IS 'Namespace do rate limiter (ex: whatsapp-webhook, ai-agent)';
COMMENT ON COLUMN public.rate_limits.identifier IS 'Identificador (ex: user:uuid, ip:xxx.xxx)';
COMMENT ON COLUMN public.rate_limits.count IS 'Número de requisições na janela atual';
COMMENT ON COLUMN public.rate_limits.reset_at IS 'Quando o contador será resetado';

-- RLS Policies (Service Role tem acesso total, usuários não devem acessar)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas Service Role pode acessar
CREATE POLICY "Service role can access rate_limits"
    ON public.rate_limits
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Negar acesso a usuários autenticados
CREATE POLICY "Users cannot access rate_limits"
    ON public.rate_limits
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

-- Policy: Negar acesso a anon
CREATE POLICY "Anon cannot access rate_limits"
    ON public.rate_limits
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

-- =========================================================
-- FUNÇÃO DE LIMPEZA AUTOMÁTICA (opcional)
-- =========================================================

-- Function para limpar registros expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.rate_limits
    WHERE reset_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_rate_limits() IS 'Remove registros de rate limit expirados. Executar via cron job.';

-- =========================================================
-- EXEMPLO DE USO VIA CRON (pg_cron extension)
-- =========================================================

-- Se você tiver pg_cron instalado, pode agendar limpeza automática:
--
-- SELECT cron.schedule(
--     'cleanup-rate-limits',
--     '0 * * * *', -- A cada hora
--     'SELECT public.cleanup_expired_rate_limits();'
-- );
--
-- Para habilitar pg_cron:
-- 1. No Supabase Dashboard: Database > Extensions
-- 2. Habilite "pg_cron"
-- 3. Execute o comando acima no SQL Editor

-- =========================================================
-- GRANT PERMISSIONS
-- =========================================================

-- Service role precisa de acesso total
GRANT ALL ON public.rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

-- Revoke de outros roles
REVOKE ALL ON public.rate_limits FROM authenticated;
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM public;
