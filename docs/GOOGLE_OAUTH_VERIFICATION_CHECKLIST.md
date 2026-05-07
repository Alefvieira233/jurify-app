# Google OAuth Verification — Checklist de submissão

> **Status:** Pré-submissão (preparado em 2026-05-07).
> **Owner:** Alef Vieira (alefchristiangomesvieira@gmail.com)
> **Submission target:** Google Cloud Console — OAuth consent screen → Submit for verification

A verificação Google OAuth é necessária quando o app solicita escopos sensíveis ou restritos. Sem ela, a tela de consentimento mostra warning "App not verified" e há limite de **100 tokens vivos por OAuth client**. Tempo de verificação: 4–8 semanas.

---

## 1. Escopos solicitados pelo Jurify

| Escopo | Tipo Google | Justificativa de uso |
|--------|-------------|----------------------|
| `https://www.googleapis.com/auth/calendar.events` | **Sensitive** | Criar e atualizar agendamentos do escritório no calendário do advogado. Cada reunião agendada via WhatsApp gera evento Calendar com link Meet. |
| `https://www.googleapis.com/auth/userinfo.email` | Não-sensitive | Identificar a conta Google conectada ao perfil do advogado. |
| `https://www.googleapis.com/auth/userinfo.profile` | Não-sensitive | Mostrar nome/foto do advogado conectado na UI de Configurações → Integrações. |
| `openid` | Padrão | Padrão OpenID Connect. |

**Sem escopos restritos.** `calendar.events` é sensitive (não restricted), o que é a categoria mais leve para verificação.

> Antes da auditoria 2026-04-10 era usado `calendar` (full read/write). Foi reduzido para `calendar.events` (apenas eventos próprios criados pelo app), que é o escopo mínimo necessário e simplifica verificação.

---

## 2. Pré-requisitos antes de submeter

### 2.1 OAuth consent screen — campos obrigatórios

Google Cloud Console → APIs & Services → OAuth consent screen → editar:

- [ ] **App name:** Jurify
- [ ] **User support email:** suporte@jurify.app (criar se não existir) ou alefchristiangomesvieira@gmail.com
- [ ] **App logo:** PNG/JPG ≥ 120x120, ≤ 1MB. Logo Jurify dourado/azul-noturno em fundo claro.
- [ ] **Application home page:** `https://jurify.app` (precisa estar ONLINE quando submeter)
- [ ] **Application privacy policy link:** `https://jurify.app/privacidade` (page já existe — `/privacidade`)
- [ ] **Application terms of service link:** `https://jurify.app/termos` (page já existe — `/termos`)
- [ ] **Authorized domains:** `jurify.app` (apenas; remover quaisquer "localhost"/"vercel.app" preview)
- [ ] **Developer contact:** alefchristiangomesvieira@gmail.com
- [ ] **App type:** External (necessário para usuários fora da org Google)

### 2.2 Configuração do OAuth Client

- [ ] **Authorized JavaScript origins:** `https://jurify.app`
- [ ] **Authorized redirect URIs:** `https://jurify.app/auth/google/callback`

> Remover qualquer URI `localhost` antes de submeter — Google rejeita verification se houver localhost listado.

### 2.3 Domain verification (Search Console)

- [ ] Verificar `jurify.app` em https://search.google.com/search-console
- [ ] Adicionar registro TXT no DNS conforme instruções
- [ ] Confirmar verification em < 24h

### 2.4 Branding

- [ ] Logo final 120x120 anexado
- [ ] Logo de alta resolução para casos onde Google renderiza em telas maiores (recomendado 800x800)
- [ ] Garantir que o logo NÃO é a marca de terceiros (apenas marca própria Jurify)

---

## 3. Demo video (obrigatório para sensitive scopes)

Google exige vídeo demo para qualquer scope sensitive.

- [ ] **Duração:** 1–2 minutos
- [ ] **Formato:** MP4 ≤ 100 MB, hospedar no YouTube (unlisted) e linkar no formulário
- [ ] **Conteúdo obrigatório:**
  1. (~10s) Tela de login do Jurify em `jurify.app`
  2. (~15s) Navegar até Configurações → Integrações → Google Calendar
  3. (~20s) Clicar em "Conectar Google Calendar" → mostrar tela de consent Google → escolher conta → autorizar `calendar.events` + email/profile
  4. (~15s) Voltar pro Jurify, mostrar status "Conectado como dr.fulano@email.com"
  5. (~25s) Criar um agendamento na UI ou simular mensagem WhatsApp → mostrar que evento aparece no Google Calendar do advogado
  6. (~10s) Mostrar opção "Desconectar" funcionando

**Roteiro narrado** (adicionar voz-over PT-BR):
> "Sou advogado e uso o Jurify para gerenciar leads e agendamentos do meu escritório. Conecto minha conta Google Calendar para que reuniões agendadas via WhatsApp pelos meus clientes sejam criadas automaticamente no meu calendário com link do Google Meet. O Jurify usa apenas `calendar.events` para criar e atualizar eventos próprios do app, sem ler eventos pessoais. Posso desconectar a qualquer momento."

---

## 4. Justificativas escritas (formulário Google)

### 4.1 "How will the requested scopes be used?"

> Jurify is a B2B SaaS for Brazilian law firms that automates lead management and consultation scheduling via WhatsApp. When a potential client requests a meeting via WhatsApp, the app creates a Google Calendar event in the lawyer's calendar (with a Google Meet link) and adds the client as an attendee. The `calendar.events` scope is used to create, update, and cancel these meetings only — Jurify does NOT read pre-existing events created outside the app, and only modifies events that Jurify itself created. The `userinfo.email` and `userinfo.profile` scopes identify the connected lawyer to display their name and avatar in the integration settings.

### 4.2 "Why is the requested scope necessary?"

> The `calendar.events` scope (sensitive) is the minimum scope needed to programmatically create and update events. The non-sensitive `calendar.events.public.readonly` doesn't allow writes; the broader `calendar` scope is too permissive (read all events). `calendar.events` is the principle-of-least-privilege match for our use case (write own events, no read of other events).

### 4.3 "Limited Use disclosure" (must match TOS/Privacy)

> Jurify's use and transfer of information received from Google APIs to any other app will adhere to [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements. Specifically: we do not use Google user data for advertising; we do not allow humans to read user data unless (a) we have explicit permission from the user, (b) for security/abuse, (c) to comply with applicable law, or (d) the data is aggregated and used for internal operations.

A página `https://jurify.app/privacidade` deve incluir essa cláusula explicitamente. Verificar se já está em `src/pages/PoliticaDePrivacidade.tsx` — se não, adicionar.

### 4.4 "How will Google user data be used, stored, transferred?"

> - **Used:** Calendar events created/updated when scheduling meetings via Jurify UI or WhatsApp webhook.
> - **Stored:** OAuth tokens (access + refresh) are stored encrypted at-rest using AES-256 (key in Supabase Vault) in the `google_calendar_tokens` table. Plaintext tokens never leave Supabase Edge Functions. Per-user.
> - **Transferred:** Only between Jurify backend (Supabase Edge Functions) and Google APIs. No third parties receive Google user data.
> - **Deleted:** When user clicks "Disconnect" in Settings → Integrations, the OAuth refresh token is revoked via Google's revoke endpoint and the row is deleted from `google_calendar_tokens`.

---

## 5. Implementação atual (verificar antes de submeter)

- [x] **CSRF binding correto** (server-side, single-use state) — implementado em 2026-05-07 (migration `oauth_pending_states`)
- [x] **Tokens encrypted at-rest** (AES-256 via Supabase Vault) — desde audit 2026-04-10
- [x] **Scope reduzido** para `calendar.events` (não `calendar`) — desde audit 2026-04-10
- [x] **Páginas /privacy e /terms** públicas — existem em prod (`/privacidade`, `/termos`)
- [x] **Disconnect endpoint** (revoke token Google + delete DB row) — implementado em `google-calendar/index.ts:disconnect`
- [ ] **HTTPS enforced** em jurify.app — verificar Vercel deployment
- [ ] **Privacy policy** com cláusula Limited Use — verificar texto atual em `PoliticaDePrivacidade.tsx`

---

## 6. Submissão

- [ ] Acessar Google Cloud Console → APIs & Services → OAuth consent screen
- [ ] Clicar em **"Submit for verification"**
- [ ] Anexar/linkar:
  - [ ] Demo video (YouTube unlisted)
  - [ ] Justificativas (§4 acima)
- [ ] Confirmar email do Google em < 24h
- [ ] Esperar 4–8 semanas

Durante o período de espera o app continua funcionando, mas:
- Limite de 100 OAuth tokens vivos
- Tela "App not verified" com warning amarelo

---

## 7. Pós-aprovação

- [ ] Notificar usuários ativos que o aviso "App not verified" sumirá
- [ ] Atualizar `docs/CHANGELOG_PREMIUM_UPGRADE.md` com data de aprovação
- [ ] Aumentar limite de tokens (não há limite após verification, mas pode pedir quota maior se atingir 1M usuários)

---

## 8. Ferramentas externas para preparar

- **YouTube** (vídeo demo) — gravar com Loom/OBS e fazer upload unlisted
- **Search Console** (domain verification) — https://search.google.com/search-console
- **Google Cloud Console** — https://console.cloud.google.com
- **Loom / OBS** para gravar a tela com narração

---

## 9. Riscos conhecidos

| Risco | Mitigação |
|-------|-----------|
| Logo não atende guidelines (resolução, branding) | Usar logo Jurify oficial 800x800 PNG, sem terceiros |
| Demo video não mostra fluxo completo | Seguir roteiro §3 sem cortes; refilmar se Google pedir |
| `calendar` scope (não events) ainda referenciado em algum lugar | `grep -rn "auth/calendar[^.]" supabase/functions/` deve retornar 0 antes de submeter |
| Privacy policy sem cláusula Limited Use | Adicionar bloco específico antes de submeter |

---

**Próxima ação:** preparar logo + gravar vídeo demo (~1h de trabalho).
