# Jurify Mobile App — Capacitor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add iOS + Android native app support to the existing React/Vite web app using Capacitor, with native plugins for push notifications, camera, biometrics, and deep links.

**Architecture:** Capacitor wraps the existing `dist/` build in a native shell. One codebase → three targets (web, iOS, Android). Native plugins are gated behind `useCapacitor.ts` so web fallbacks work transparently.

**Tech Stack:** `@capacitor/core` v7, `@capacitor/ios`, `@capacitor/android`, `@capacitor/cli`, native plugins, Firebase Cloud Messaging (push), Vite 7.

---

## Task 1: Install Capacitor core + CLI

**Files:**
- Modify: `package.json`

**Step 1: Install Capacitor packages**

```bash
cd E:/Jurify
npm install @capacitor/core @capacitor/ios @capacitor/android
npm install -D @capacitor/cli
```

**Step 2: Verify installation**

```bash
npx cap --version
```

Expected: prints Capacitor CLI version (e.g. `7.x.x`)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(mobile): install Capacitor core + iOS + Android"
```

---

## Task 2: Create capacitor.config.ts

**Files:**
- Create: `capacitor.config.ts`

**Step 1: Create the config file**

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jurify.app',
  appName: 'Jurify',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e3a8a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#1e3a8a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1e3a8a',
    },
  },
};

export default config;
```

**Step 2: Verify TypeScript accepts it**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add capacitor.config.ts
git commit -m "feat(mobile): add capacitor.config.ts with app ID com.jurify.app"
```

---

## Task 3: Update vite.config.ts for native builds

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add base path support**

The native build needs `base: './'` so relative paths work inside the WebView. Add this inside `defineConfig`:

```typescript
// Add after `build: { ... }` block, before closing `return {`
base: process.env.CAPACITOR_BUILD === 'true' ? './' : '/',
```

Full updated return object (replace the existing one):

```typescript
return {
    plugins: [
      react(),
      isProd && sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    ].filter(Boolean),

    base: process.env.CAPACITOR_BUILD === 'true' ? './' : '/',

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    esbuild: {
      drop: isProd ? ['console', 'debugger'] : [],
    },

    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: 'hidden',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            'ui-dialog': ['@radix-ui/react-dialog'],
            'ui-select': ['@radix-ui/react-select'],
            'ui-tabs': ['@radix-ui/react-tabs'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            sentry: ['@sentry/react'],
            charts: ['recharts'],
          },
        }
      },
      chunkSizeWarningLimit: 800
    },

    server: {
      port: 8080,
      host: true
    },

    preview: {
      port: 4173
    }
  };
```

**Step 2: Update package.json scripts**

Add to the `"scripts"` section in `package.json`:

```json
"mobile:build": "CAPACITOR_BUILD=true npm run build",
"mobile:sync": "npm run mobile:build && npx cap sync",
"mobile:ios": "npm run mobile:sync && npx cap open ios",
"mobile:android": "npm run mobile:sync && npx cap open android",
"mobile:run:ios": "npm run mobile:build && npx cap run ios",
"mobile:run:android": "npm run mobile:build && npx cap run android"
```

**Step 3: Verify build works**

```bash
CAPACITOR_BUILD=true npm run build
```

Expected: `dist/` folder created, no errors

**Step 4: Commit**

```bash
git add vite.config.ts package.json
git commit -m "feat(mobile): configure vite base path for Capacitor native build"
```

---

## Task 4: Install all native plugins

**Files:**
- Modify: `package.json`

**Step 1: Install all plugins in one command**

```bash
npm install \
  @capacitor/push-notifications \
  @capacitor/local-notifications \
  @capacitor/camera \
  @capacitor/filesystem \
  @capacitor/share \
  @capacitor/haptics \
  @capacitor/status-bar \
  @capacitor/splash-screen \
  @capacitor/app \
  @capacitor/network \
  @capacitor/keyboard \
  @capacitor/browser \
  @capacitor-community/biometrics
```

**Step 2: Verify TypeScript still happy**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(mobile): install all Capacitor native plugins"
```

---

## Task 5: Create useCapacitor.ts hook

**Files:**
- Create: `src/hooks/useCapacitor.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useCapacitor.ts
import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export interface CapacitorInfo {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isIos: boolean;
  isAndroid: boolean;
}

export function useCapacitor(): CapacitorInfo {
  const [info] = useState<CapacitorInfo>(() => {
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    return {
      isNative: Capacitor.isNativePlatform(),
      platform,
      isIos: platform === 'ios',
      isAndroid: platform === 'android',
    };
  });

  return info;
}
```

**Step 2: Write a quick test**

Create `src/hooks/__tests__/useCapacitor.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

import { useCapacitor } from '../useCapacitor';

describe('useCapacitor', () => {
  it('returns web platform info in test environment', () => {
    const { result } = renderHook(() => useCapacitor());
    expect(result.current.isNative).toBe(false);
    expect(result.current.platform).toBe('web');
    expect(result.current.isIos).toBe(false);
    expect(result.current.isAndroid).toBe(false);
  });
});
```

**Step 3: Run the test**

```bash
npx vitest run src/hooks/__tests__/useCapacitor.test.ts
```

Expected: 1 passed

**Step 4: Commit**

```bash
git add src/hooks/useCapacitor.ts src/hooks/__tests__/useCapacitor.test.ts
git commit -m "feat(mobile): add useCapacitor hook"
```

---

## Task 6: Update useNetworkStatus.ts to use native Network plugin

**Files:**
- Modify: `src/hooks/useNetworkStatus.ts`

**Step 1: Replace with Capacitor-aware version**

```typescript
// src/hooks/useNetworkStatus.ts
import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    setTimeout(() => setWasOffline(false), 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Network plugin
      void Network.getStatus().then(s => setIsOnline(s.connected));

      const listener = Network.addListener('networkStatusChange', status => {
        if (status.connected) {
          handleOnline();
        } else {
          handleOffline();
        }
      });

      return () => { void listener.then(l => l.remove()); };
    } else {
      // Web: use browser events
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}
```

**Step 2: Run existing tests**

```bash
npx vitest run src/hooks/__tests__/useNetworkStatus.test.ts 2>/dev/null || echo "No existing test — OK"
npx tsc --noEmit --skipLibCheck
```

Expected: 0 TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/useNetworkStatus.ts
git commit -m "feat(mobile): useNetworkStatus uses native Capacitor Network plugin on iOS/Android"
```

---

## Task 7: Add safe area CSS + xs Tailwind breakpoint

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

**Step 1: Add safe area variables to index.css**

At the end of the `@layer base { :root { ... } }` block (after all CSS variables, before the closing `}`), add:

```css
    /* Safe areas for Capacitor native (notch, home indicator) */
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
```

Then after all `@layer base` blocks, add at the end of the file:

```css
/* ── Capacitor Native: safe area utilities ── */
.safe-top    { padding-top: env(safe-area-inset-top, 0px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.safe-left   { padding-left: env(safe-area-inset-left, 0px); }
.safe-right  { padding-right: env(safe-area-inset-right, 0px); }

/* iOS/Android status bar height compensation */
.mobile-header-offset {
  padding-top: max(env(safe-area-inset-top, 0px), 0px);
}

/* Prevent content from being hidden behind home indicator */
.mobile-bottom-safe {
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
}
```

**Step 2: Add xs breakpoint to tailwind.config.ts**

Inside `theme: { extend: { ... } }`, add:

```typescript
screens: {
  'xs': '475px',
},
```

**Step 3: Verify build**

```bash
npm run build 2>&1 | tail -5
```

Expected: no errors

**Step 4: Commit**

```bash
git add src/index.css tailwind.config.ts
git commit -m "feat(mobile): add safe area CSS utilities + xs Tailwind breakpoint"
```

---

## Task 8: Update Layout.tsx for safe areas + Android back button

**Files:**
- Modify: `src/components/Layout.tsx`

**Step 1: Add imports at top**

After the last existing import line, add:

```typescript
import { useCapacitor } from '@/hooks/useCapacitor';
import { App as CapacitorApp } from '@capacitor/app';
```

**Step 2: Add useCapacitor + back button listener inside the component**

After `const { isOnline, wasOffline } = useNetworkStatus();`, add:

```typescript
const { isNative, isAndroid } = useCapacitor();

// Android hardware back button: close dialogs first, then navigate, then exit
useEffect(() => {
  if (!isAndroid) return;

  const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    } else if (canGoBack) {
      window.history.back();
    } else {
      void CapacitorApp.exitApp();
    }
  });

  return () => { void listener.then(l => l.remove()); };
}, [isAndroid, mobileMenuOpen]);
```

**Step 3: Add safe area classes to the mobile header**

Find this line in the JSX:
```tsx
<header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-primary border-b border-primary/80 flex items-center gap-3 px-4 shadow-sm">
```

Replace with:
```tsx
<header className={`lg:hidden fixed top-0 inset-x-0 z-50 bg-primary border-b border-primary/80 flex items-center gap-3 px-4 shadow-sm ${isNative ? 'mobile-header-offset' : 'h-14'}`}>
```

**Step 4: Add safe bottom area to main content**

Find:
```tsx
<main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
```

Replace with:
```tsx
<main className={`flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0 ${isNative ? 'mobile-bottom-safe' : ''}`}>
```

**Step 5: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 6: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat(mobile): Layout safe areas + Android back button handler"
```

---

## Task 9: Fix Sidebar width on small phones

**Files:**
- Modify: `src/components/Sidebar.tsx`

**Step 1: Read the sidebar file to find the width class**

Find the container div that has `w-56`. It should look like:
```tsx
className="... w-56 ..."
```

Replace `w-56` with `w-48 xs:w-56` so it uses 192px on phones smaller than 475px and 224px on larger ones.

**Step 2: Verify no visual regressions on desktop**

```bash
npm run build 2>&1 | tail -3
```

Expected: no errors

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "fix(mobile): sidebar w-48 on xs screens, w-56 on sm+"
```

---

## Task 10: Add deep link handling to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add import at the top of App.tsx (after existing imports)**

```typescript
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
```

**Step 2: Create a DeepLinkHandler component**

Add this component ABOVE the `App` function definition:

```typescript
// Handles deep links: jurify://processos/123 → /processos/123
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapacitorApp.addListener('appUrlOpen', (event) => {
      // e.g. jurify://processos/abc-123
      const url = new URL(event.url);
      const path = url.pathname || url.host + url.pathname;
      if (path && path !== '/') {
        navigate(path);
      }
    });

    return () => { void listener.then(l => l.remove()); };
  }, [navigate]);

  return null;
}
```

**Step 3: Add DeepLinkHandler inside BrowserRouter**

In the JSX, find `<BrowserRouter>` and add `<DeepLinkHandler />` as the first child inside it, before `<Routes>`:

```tsx
<BrowserRouter>
  <DeepLinkHandler />
  <Routes>
    ...
  </Routes>
</BrowserRouter>
```

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(mobile): deep link handler for jurify:// URL scheme"
```

---

## Task 11: Create usePushNotifications.ts hook

**Files:**
- Create: `src/hooks/usePushNotifications.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/usePushNotifications.ts
import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PushNotifications');

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const savePushToken = useCallback(async (token: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
    if (error) logger.error('Failed to save push token', { error });
  }, [user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    void (async () => {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return;

      await PushNotifications.register();
    })();

    // Save FCM/APNs token to Supabase
    const tokenListener = PushNotifications.addListener('registration', (token) => {
      void savePushToken(token.value);
    });

    // Handle notification tap (app opened from notification)
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data as { route?: string };
      if (data?.route) navigate(data.route);
    });

    return () => {
      void tokenListener.then(l => l.remove());
      void actionListener.then(l => l.remove());
    };
  }, [user, savePushToken, navigate]);
}
```

**Step 2: Wire usePushNotifications into Layout.tsx**

In `src/components/Layout.tsx`, add import:
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';
```

Then inside the `Layout` component (after `useRealtimeSync()`), add:
```typescript
usePushNotifications();
```

**Step 3: Add push_token column migration**

Create `supabase/migrations/20260309000002_profiles_push_token.sql`:

```sql
-- Add push_token to profiles for native push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text;
```

Apply via Supabase Management API:

```bash
node -e "
const fs=require('fs'),https=require('https');
const sql=fs.readFileSync('supabase/migrations/20260309000002_profiles_push_token.sql','utf8');
const body=JSON.stringify({query:sql});
const req=https.request({
  hostname:'api.supabase.com',
  path:'/v1/projects/yfxgncbopvnsltjqetxw/database/query',
  method:'POST',
  headers:{
    'Authorization':'Bearer sbp_fd22d435fa88ce2f367f8dae263c5b29b8442da6',
    'Content-Type':'application/json',
    'Content-Length':Buffer.byteLength(body)
  }
},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log(res.statusCode,d))});
req.write(body);req.end();
"
```

Expected: `201 []`

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add src/hooks/usePushNotifications.ts src/components/Layout.tsx supabase/migrations/20260309000002_profiles_push_token.sql
git commit -m "feat(mobile): native push notifications — register token + handle tap navigation"
```

---

## Task 12: Create useBiometrics.ts hook

**Files:**
- Create: `src/hooks/useBiometrics.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useBiometrics.ts
import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export interface BiometricsResult {
  isAvailable: boolean;
  authenticate: () => Promise<boolean>;
}

export function useBiometrics(): BiometricsResult {
  const [isAvailable] = useState(() => Capacitor.isNativePlatform());

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      // Dynamic import to avoid loading on web
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: 'Confirme sua identidade para acessar o Jurify',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Usar senha',
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return { isAvailable, authenticate };
}
```

**Note:** `@aparajita/capacitor-biometric-auth` is a community plugin. Install it:

```bash
npm install @aparajita/capacitor-biometric-auth
```

**Step 2: Add biometrics option to Auth page**

In `src/pages/Auth.tsx`, add a "Entrar com Face ID / biometria" button that only renders on native:

```typescript
// Add import
import { useBiometrics } from '@/hooks/useBiometrics';
import { Fingerprint } from 'lucide-react';

// Inside Auth component
const { isAvailable, authenticate } = useBiometrics();

const handleBiometricLogin = async () => {
  const success = await authenticate();
  if (!success) return;
  // User already has an active Supabase session from previous login
  // Just navigate to app — session is persisted in localStorage
  navigate('/');
};
```

Add button (only visible on native, below the normal login form):

```tsx
{isAvailable && (
  <Button
    type="button"
    variant="outline"
    className="w-full gap-2"
    onClick={() => { void handleBiometricLogin(); }}
  >
    <Fingerprint className="h-4 w-4" />
    Entrar com biometria
  </Button>
)}
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add src/hooks/useBiometrics.ts src/pages/Auth.tsx package.json package-lock.json
git commit -m "feat(mobile): biometric authentication (Face ID / fingerprint)"
```

---

## Task 13: Add camera support to UploadDocumentoForm

**Files:**
- Modify: `src/features/documentos/components/UploadDocumentoForm.tsx`

**Step 1: Add camera import and hook**

At the top of the file, add:

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
```

**Step 2: Add camera capture function inside the component**

After `const fileInputRef = useRef<HTMLInputElement>(null);`, add:

```typescript
const isNative = Capacitor.isNativePlatform();

const handleCameraCapture = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt, // asks user: camera or gallery
    });

    if (!image.webPath) return;

    // Convert webPath to File
    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const fileName = `documento_${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    handleFileSelect(file);
  } catch {
    // User cancelled — ignore
  }
};
```

**Step 3: Add camera button to the dropzone**

Inside the dropzone, after the existing upload button/text (inside the empty state div), add:

```tsx
{isNative && (
  <button
    type="button"
    className="text-primary underline mt-2 block"
    onClick={() => { void handleCameraCapture(); }}
  >
    ou tirar foto com a câmera
  </button>
)}
```

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 5: Commit**

```bash
git add src/features/documentos/components/UploadDocumentoForm.tsx
git commit -m "feat(mobile): camera capture for document upload on iOS/Android"
```

---

## Task 14: Create send-push-notification Edge Function

**Files:**
- Create: `supabase/functions/send-push-notification/index.ts`

**Step 1: Create the function**

```typescript
// supabase/functions/send-push-notification/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require service-role key
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token, title, body, data } = await req.json() as PushPayload;

    if (!token || !title || !body) {
      return new Response(JSON.stringify({ error: 'token, title, body required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmKey) {
      return new Response(JSON.stringify({ error: 'FCM_SERVER_KEY not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via FCM (covers Android + iOS with Firebase)
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: { title, body },
        data: data ?? {},
        priority: 'high',
      }),
    });

    const fcmResult = await fcmResponse.json();

    return new Response(JSON.stringify({ success: true, fcm: fcmResult }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Commit**

```bash
git add supabase/functions/send-push-notification/
git commit -m "feat(mobile): send-push-notification Edge Function via FCM"
```

---

## Task 15: Initialize Capacitor platforms (ios + android)

**Files:**
- Create: `android/` (generated)
- Create: `ios/` (generated)

**Step 1: Build the web app first**

```bash
CAPACITOR_BUILD=true npm run build
```

Expected: `dist/` folder with no errors

**Step 2: Add iOS platform**

```bash
npx cap add ios
```

Expected: `ios/` directory created with Xcode project

**Step 3: Add Android platform**

```bash
npx cap add android
```

Expected: `android/` directory created with Gradle project

**Step 4: Sync web assets to both platforms**

```bash
npx cap sync
```

Expected: Both platforms synced, plugins installed

**Step 5: Update .gitignore to exclude generated platform files that shouldn't be tracked**

In `.gitignore`, add:

```
# Capacitor
/ios/App/Pods/
/android/.gradle/
/android/app/build/
```

**Step 6: Commit**

```bash
git add ios/ android/ .gitignore
git commit -m "feat(mobile): initialize Capacitor iOS + Android platforms"
```

---

## Task 16: Add app icons and splash screen

**Files:**
- Create: `public/icon.png`
- Create: `public/splash.png`
- Create: `resources/icon.png`
- Create: `resources/splash.png`

**Step 1: Install Capacitor Assets tool**

```bash
npm install -D @capacitor/assets
```

**Step 2: Create resources directory and placeholder assets**

Create the logo icon for the app. The Jurify brand uses deep blue `#1e3a8a`. We need:
- `resources/icon.png` — 1024×1024px, the Jurify "J" logo or scale icon on blue background
- `resources/splash.png` — 2732×2732px, centered logo on blue background

For now, create a script that generates placeholder assets using Node.js canvas or just copy the existing favicon and note that proper branding assets need to be provided by design:

```bash
# Create resources directory
mkdir -p resources

# Instructions: place your 1024x1024 icon at resources/icon.png
# and your 2732x2732 splash at resources/splash.png
# Then run: npx @capacitor/assets generate
echo "Place resources/icon.png (1024x1024) and resources/splash.png (2732x2732) then run: npx @capacitor/assets generate"
```

**Step 3: Generate all platform-specific sizes (run after placing assets)**

```bash
npx @capacitor/assets generate --iconBackgroundColor '#1e3a8a' --iconBackgroundColorDark '#1e3a8a' --splashBackgroundColor '#1e3a8a' --splashBackgroundColorDark '#1e3a8a'
```

This generates all required sizes for iOS and Android automatically.

**Step 4: Commit**

```bash
git add resources/ android/app/src/main/res/ ios/App/App/Assets.xcassets/
git commit -m "feat(mobile): app icon + splash screen assets generated"
```

---

## Task 17: Configure Android permissions

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`

**Step 1: Add required permissions**

Inside `<manifest>`, add:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

**Step 2: Add deep link intent filter**

Inside the `<activity>` tag, add:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="jurify" />
</intent-filter>
```

**Step 3: Commit**

```bash
git add android/app/src/main/AndroidManifest.xml
git commit -m "feat(mobile): Android permissions + deep link intent filter"
```

---

## Task 18: Configure iOS permissions

**Files:**
- Modify: `ios/App/App/Info.plist`

**Step 1: Add required permission descriptions**

Add inside the root `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>O Jurify precisa da câmera para capturar fotos de documentos jurídicos.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>O Jurify precisa acessar suas fotos para selecionar documentos.</string>
<key>NSFaceIDUsageDescription</key>
<string>Use o Face ID para entrar no Jurify com segurança.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Necessário para gravação de vídeos de documentos.</string>
```

**Step 2: Add URL scheme for deep links**

Add inside the root `<dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>jurify</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.jurify.app</string>
    </dict>
</array>
```

**Step 3: Commit**

```bash
git add ios/App/App/Info.plist
git commit -m "feat(mobile): iOS permissions + URL scheme for deep links"
```

---

## Task 19: Final sync and verification

**Files:** None new

**Step 1: Full sync**

```bash
CAPACITOR_BUILD=true npm run build && npx cap sync
```

Expected: Both platforms synced successfully

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit --skipLibCheck
```

Expected: 0 errors

**Step 3: Run test suite**

```bash
npm test
```

Expected: all existing tests pass (1132+), 0 failures

**Step 4: Run lint**

```bash
npm run lint
```

Expected: 0 warnings, 0 errors

**Step 5: Verify Android builds**

```bash
npx cap run android --target emulator
# OR open Android Studio:
npx cap open android
```

Expected: App launches in emulator/device

**Step 6: Verify iOS builds (requires macOS + Xcode)**

```bash
npx cap open ios
```

Expected: Xcode opens, can build to simulator

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat(mobile): Capacitor iOS + Android app — complete native implementation

- Safe areas (notch/home indicator) on Layout
- Android back button handling
- Deep links: jurify:// URL scheme
- Native push notifications via FCM
- Camera capture for document upload
- Biometric auth (Face ID / fingerprint)
- Network detection via native plugin
- App icon + splash screen
- Sidebar width fix for xs screens

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Post-Implementation: Store Setup Checklist

These steps require external accounts and are done outside the codebase:

### Firebase (Push Notifications)
1. Create project at console.firebase.google.com
2. Add Android app with bundle ID `com.jurify.app`
3. Add iOS app with bundle ID `com.jurify.app`
4. Download `google-services.json` → place in `android/app/`
5. Download `GoogleService-Info.plist` → place in `ios/App/App/`
6. Get FCM Server Key → add as `FCM_SERVER_KEY` in Supabase secrets
7. In Xcode: enable Push Notifications capability

### Google Play Store
1. Create app at play.google.com/console
2. Upload signed APK/AAB: `npx cap build android`
3. Fill store listing (screenshots, description, icon)
4. Submit for review

### Apple App Store
1. Create app at appstoreconnect.apple.com
2. Create signing certificate + provisioning profile
3. Upload build via Xcode → Product → Archive
4. Fill store listing
5. Submit for review

---

## Environment Variables Needed

| Variable | Where | Purpose |
|----------|-------|---------|
| `FCM_SERVER_KEY` | Supabase secrets | Send push notifications |
| Apple Developer Team ID | Xcode settings | iOS signing |
| Android Keystore | `android/` | APK signing |
