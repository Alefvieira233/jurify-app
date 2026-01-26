
-- Corrigir search_path para todas as funções existentes para segurança

-- 1. Função marcar_notificacao_lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida(notificacao_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
  UPDATE public.notificacoes 
  SET lido_por = array_append(lido_por, user_id)
  WHERE id = notificacao_id 
    AND NOT (user_id = ANY(lido_por));
  
  RETURN FOUND;
END;
$function$;

-- 2. Função marcar_todas_lidas
CREATE OR REPLACE FUNCTION public.marcar_todas_lidas(user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  count_updated INTEGER;
BEGIN
  UPDATE public.notificacoes 
  SET lido_por = array_append(lido_por, user_id)
  WHERE ativo = true 
    AND NOT (user_id = ANY(lido_por));
  
  GET DIAGNOSTICS count_updated = ROW_COUNT;
  RETURN count_updated;
END;
$function$;

-- 3. Função contar_nao_lidas
CREATE OR REPLACE FUNCTION public.contar_nao_lidas(user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.notificacoes 
  WHERE ativo = true 
    AND NOT (user_id = ANY(lido_por))
$function$;

-- 4. Função validar_api_key
CREATE OR REPLACE FUNCTION public.validar_api_key(_key_value text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.api_keys 
    WHERE key_value = _key_value 
      AND ativo = true
  )
$function$;

-- 5. Função buscar_agente_para_execucao
CREATE OR REPLACE FUNCTION public.buscar_agente_para_execucao(_agente_id uuid)
 RETURNS TABLE(id uuid, nome text, descricao_funcao text, prompt_base text, tipo_agente text, status text, parametros_avancados jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT 
    a.id,
    a.nome,
    a.descricao_funcao,
    a.prompt_base,
    a.tipo_agente,
    a.status,
    a.parametros_avancados
  FROM public.agentes_ia a
  WHERE a.id = _agente_id 
    AND a.status = 'ativo'
$function$;

-- 6. Função is_google_token_expired
CREATE OR REPLACE FUNCTION public.is_google_token_expired(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT COALESCE(
    (SELECT expires_at < now() FROM public.google_calendar_tokens WHERE user_id = $1),
    true
  )
$function$;

-- 7. Função get_user_calendar_settings
CREATE OR REPLACE FUNCTION public.get_user_calendar_settings(user_id uuid)
 RETURNS TABLE(calendar_enabled boolean, auto_sync boolean, calendar_id text, sync_direction text, notification_enabled boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT 
    COALESCE(gcs.calendar_enabled, false),
    COALESCE(gcs.auto_sync, true),
    gcs.calendar_id,
    COALESCE(gcs.sync_direction, 'jurify_to_google'),
    COALESCE(gcs.notification_enabled, true)
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = $1
  UNION ALL
  SELECT false, true, NULL, 'jurify_to_google', true
  WHERE NOT EXISTS (SELECT 1 FROM public.google_calendar_settings WHERE user_id = $1)
  LIMIT 1
$function$;

-- 8. Função registrar_log_atividade
CREATE OR REPLACE FUNCTION public.registrar_log_atividade(_usuario_id uuid, _nome_usuario text, _tipo_acao tipo_acao, _modulo text, _descricao text, _ip_usuario text DEFAULT NULL::text, _detalhes_adicionais jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.logs_atividades (
    usuario_id,
    nome_usuario,
    tipo_acao,
    modulo,
    descricao,
    ip_usuario,
    detalhes_adicionais
  ) VALUES (
    _usuario_id,
    _nome_usuario,
    _tipo_acao,
    _modulo,
    _descricao,
    _ip_usuario,
    _detalhes_adicionais
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- 9. Função buscar_logs_atividades
CREATE OR REPLACE FUNCTION public.buscar_logs_atividades(_limite integer DEFAULT 50, _offset integer DEFAULT 0, _usuario_id uuid DEFAULT NULL::uuid, _tipo_acao tipo_acao DEFAULT NULL::tipo_acao, _modulo text DEFAULT NULL::text, _data_inicio timestamp with time zone DEFAULT NULL::timestamp with time zone, _data_fim timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, usuario_id uuid, nome_usuario text, tipo_acao tipo_acao, modulo text, descricao text, data_hora timestamp with time zone, ip_usuario text, detalhes_adicionais jsonb, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    la.id,
    la.usuario_id,
    la.nome_usuario,
    la.tipo_acao,
    la.modulo,
    la.descricao,
    la.data_hora,
    la.ip_usuario,
    la.detalhes_adicionais,
    COUNT(*) OVER() as total_count
  FROM public.logs_atividades la
  WHERE 
    (_usuario_id IS NULL OR la.usuario_id = _usuario_id) AND
    (_tipo_acao IS NULL OR la.tipo_acao = _tipo_acao) AND
    (_modulo IS NULL OR la.modulo ILIKE '%' || _modulo || '%') AND
    (_data_inicio IS NULL OR la.data_hora >= _data_inicio) AND
    (_data_fim IS NULL OR la.data_hora <= _data_fim)
  ORDER BY la.data_hora DESC
  LIMIT _limite
  OFFSET _offset;
END;
$function$;

-- 10. Função has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.ativo = true
  )
$function$;

-- 11. Função has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module app_module, _permission app_permission)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND ur.ativo = true
      AND rp.module = _module
      AND (rp.permission = _permission OR rp.permission = 'manage')
      AND rp.ativo = true
  )
$function$;

-- 12. Função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  
  -- Atribuir role padrão (suporte) para novos usuários
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'suporte');
  
  RETURN NEW;
END;
$function$;

-- 13. Função update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
