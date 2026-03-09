# Jurify Mobile App — Capacitor Design

**Date:** 2026-03-09
**Status:** Approved
**Targets:** iOS (App Store) + Android (Google Play) + Web (Vercel)

---

## Problem

Jurify has no mobile app. The web app is responsive but not installable via App Store or Google Play. Clients need native push notifications for prazos alerts, and a proper mobile presence on both stores.

---

## Approach: Capacitor

Wrap the existing React/Vite web app in a Capacitor native shell. One codebase generates three targets: web, iOS, Android. Zero duplication of business logic.

**Not chosen:**
- React Native — full rewrite of 52 screens, weeks of work, 2 codebases forever
- Capacitor + Ionic redesign — changes existing navigation structure unnecessarily

---

## Architecture

```
src/ (React 18 + TypeScript + Vite)
  └── builds to dist/
        └── Capacitor syncs to:
              ├── ios/    (Xcode project)
              └── android/ (Gradle project)
```

**Flow:**
```
npm run build → npx cap sync → Xcode / Android Studio → App Store / Play Store
```

---

## New Files

### Config
- `capacitor.config.ts` — bundle ID, app name, server, plugins config
- `vite.config.ts` — add base path adjustment for native builds
- `package.json` — add `mobile:ios` and `mobile:android` scripts

### Hooks
- `src/hooks/useCapacitor.ts` — detects native platform, exposes `isNative`, `platform`
- `src/hooks/usePushNotifications.ts` — register device token, handle foreground/background push
- `src/hooks/useBiometrics.ts` — Face ID / fingerprint auth

### Assets
- `public/icon.png` — 1024×1024 app icon
- `public/splash.png` — 2732×2732 splash screen

---

## Native Plugins

| Package | Purpose |
|---------|---------|
| `@capacitor/push-notifications` | Native push for prazos alerts, contracts, leads |
| `@capacitor/local-notifications` | Offline scheduled reminders |
| `@capacitor/camera` | Photo capture for DocumentosManager |
| `@capacitor/filesystem` | Download/save contracts and documents |
| `@capacitor/share` | Share documents via WhatsApp, email, etc. |
| `@capacitor/haptics` | Tactile feedback on kanban drag, form submit |
| `@capacitor/status-bar` | Match status bar to app theme |
| `@capacitor/splash-screen` | Branded loading screen |
| `@capacitor/app` | Android back button, deep links (`jurify://`) |
| `@capacitor/network` | Native network detection (replaces useNetworkStatus) |
| `@capacitor/keyboard` | Prevent keyboard from covering forms |
| `@capacitor/browser` | Google OAuth via in-app browser |
| `@capacitor-community/biometrics` | Face ID / fingerprint login |

---

## Mobile UX Fixes

### Safe Areas (notch + home indicator)
```css
.layout-header { padding-top: env(safe-area-inset-top); }
.layout-main   { padding-bottom: env(safe-area-inset-bottom); }
```

### Sidebar width on small phones
- Add Tailwind `xs` breakpoint (475px) to `tailwind.config.ts`
- Sidebar: `w-48` on xs, `w-56` on sm+

### Android back button
- `App.addListener('backButton')` → close open dialogs first, then navigate back, then exit

### Keyboard avoidance
- `Keyboard.addListener('keyboardWillShow')` → scroll active input into view

### Pull-to-refresh
- Wrap list views (Pipeline, CRM, Processos, Prazos) with native pull-to-refresh

### Touch targets
- Audit icon buttons — minimum 44×44px tap target

---

## Push Notifications Integration

Push tokens registered on login → stored in Supabase `profiles.push_token`.
Existing Edge Functions (`process-prazos-alerts`, `whatsapp-webhook`) extended to call `send-push-notification` function.

New Edge Function: `send-push-notification`
- Accepts `{ token, title, body, data }`
- Sends via Firebase Cloud Messaging (FCM) for Android + APNs for iOS
- Called by prazos alerts, contract signed events, new lead notifications

---

## Deep Links

| URL | Opens |
|-----|-------|
| `jurify://processos/:id` | ProcessoDetalhes |
| `jurify://prazos` | PrazosManager |
| `jurify://contratos/:id` | ContratoDetalhes |
| `jurify://notificacoes` | NotificationsPanel |

---

## Build Scripts

```json
{
  "mobile:ios": "npm run build && npx cap sync ios && npx cap open ios",
  "mobile:android": "npm run build && npx cap sync android && npx cap open android",
  "mobile:sync": "npm run build && npx cap sync"
}
```

---

## App Store Requirements

| Item | iOS | Android |
|------|-----|---------|
| Bundle ID | `com.jurify.app` | `com.jurify.app` |
| Min version | iOS 14+ | Android 7+ (API 24) |
| Push notifications | APNs key | FCM server key |
| Camera permission | Yes (documents) | Yes (documents) |
| Biometrics permission | Face ID / Touch ID | Fingerprint |
| Storage permission | Yes (file download) | Yes (file download) |

---

## Files Modified

1. `package.json` — new scripts + dependencies
2. `vite.config.ts` — base path for native
3. `tailwind.config.ts` — `xs` breakpoint
4. `src/index.css` — safe area insets
5. `src/App.tsx` — Capacitor app listener (back button, deep links)
6. `src/components/Layout.tsx` — safe area padding
7. `src/components/Sidebar.tsx` — xs width fix
8. `src/features/documentos/components/UploadDocumentoForm.tsx` — camera option
9. `src/hooks/useNetworkStatus.ts` — use native Network plugin
10. `src/features/notifications/NotificationsPanel.tsx` — register push token
11. `src/contexts/AuthContext.tsx` — biometrics login
12. `supabase/functions/send-push-notification/index.ts` — new Edge Function

---

## Out of Scope (Phase 2)

- GitHub Actions + Fastlane CI/CD for automated store builds
- App Store Connect + Google Play Console setup (requires Apple Developer + Google Play accounts)
- In-app purchases / billing via native stores
- Apple Watch / Android widget extensions
