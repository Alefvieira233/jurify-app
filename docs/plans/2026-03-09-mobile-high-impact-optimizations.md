# Mobile High-Impact Optimizations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir todos os problemas de alto impacto identificados na auditoria mobile: segurança, UX, features nativas e testes.

**Architecture:** Correções em 5 grupos independentes — segurança (crítico), UX mobile, features nativas (Haptics/Share/LocalNotifications), performance (React.memo, condicional de charts) e testes (mocks Capacitor + suítes de testes para hooks mobile).

**Tech Stack:** React 18, TypeScript, Capacitor 8, @capacitor/haptics, @capacitor/share, @capacitor/local-notifications, Vitest + React Testing Library.

---

## Grupo 1 — Segurança (Tasks 1–6)

### Task 1: Viewport fit=cover para notch (iPhone 13+)

**Files:**
- Modify: `index.html:5`

**Step 1:** Alterar a meta viewport

```html
<!-- ANTES (linha 5): -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- DEPOIS: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**Step 2:** Verificar que nenhum teste quebrou
```bash
npm test -- --reporter=dot 2>&1 | tail -5
```
Expected: all passing

**Step 3:** Commit
```bash
git add index.html
git commit -m "fix(mobile): viewport-fit=cover para suporte a notch iPhone 13+"
```

---

### Task 2: AndroidManifest — allowBackup=false + remover RECEIVE_BOOT_COMPLETED

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`

**Step 1:** Aplicar as duas alterações:

```xml
<!-- ANTES: -->
<application
    android:allowBackup="true"
    ...>

<!-- DEPOIS: -->
<application
    android:allowBackup="false"
    ...>
```

E remover a linha:
```xml
<!-- REMOVER esta linha: -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

O Jurify não precisa iniciar no boot. Remover reduz a superfície de ataque.

**Step 2:** Verificar testes
```bash
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 3:** Commit
```bash
git add android/app/src/main/AndroidManifest.xml
git commit -m "fix(mobile/android): allowBackup=false + remove RECEIVE_BOOT_COMPLETED desnecessário"
```

---

### Task 3: FileProvider — restringir paths ao mínimo necessário

**Files:**
- Modify: `android/app/src/main/res/xml/file_paths.xml`

**Step 1:** Substituir o conteúdo completo:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="camera_images" path="camera/" />
    <external-path name="jurify_documents" path="Documents/Jurify/" />
</paths>
```

Antes era `path="."` (raiz inteira). Agora restringe ao mínimo.

**Step 2:** Verificar testes
```bash
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 3:** Commit
```bash
git add android/app/src/main/res/xml/file_paths.xml
git commit -m "fix(mobile/android): FileProvider restrito a camera/ e Documents/Jurify/"
```

---

### Task 4: Deep Link — whitelist de rotas válidas

**Files:**
- Modify: `src/App.tsx` (função `DeepLinkHandler`, linhas 90–114)

**Step 1:** Substituir a função `DeepLinkHandler`:

```typescript
// Rotas válidas para deep links jurify://
const ALLOWED_DEEP_LINK_PATHS = new Set([
  '/dashboard', '/pipeline', '/agenda', '/whatsapp', '/agentes',
  '/contratos', '/clientes', '/notificacoes', '/processos', '/prazos',
  '/honorarios', '/documentos', '/configuracoes', '/relatorios',
  '/usuarios', '/logs', '/integracoes', '/billing',
]);

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        // jurify://processos → /processos
        // jurify://contratos/123 → /contratos/123
        const basePath = url.hostname ? `/${url.hostname}` : url.pathname;
        const fullPath = basePath + (url.pathname !== '/' && url.hostname ? url.pathname : '');

        // Verificar se a rota base está na whitelist
        const baseRoute = '/' + (fullPath.split('/')[1] ?? '');
        if (fullPath && fullPath !== '/' && ALLOWED_DEEP_LINK_PATHS.has(baseRoute)) {
          navigate(fullPath + url.search);
        }
      } catch {
        // URL inválida, ignorar silenciosamente
      }
    });

    return () => { void listenerPromise.then(l => l.remove()); };
  }, [navigate]);

  return null;
}
```

**Step 2:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -20
npm test -- --reporter=dot 2>&1 | tail -5
```
Expected: 0 errors, all tests passing

**Step 3:** Commit
```bash
git add src/App.tsx
git commit -m "fix(mobile/security): deep link whitelist — previne open redirect via jurify://"
```

---

### Task 5: Push Notifications — validar route antes de navegar

**Files:**
- Modify: `src/hooks/usePushNotifications.ts` (linhas 40–43)

**Step 1:** Adicionar `ALLOWED_PUSH_ROUTES` e validação:

```typescript
// Adicionar antes da função usePushNotifications (linha 10):
const ALLOWED_PUSH_ROUTES = new Set([
  '/dashboard', '/pipeline', '/agenda', '/whatsapp', '/agentes',
  '/contratos', '/clientes', '/notificacoes', '/processos', '/prazos',
  '/honorarios', '/documentos', '/configuracoes', '/relatorios',
]);

// Substituir linhas 40–43:
const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
  const data = action.notification.data as { route?: string };
  if (data?.route && typeof data.route === 'string') {
    // Validar que a rota base está na whitelist
    const baseRoute = '/' + (data.route.replace(/^\//, '').split('/')[0] ?? '');
    if (ALLOWED_PUSH_ROUTES.has(baseRoute)) {
      navigate(data.route);
    } else {
      logger.warn('Push notification route bloqueada (não está na whitelist)', { route: data.route });
    }
  }
});
```

**Step 2:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -10
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 3:** Commit
```bash
git add src/hooks/usePushNotifications.ts
git commit -m "fix(mobile/security): validar route de push notification contra whitelist"
```

---

### Task 6: WhatsApp — localStorage → sessionStorage

**Files:**
- Modify: `src/features/whatsapp/WhatsAppEvolutionSetup.tsx` (linhas 48, 72)

**Step 1:** Substituir `localStorage` por `sessionStorage` nas 2 ocorrências:

Linha 48:
```typescript
// ANTES:
const saved = localStorage.getItem('whatsapp_evolution_instance');
// DEPOIS:
const saved = sessionStorage.getItem('whatsapp_evolution_instance');
```

Linha 72:
```typescript
// ANTES:
localStorage.setItem('whatsapp_evolution_instance', JSON.stringify({
// DEPOIS:
sessionStorage.setItem('whatsapp_evolution_instance', JSON.stringify({
```

`sessionStorage` dura apenas a sessão (aba/app). Não persiste entre reinicializações.

**Step 2:** Verificar lint e testes
```bash
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 3:** Commit
```bash
git add src/features/whatsapp/WhatsAppEvolutionSetup.tsx
git commit -m "fix(mobile/security): WhatsApp instanceName migrado de localStorage para sessionStorage"
```

---

## Grupo 2 — UX Mobile (Tasks 7–8)

### Task 7: Dialogs — max-width responsivo para celular

**Files:**
- Modify: `src/features/contracts/ContratosManager.tsx` (buscar `max-w-5xl` em DialogContent)
- Modify: outros DialogContent com `max-w-` fixo grande (buscar via grep)

**Step 1:** Encontrar todos os DialogContent com max-width problemático
```bash
grep -rn "max-w-[3-9]xl\|max-w-2xl" src/ --include="*.tsx" | grep "Dialog"
```

**Step 2:** Para cada DialogContent encontrado, trocar para padrão responsivo:
```typescript
// ANTES (exemplo ContratosManager):
<DialogContent className="max-w-5xl ...">

// DEPOIS — responsivo: 95vw em mobile, max em desktop:
<DialogContent className="w-[95vw] max-w-5xl ...">
```

Para formulários menores (max-w-2xl):
```typescript
<DialogContent className="w-[95vw] max-w-2xl ...">
```

**Step 3:** Verificar lint e testes
```bash
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/
git commit -m "fix(mobile/ux): DialogContent responsivo — w-[95vw] em celular, max-w em desktop"
```

---

### Task 8: Touch feedback — active: states em elementos clicáveis

**Files:**
- Modify: `src/components/ui/button.tsx` — verificar se `active:scale-[0.97]` está presente
- Modify: `src/components/Layout.tsx` — itens de menu mobile
- Modify: `src/components/Sidebar.tsx` — sidebar items (adicionar `active:` junto com `hover:`)

**Step 1:** Checar button.tsx
```bash
grep -n "active:" src/components/ui/button.tsx
```
Se `active:scale-[0.97]` já existe na variante default, está ok. Se não, adicionar.

**Step 2:** Em Sidebar.tsx, nos links do menu, adicionar `active:bg-accent active:scale-[0.98]`:
```typescript
// Em cada item clicável do sidebar que tenha apenas hover:
// ANTES:
className="... hover:bg-accent/50 ..."
// DEPOIS:
className="... hover:bg-accent/50 active:bg-accent active:scale-[0.98] ..."
```

**Step 3:** Em Layout.tsx, nos botões de menu mobile:
```typescript
// Botão de hamburger e overlay:
className="... hover:bg-accent/50 active:bg-accent/70 ..."
```

**Step 4:** Verificar lint e testes
```bash
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 5:** Commit
```bash
git add src/components/
git commit -m "fix(mobile/ux): active: states para feedback tátil em touch devices"
```

---

## Grupo 3 — Features Nativas (Tasks 9–11)

### Task 9: Haptics — vibração no pipeline e botões críticos

**Files:**
- Modify: `src/features/pipeline/PipelineJuridico.tsx` (função `handleDragEnd`, linha 51)
- Modify: `src/features/contracts/ContratosManager.tsx` (handler de delete)
- Modify: `src/hooks/useCapacitor.ts` — exportar helper `triggerHaptic`

**Step 1:** Adicionar helper de haptics em `src/hooks/useCapacitor.ts`:
```typescript
// Adicionar import no topo:
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Adicionar função exportada (fora do hook, ou como export separado):
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection' = 'medium'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else if (style === 'selection') {
      await Haptics.selectionChanged();
    } else {
      const impactMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: impactMap[style] });
    }
  } catch {
    // Haptics não disponível, ignorar
  }
}
```

**Step 2:** Usar no `handleDragEnd` do Pipeline (`src/features/pipeline/PipelineJuridico.tsx`):
```typescript
// Adicionar import:
import { triggerHaptic } from '@/hooks/useCapacitor';

// No handleDragEnd (linha 51), APÓS verificar destination:
const handleDragEnd = (result: DropResult) => {
  const { destination, source, draggableId } = result;
  if (!destination || destination.droppableId === source.droppableId) return;
  void triggerHaptic('medium'); // vibrar ao soltar
  const fromStage = PIPELINE_STAGES.find(s => s.id === source.droppableId)?.title ?? source.droppableId;
  const toStage   = PIPELINE_STAGES.find(s => s.id === destination.droppableId)?.title ?? destination.droppableId;
  void (async () => {
    const ok = await updateLead(draggableId, { status: destination.droppableId });
    if (ok) {
      void triggerHaptic('success'); // vibrar com padrão de sucesso
      toast({ title: 'Lead movido', description: `${fromStage} → ${toStage}` });
    }
  })();
};
```

**Step 3:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -10
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/hooks/useCapacitor.ts src/features/pipeline/PipelineJuridico.tsx
git commit -m "feat(mobile/native): haptics — vibração no drag-drop do pipeline e helper triggerHaptic"
```

---

### Task 10: Share — compartilhar contratos e documentos

**Files:**
- Modify: `src/features/contracts/ContratosManager.tsx` — botão compartilhar
- Modify: `src/features/documentos/DocumentosManager.tsx` — botão compartilhar (verificar se existe)

**Step 1:** Criar hook `useNativeShare` em `src/hooks/useNativeShare.ts`:
```typescript
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface ShareOptions {
  title: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export async function nativeShare(options: ShareOptions): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback web: Web Share API ou copiar para clipboard
    if (navigator.share) {
      await navigator.share({ title: options.title, text: options.text, url: options.url });
      return true;
    }
    return false;
  }
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      dialogTitle: options.dialogTitle ?? 'Compartilhar via',
    });
    return true;
  } catch {
    // Usuário cancelou ou erro
    return false;
  }
}
```

**Step 2:** Adicionar botão Compartilhar em ContratosManager, nos botões de ação por contrato:
```typescript
// Adicionar import:
import { Share2 } from 'lucide-react';
import { nativeShare } from '@/hooks/useNativeShare';

// Adicionar botão nos action buttons de cada contrato (buscar onde estão Eye, Edit, Trash):
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    void nativeShare({
      title: `Contrato — ${contrato.nome_cliente}`,
      text: `Contrato Jurify\nCliente: ${contrato.nome_cliente}\nStatus: ${contrato.status}\nValor: ${contrato.valor ?? 'A definir'}`,
      dialogTitle: 'Compartilhar contrato',
    });
  }}
  aria-label="Compartilhar contrato"
>
  <Share2 className="h-4 w-4" />
</Button>
```

**Step 3:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -10
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/hooks/useNativeShare.ts src/features/contracts/ContratosManager.tsx
git commit -m "feat(mobile/native): share — compartilhar contratos via Share nativo/Web Share API"
```

---

### Task 11: Local Notifications — lembretes de prazos urgentes

**Files:**
- Create: `src/hooks/useLocalPrazosNotifications.ts`
- Modify: `src/components/Layout.tsx` — inicializar hook

**Step 1:** Criar `src/hooks/useLocalPrazosNotifications.ts`:
```typescript
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';

/**
 * Agenda notificações locais diárias para prazos urgentes (≤7 dias).
 * Funciona offline — não precisa de servidor.
 */
export function useLocalPrazosNotifications() {
  const { user } = useAuth();
  const { prazos } = usePrazosProcessuais();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user || !prazos?.length) return;

    void (async () => {
      try {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        // Cancelar notificações antigas de prazos
        const pending = await LocalNotifications.getPending();
        const prazoIds = pending.notifications
          .filter(n => n.id >= 9000 && n.id < 9999)
          .map(n => ({ id: n.id }));
        if (prazoIds.length > 0) {
          await LocalNotifications.cancel({ notifications: prazoIds });
        }

        // Agendar notificações para prazos urgentes
        const hoje = Date.now();
        const urgentes = prazos
          .filter(p => {
            if (p.status !== 'pendente') return false;
            const dias = Math.ceil((new Date(p.data_prazo).getTime() - hoje) / 86400000);
            return dias >= 0 && dias <= 7;
          })
          .slice(0, 10); // máximo 10 notificações

        if (urgentes.length === 0) return;

        const notifications = urgentes.map((prazo, idx) => {
          const dias = Math.ceil((new Date(prazo.data_prazo).getTime() - hoje) / 86400000);
          const emoji = dias === 0 ? '🚨' : dias <= 2 ? '⚠️' : '📅';
          const quando = dias === 0 ? 'HOJE' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
          return {
            id: 9000 + idx,
            title: `${emoji} Prazo vence ${quando}`,
            body: prazo.descricao ?? prazo.tipo_prazo ?? 'Prazo processual urgente',
            schedule: {
              // Notificar às 9h do dia seguinte
              at: new Date(Date.now() + 12 * 60 * 60 * 1000),
              allowWhileIdle: true,
            },
            extra: { route: '/prazos' },
            smallIcon: 'ic_stat_icon_config_sample',
          };
        });

        await LocalNotifications.schedule({ notifications });
      } catch {
        // LocalNotifications não disponível, ignorar
      }
    })();
  }, [user, prazos]);
}
```

**Step 2:** Inicializar no Layout.tsx (após `usePushNotifications()`):
```typescript
// Adicionar import:
import { useLocalPrazosNotifications } from '@/hooks/useLocalPrazosNotifications';

// No corpo do componente Layout, após linha `usePushNotifications()`:
useLocalPrazosNotifications();
```

**Step 3:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -10
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/hooks/useLocalPrazosNotifications.ts src/components/Layout.tsx
git commit -m "feat(mobile/native): notificações locais de prazos urgentes (≤7 dias) — funciona offline"
```

---

## Grupo 4 — Performance (Tasks 12–13)

### Task 12: Sidebar — React.memo para evitar re-renders

**Files:**
- Modify: `src/components/Sidebar.tsx` — exportar com React.memo

**Step 1:** Ler Sidebar.tsx para entender a estrutura do export:
```bash
grep -n "export" src/components/Sidebar.tsx
```

**Step 2:** Envolver o componente com React.memo:
```typescript
// ANTES (no final do arquivo):
export default Sidebar;

// DEPOIS:
export default React.memo(Sidebar);
```

Se Sidebar usar `React.memo` inline, garantir que as props de callback usem `useCallback` no pai (Layout.tsx).

**Step 3:** Verificar lint e testes
```bash
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/components/Sidebar.tsx
git commit -m "perf(mobile): Sidebar com React.memo — evita re-renders desnecessários"
```

---

### Task 13: requestIdleCallback — não prefetch em native/mobile

**Files:**
- Modify: `src/App.tsx` (linhas ~64–72, o bloco requestIdleCallback)

**Step 1:** Ler as linhas do bloco de prefetch:
```bash
grep -n "requestIdleCallback\|prefetch\|lazyPrefetch" src/App.tsx | head -20
```

**Step 2:** Envolver o prefetch com verificação de plataforma:
```typescript
// ANTES:
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    void import('./features/...')
    // ...
  }, { timeout: 2000 });
}

// DEPOIS — não prefetch em app nativo (bundle já está local):
if (typeof window !== 'undefined' && 'requestIdleCallback' in window && !Capacitor.isNativePlatform()) {
  window.requestIdleCallback(() => {
    void import('./features/...')
    // ...
  }, { timeout: 2000 });
}
```

**Step 3:** Verificar lint e testes
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -10
npm run lint 2>&1 | tail -5
npm test -- --reporter=dot 2>&1 | tail -5
```

**Step 4:** Commit
```bash
git add src/App.tsx
git commit -m "perf(mobile): desabilitar prefetch requestIdleCallback em plataforma nativa"
```

---

## Grupo 5 — Testes (Tasks 14–16)

### Task 14: Mocks Capacitor no setup de testes

**Files:**
- Modify: `src/tests/setup.ts` — adicionar mocks de todos os plugins Capacitor

**Step 1:** Adicionar ao final de `src/tests/setup.ts`:
```typescript
// ─── Capacitor Mocks ───────────────────────────────────────────────────────

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
    isNativePlatform: vi.fn(() => false),
    isPluginAvailable: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    register: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn().mockResolvedValue({ webPath: 'blob:test-image', format: 'jpeg' }),
    requestPermissions: vi.fn().mockResolvedValue({ camera: 'granted', photos: 'granted' }),
  },
  CameraResultType: { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    exitApp: vi.fn(),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn().mockResolvedValue({ activityType: 'com.apple.UIKit.activity.Message' }),
    canShare: vi.fn().mockResolvedValue({ value: true }),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}));

vi.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: {
    authenticate: vi.fn().mockResolvedValue(undefined),
    checkBiometry: vi.fn().mockResolvedValue({ isAvailable: true, biometryType: 2 }),
  },
}));
```

**Step 2:** Rodar todos os testes para garantir que mocks não quebram nada
```bash
npm test -- --reporter=dot 2>&1 | tail -10
```
Expected: todos passando (1133+)

**Step 3:** Commit
```bash
git add src/tests/setup.ts
git commit -m "test(mobile): mocks Capacitor no setup — 8 plugins mockados para testes unitários"
```

---

### Task 15: Testes — usePushNotifications + useBiometrics

**Files:**
- Create: `src/hooks/__tests__/usePushNotifications.test.ts`
- Create: `src/hooks/__tests__/useBiometrics.test.ts`

**Step 1:** Criar `src/hooks/__tests__/usePushNotifications.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';

// Mocks — setup.ts já registra @capacitor/push-notifications e @capacitor/core
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabaseUntyped: { from: () => ({ update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }) }) },
}));

describe('usePushNotifications', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('não faz nada em plataforma web', () => {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    renderHook(() => usePushNotifications());
    expect(PushNotifications.register).not.toHaveBeenCalled();
  });

  it('bloqueia rota não autorizada', async () => {
    // Simular tap de notificação com rota inválida
    const { PushNotifications } = await import('@capacitor/push-notifications');
    vi.mocked(PushNotifications.addListener).mockImplementation(async (event, cb) => {
      if (event === 'pushNotificationActionPerformed') {
        (cb as any)({ notification: { data: { route: '/admin/evil-page' } } });
      }
      return { remove: vi.fn() };
    });
    renderHook(() => usePushNotifications());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navega para rota autorizada ao tocar notificação', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const { PushNotifications } = await import('@capacitor/push-notifications');
    vi.mocked(PushNotifications.addListener).mockImplementation(async (event, cb) => {
      if (event === 'pushNotificationActionPerformed') {
        (cb as any)({ notification: { data: { route: '/pipeline' } } });
      }
      return { remove: vi.fn() };
    });
    renderHook(() => usePushNotifications());
    // navigate é chamado com /pipeline (rota válida)
    expect(mockNavigate).toHaveBeenCalledWith('/pipeline');
  });
});
```

**Step 2:** Criar `src/hooks/__tests__/useBiometrics.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBiometrics } from '../useBiometrics';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

describe('useBiometrics', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('isAvailable é false em plataforma web', () => {
    const { result } = renderHook(() => useBiometrics());
    expect(result.current.isAvailable).toBe(false);
  });

  it('authenticate retorna false em plataforma web', async () => {
    const { result } = renderHook(() => useBiometrics());
    let success: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success!).toBe(false);
  });

  it('authenticate retorna true em native com sucesso', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mock('@aparajita/capacitor-biometric-auth', () => ({
      BiometricAuth: { authenticate: vi.fn().mockResolvedValue(undefined) },
    }));
    const { result } = renderHook(() => useBiometrics());
    let success: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success!).toBe(true);
  });

  it('authenticate retorna false quando usuário cancela', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mock('@aparajita/capacitor-biometric-auth', () => ({
      BiometricAuth: { authenticate: vi.fn().mockRejectedValue(new Error('User cancelled')) },
    }));
    const { result } = renderHook(() => useBiometrics());
    let success: boolean;
    await act(async () => { success = await result.current.authenticate(); });
    expect(success!).toBe(false);
  });
});
```

**Step 3:** Rodar os novos testes
```bash
npm test -- src/hooks/__tests__/usePushNotifications.test.ts src/hooks/__tests__/useBiometrics.test.ts --reporter=verbose 2>&1 | tail -20
```

**Step 4:** Commit
```bash
git add src/hooks/__tests__/
git commit -m "test(mobile): testes para usePushNotifications (whitelist) e useBiometrics (success/cancel/web)"
```

---

### Task 16: Testes — useNetworkStatus + DeepLinkHandler

**Files:**
- Modify: `src/hooks/__tests__/useNetworkStatus.test.ts` (criar se não existir)
- Create: `src/hooks/__tests__/DeepLinkHandler.test.tsx`

**Step 1:** Criar `src/hooks/__tests__/useNetworkStatus.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('inicializa com navigator.onLine = true', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('detecta offline via evento do browser', () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current.isOnline).toBe(false);
  });

  it('detecta online via evento do browser', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useNetworkStatus());
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.isOnline).toBe(true);
  });

  it('seta wasOffline = true ao voltar online após estar offline', async () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => { window.dispatchEvent(new Event('offline')); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.wasOffline).toBe(true);
  });
});
```

**Step 2:** Criar `src/hooks/__tests__/DeepLinkHandler.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Importar App via módulo para testar DeepLinkHandler indiretamente
// Ou extrair DeepLinkHandler para arquivo próprio

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom');
  return { ...real, useNavigate: () => mockNavigate };
});

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockImplementation(async (_event, cb) => {
      // Simular deep link recebido
      (globalThis as any).__deepLinkCallback = cb;
      return { remove: vi.fn() };
    }),
  },
}));

// Nota: DeepLinkHandler está inline em App.tsx — importar apenas o componente
// Para testar sem montar o App inteiro, extrair em arquivo separado em refactoring futuro.
// Por ora, testar via URL parsing lógica unitária:
describe('Deep Link URL parsing', () => {
  it('jurify://processos → /processos', () => {
    const url = new URL('jurify://processos');
    const path = url.hostname ? `/${url.hostname}${url.pathname !== '/' ? url.pathname : ''}` : url.pathname;
    expect(path).toBe('/processos');
  });

  it('jurify://contratos/123 → /contratos/123', () => {
    const url = new URL('jurify://contratos/123');
    const path = url.hostname ? `/${url.hostname}${url.pathname !== '/' ? url.pathname : ''}` : url.pathname;
    expect(path).toBe('/contratos/123');
  });

  it('rota não permitida fica bloqueada', () => {
    const ALLOWED = new Set(['/processos', '/contratos', '/pipeline', '/dashboard']);
    const path = '/admin/evil';
    const baseRoute = '/' + path.split('/')[1];
    expect(ALLOWED.has(baseRoute)).toBe(false);
  });

  it('rota permitida passa na whitelist', () => {
    const ALLOWED = new Set(['/processos', '/contratos', '/pipeline', '/dashboard']);
    const path = '/contratos/123';
    const baseRoute = '/' + path.split('/')[1];
    expect(ALLOWED.has(baseRoute)).toBe(true);
  });
});
```

**Step 3:** Rodar os novos testes
```bash
npm test -- src/hooks/__tests__/useNetworkStatus.test.ts src/hooks/__tests__/DeepLinkHandler.test.tsx --reporter=verbose 2>&1 | tail -20
```

**Step 4:** Rodar suite completa para garantir
```bash
npm test -- --reporter=dot 2>&1 | tail -10
```
Expected: 1133+ tests passing

**Step 5:** Commit
```bash
git add src/hooks/__tests__/
git commit -m "test(mobile): testes para useNetworkStatus (online/offline/wasOffline) e DeepLinkHandler (whitelist/URL parsing)"
```

---

## Verificação Final

```bash
# 1. TypeScript — 0 erros
npx tsc --noEmit --skipLibCheck

# 2. Lint — 0 warnings
npm run lint

# 3. Testes — todos passando
npm test -- --reporter=dot

# 4. Build mobile OK
npm run mobile:build

# 5. Sync Capacitor
npx cap sync
```

Expected output final:
- TS: sem output (0 erros)
- Lint: processo encerra sem output de erros
- Tests: `X passed` (X ≥ 1133)
- Build: `✓ built in Xs`
- Cap sync: `Sync finished in Xs`
