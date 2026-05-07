# Análise de impacto histórico — bugs de agendamento WhatsApp

> **Data da análise:** 2026-05-07
> **Janela coberta:** 2026-03-16 → 2026-04-11 (todo o histórico de WhatsApp em prod)
> **Bugs analisados:** os 3 bugs em cascata corrigidos hoje (titulo NOT NULL, enum cast em notify_lead_status_change, criador_id em fn_agendamento_auto_tarefa)

---

## TL;DR

**Pelo menos 4 leads expressaram intenção de agendamento via WhatsApp e ZERO agendamentos foram criados.** A IA respondeu "Tive um problema técnico ao registrar seu agendamento. Nossa equipe já foi notificada" mas:
- O erro era engolido pelo catch genérico do webhook (não persistia em log estruturado)
- Não havia notificação real à equipe (`notificacoes` insert nunca rodava por causa da cascata de triggers)
- O lead recebia a mensagem genérica e desaparecia

Volume baixo (~9 mensagens com intent identificadas) reflete também que o WhatsApp esteve **silencioso desde 2026-04-11** (memória 2026-04-23: "Kapso WhatsApp silencioso desde 04-11").

---

## Casos identificados

### Tenant "Alef Gomes" (`3afe2095-4f52-4526-8bc4-ba1fc48bbfa9`)

| Lead | Telefone | Quando | Mensagem |
|------|----------|--------|----------|
| Eng.Alef Vieira | 559681419460 | 2026-04-11 16:00 | "Perfeito, gostaria de agendar para o Dia 15 com o Dr Rafael. por favor" |
| Eng.Alef Vieira | 559681419460 | 2026-04-11 15:59 | "Do que você precisa para agendar esse atendimento, quais documentos precisa?" |
| Eng.Alef Vieira | 559681419460 | 2026-04-09 20:08 | "Você pode marcar um novo horario para a Sexta as 14 e cancelar essa de quinta, por favor." |
| Eng.Alef Vieira | 559681419460 | 2026-04-09 02:42 | "pode continuar me atendendo? quero marcar uma call com a advogad..." |
| Unknown | 559684309709 | 2026-04-08 18:44 | "To em outra reunião, não consigo ouvir" (intent ambíguo) |

### Tenant "Jurify Default" (`885eb31d-4b3c-4704-b3de-f62e40c3c378`)

Os 4 casos deste tenant parecem ser **dados seed/teste** (mensagens com IDs grupais "@93613644112077", referências a "captação interna", grupos de João Pessoa). Não são clientes reais perdidos.

| Lead | Quando | Mensagem | Avaliação |
|------|--------|----------|-----------|
| Caroline Oliveira | 2026-03-16 17:41 | "Reunião modificada para 17:30" | seed |
| Caroline Oliveira | 2026-03-16 13:56 | "Reunião às 17:00 :)" | seed |
| Caroline Oliveira | 2026-03-16 13:53 | "Pessoal de João Pessoa, vai agendar reunião on-line..." | seed |
| Jonathan Queiroz | 2026-03-16 13:53 | "Temos entrega essa semana? Vamos agendar nossa captação?" | seed |

---

## Caso real, verificável

O lead **Eng.Alef Vieira** (`b9e1c93b-52ce-4142-a356-792d25ab524d`, telefone 559681419460) é o próprio owner testando o produto. As 4 mensagens dele em 2026-04-09 a 2026-04-11 são o smoking gun: ele pediu agendamento 4 vezes, recebeu "Tive um problema técnico" 4 vezes, e o feature parecia "ter problema esporádico" quando na verdade NUNCA funcionou em produção.

Este é também o caso que motivou as sessões de remediação anteriores (memória 2026-04-08 "WhatsApp/Kapso FUNCIONAL" — pipeline funcionou para texto inbound mas o agendamento NÃO).

---

## Após o fix (estado pós 2026-05-07)

- ✅ `agendamentos.titulo` é gerado automaticamente pela RPC `try_acquire_schedule_slot`
- ✅ `notify_lead_status_change` tem cast `::public.notification_type`
- ✅ `fn_agendamento_auto_tarefa` usa fallback admin/manager em vez de `lead_id`
- ✅ Smoke test fim-a-fim em prod confirmou agendamento OK + idempotência OK
- ✅ Defense-in-depth UNIQUE em `(tenant_id, lead_id, minute_bucket)` para `agendamentos`
- ✅ `agent-tools-executor.tool_schedule_meeting` agora usa RPC racing-safe (antes fazia INSERT direto, mesmo bug)

---

## Recomendação para o owner

1. **Followup manual ao próprio lead Alef Vieira** (se ainda relevante) — embora seja o mesmo número, vale validar UX manualmente ao reabrir o WhatsApp.
2. **Ativar Kapso webhook** (silencioso desde 2026-04-11 — depende do owner reabrir a conexão no app.kapso.ai).
3. **Monitorar `agendamentos` por origem nas próximas 7 dias** — dashboard simples mostrando count por dia + filtro `observacoes ILIKE '%WhatsApp%'`. Se voltar a haver intent de agendamento e zero agendamentos criados, é regressão.

---

## Limitações desta análise

- **Falsos negativos:** o regex de intent (`agendar|marcar|consulta|reunião`) é heurístico. Há casos onde o lead pediu agendamento implicitamente (ex.: "estou disponível amanhã às 14h") sem usar essas palavras.
- **Falsos positivos no tenant "Jurify Default":** as mensagens parecem dados seed/teste, não eventos reais.
- **Webhook events não logam erros do agendamento:** o catch genérico engolia o erro sem persistir, então não há trail de auditoria além das próprias mensagens.

---

**Data de geração:** 2026-05-07 (sessão de remediação P0+P1).
