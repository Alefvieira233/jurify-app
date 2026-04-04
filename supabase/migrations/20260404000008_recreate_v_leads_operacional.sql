-- Recreate v_leads_operacional view after dropping leads.score column (CASCADE)
-- Original definition from 20260321000001_crm_consolidation.sql

CREATE OR REPLACE VIEW public.v_leads_operacional AS
SELECT
  l.*,
  d.nome        AS departamento_nome,
  d.cor         AS departamento_cor,
  p.nome_completo AS responsavel_nome,
  p.email       AS responsavel_email,
  p.avatar_url  AS responsavel_avatar,
  c.nome        AS conexao_nome,
  c.telefone    AS conexao_telefone,
  ps.name       AS pipeline_stage_name,
  ps.color      AS pipeline_stage_color
FROM public.leads l
LEFT JOIN public.departamentos d ON d.id = l.departamento_id
LEFT JOIN public.profiles p ON p.id = l.responsavel_id
LEFT JOIN public.conexoes_whatsapp c ON c.id = l.conexao_id
LEFT JOIN public.crm_pipeline_stages ps ON ps.id = l.pipeline_stage_id;
