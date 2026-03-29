# Phase 1 Research -- Visual Foundation
> Generated: 2026-03-29

## Current State

### Design Tokens (index.css)

The file (`src/index.css`, 548 lines) defines a comprehensive token system in HSL format across two themes:

**Light mode (`:root`)** -- Already aligned with LiderHub's "Clean White + Blue" palette:
- `--background`: pure white (0 0% 100%)
- `--foreground`: gray-900 (222 47% 11%)
- `--primary`: blue-500 (#3b82f6, 217 91% 60%)
- `--secondary` / `--muted`: gray-100 (220 14% 96%)
- `--accent`: blue-50 tint (217 91% 97%)
- `--border` / `--input`: gray-200 (220 13% 91%)
- `--ring`: blue-500 (217 91% 60%)
- `--radius`: 0.5rem (8px)

**Sidebar-specific tokens** (light):
- `--sidebar-background`: pure white
- `--sidebar-foreground`: gray-500
- `--sidebar-primary`: blue-500
- `--sidebar-accent`: blue-50
- `--sidebar-border`: gray-200

**Semantic colors**: destructive (red), success (emerald), warning (amber), info (blue) -- all present in both themes.

**Status colors**: 6 pipeline status colors (`--status-novo-lead`, `--status-qualificacao`, etc.) in both light and dark.

**Shadow system**: 4 shadow tokens (`--shadow-card`, `--shadow-card-hover`, `--shadow-sm`, `--shadow-md`) -- light uses subtle 0.03-0.06 opacity, dark uses 0.20-0.40.

**Dark mode (`.dark`)** -- "Lex Obsidian" theme with deep navy/blue palette:
- `--background`: #0b1326 (222 55% 10%)
- `--primary`: #2253f8 (226 93% 55%)
- `--card`: #171f33 (223 38% 15%)
- Fully self-contained, no dependency on light tokens.

**Other notable elements**:
- Body font: Manrope (loaded via `<link>` in index.html)
- Safe area CSS vars for Capacitor native apps
- Component classes: `.page-container`, `.page-header`, `.metric-card`, `.section-card`, `.status-dot`, `.btn-sharp`
- FullCalendar theme overrides (extensive, ~100 lines)
- Dark mode legacy utility overrides (`.dark .text-gray-*`, `.dark .bg-white`, etc.)
- Animations: fadeIn, revealUp, slideIn

### Tailwind Config

File: `tailwind.config.ts` (111 lines)

- **Dark mode**: class-based (`["class"]`)
- **Font family**: `Inter` (note: index.css body uses Manrope -- mismatch)
- **Colors**: All mapped to CSS custom properties via `hsl(var(--*))` pattern. Includes: border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, popover, card, sidebar (with sub-tokens: primary, accent, border, ring).
- **Border radius**: lg/md/sm derived from `--radius` variable
- **Box shadows**: card, card-hover, premium, elevation-1, elevation-2 -- all mapped to CSS vars
- **Keyframes**: accordion-down/up, fade-blur-in, slide-in-left
- **Animations**: accordion-down/up, fade-blur-in, slide-in-left
- **Container**: centered, 2rem padding, max 1400px at 2xl
- **Extra breakpoint**: xs at 475px
- **Plugin**: tailwindcss-animate

### Sidebar Component

File: `src/components/Sidebar.tsx` (394 lines)

**Structure**:
- Fixed 220px width (`w-[220px]`), full height, white background with right border
- Uses `bg-background` (not `bg-sidebar-background`)

**Sections (top to bottom)**:
1. **Logo area** (h-20): Gradient icon (primary to blue-700), "Jurify" text + "Enterprise" label, ThemeToggle
2. **Search button**: Triggers Ctrl+K GlobalSearch, styled with `bg-black/20` (looks wrong for light mode)
3. **Navigation**: Section header "Acesso Principal", then MAIN_NAV items
4. **Referral CTA**: "Indique Jurify -- Ganhe R$200 por indicacao"
5. **User footer**: Avatar initial, name, role label, help button, logout button

**Navigation items (MAIN_NAV)**:
- Home (Home icon)
- Dashboard (LayoutDashboard)
- Conexoes (Link2)
- Atendimento section (expandable): Conversas, Contatos, Kanban
- Automacoes section (expandable): Agentes, Base de Conhecimento
- Tarefas (CheckSquare)
- Configuracoes (Settings)
- Suporte (HelpCircle)

**RBAC**: Each leaf has `resource` and `action` fields; visibility filtered via `hasPermission()` async check. Sections auto-expand when active route is inside.

**Active state**: Blue text + blue left border (`border-l-2 border-primary`), `bg-primary/5`.

**Notable**: Search bar uses dark-background styling (`bg-black/20`) which is wrong for white sidebar in light mode.

### Layout Component

File: `src/components/Layout.tsx` (152 lines)

**Structure**:
- Outer: `min-h-screen bg-background flex flex-col`
- **TopBar**: Already exists -- renders at top of page for all screen sizes
- **Network status banner**: Fixed overlay for offline/reconnected states
- **Global components**: OnboardingFlow, GlobalSearch, AIAssistantChat
- **Body**: `flex flex-1 overflow-hidden`
  - Sidebar: Fixed on mobile (slide-in via transform), relative on desktop (lg:)
  - Main content: `flex-1 min-w-0 overflow-y-auto`, max-width 1920px
- **Breadcrumbs**: Already exists -- rendered inside `<main>` above `<Outlet />`
- **Mobile menu**: Overlay with backdrop-blur on mobile

**Imports already present**: `TopBar` and `Breadcrumbs` are imported and rendered.

**Capacitor support**: Android back button handling, safe area classes for native.

### Existing TopBar Component

File: `src/components/TopBar.tsx` (74 lines)

- Height: h-14, border-bottom, bg-background
- **Left**: Mobile hamburger (lg:hidden), "Jurify" text logo
- **Center**: flex-1 spacer
- **Right**: Search trigger (hidden sm:flex, w-56), ThemeToggle, Notifications bell (with unread badge), Avatar
- No workspace selector yet
- No dropdown menu on avatar yet

### Existing Breadcrumbs Component

File: `src/components/Breadcrumbs.tsx` (57 lines)

- Uses `useLocation()` to parse pathname segments
- Maps segments to labels via `ROUTE_LABELS` dictionary (32 routes mapped)
- Hidden on home/root
- Renders as `nav` with ChevronRight separators
- Last crumb is bold (`text-foreground font-medium`), others are muted
- Styling: `px-6 pt-4 pb-1 text-xs`

## Target State (from Design Spec)

Phase 1 "Visual Foundation" needs to achieve:

### Task 1: Design Tokens & Tailwind Config
- Update `:root` CSS custom properties to match LiderHub's clean white/blue palette
- Ensure `--accent` maps to `220 14% 96%` (neutral) instead of current blue-50 tint
- Keep `.dark` block unchanged (light-mode-first approach)
- Confirm `fontFamily.sans` uses Inter in Tailwind config
- Verify build compiles after token changes

### Task 2: Create TopBar Component
- TopBar with: mobile hamburger, logo+workspace, search trigger, notifications bell, avatar with dropdown
- Workspace selector dropdown (future multi-workspace)
- Move ThemeToggle into TopBar (already done)
- Integrate into Layout.tsx (already done)

### Task 3: Add Breadcrumbs
- Route-aware breadcrumbs below TopBar (already done)
- ChevronRight separator (already done)
- Hidden on home (already done)

### Task 4: Sidebar Polish
- Ensure white background, clean hover states
- Active item: blue text + blue left border (already implemented)
- Verify spacing, font sizes, icon consistency

## Gap Analysis

### Already Done (no changes needed)
1. **TopBar exists** -- `src/components/TopBar.tsx` is created and integrated into Layout
2. **Breadcrumbs exist** -- `src/components/Breadcrumbs.tsx` is created and integrated into Layout
3. **Layout integration** -- Both TopBar and Breadcrumbs are imported and rendered in Layout.tsx
4. **Sidebar nav structure** -- Already matches the LiderHub navigation tree exactly
5. **Active state styling** -- Blue text + blue left border already implemented
6. **RBAC filtering** -- Already working on sidebar items
7. **Expandable sections** -- Atendimento and Automacoes already collapsible with chevrons
8. **Referral CTA** -- Already in sidebar footer
9. **Dark mode tokens** -- Complete and should be left as-is per plan

### Needs Modification
1. **`--accent` token mismatch**: Current light `:root` has `--accent: 217 91% 97%` (blue-50 tint). Plan says it should be `220 14% 96%` (neutral gray-100, same as secondary). The `--accent-foreground` would change from `217 91% 45%` to `222 47% 11%`.
2. **Font family mismatch**: `tailwind.config.ts` defines `fontFamily.sans` as `['Inter', ...]` but `index.css` body uses `'Manrope'`. Need to decide which font is canonical. The plan says to use Inter.
3. **Sidebar search bar styling**: Uses `bg-black/20` which looks wrong on white sidebar in light mode. Should use a neutral muted background.
4. **TopBar workspace selector**: Not yet implemented -- just shows "Jurify" text. Plan calls for a dropdown workspace selector.
5. **TopBar avatar dropdown**: No dropdown menu on avatar click (Minha Conta, Sair). Currently just a static avatar.
6. **Sidebar `bg-background`**: Uses `bg-background` instead of sidebar-specific token. Works since both are white, but semantically should use sidebar tokens.
7. **ThemeToggle duplication**: ThemeToggle appears in both Sidebar logo area AND TopBar. Should only be in TopBar per the LiderHub design.

### New (not yet created)
1. Nothing structurally new is needed for Phase 1 -- all components exist. The work is refinement.

## Implementation Notes

### Dependencies
- No new npm packages needed for Phase 1
- All referenced components (Avatar, Button, Badge) already exist in shadcn/ui
- `getInitials` and `getAvatarHex` utils already exist in `src/utils/formatting`

### Risks
1. **Font change (Manrope to Inter)**: If Inter is adopted per Tailwind config, need to ensure `index.html` loads Inter via `<link>` or the font is bundled. Currently Manrope is loaded via `<link>` in index.html. Changing fonts could affect layout metrics across all pages.
2. **Accent token change**: Changing `--accent` from blue-50 to neutral gray-100 will affect every component using `bg-accent` or `text-accent-foreground`. Need to audit usage -- sidebar hover states currently use `hover:bg-accent` which would change from blue tint to gray.
3. **Sidebar search bar restyle**: The `bg-black/20` search bar is visually broken on white backgrounds. Fixing it is low risk but touches user interaction.

### Ordering Considerations
1. **Tokens first** (Task 1): All other visual changes depend on correct tokens
2. **Sidebar polish second** (Task 4): Remove ThemeToggle, fix search bar styling, verify bg tokens
3. **TopBar enhancements third** (Task 2): Add workspace selector dropdown, avatar dropdown menu
4. **Breadcrumbs last** (Task 3): Already functional, may just need minor style tweaks

### Test Impact
- Changes are purely visual (CSS tokens, component styling)
- Existing 1009 tests should not be affected
- Manual visual regression check recommended across light and dark themes
- Key pages to verify: Dashboard, CRM/Contatos, WhatsApp/Conversas, Pipeline/Kanban

### Files to Modify (Phase 1)
| File | Action | Scope |
|------|--------|-------|
| `src/index.css` | Modify | Update `--accent` and `--accent-foreground` in `:root` |
| `tailwind.config.ts` | Verify | Confirm font family alignment |
| `src/components/Sidebar.tsx` | Modify | Remove ThemeToggle, fix search bar bg, use sidebar tokens |
| `src/components/TopBar.tsx` | Modify | Add workspace selector, avatar dropdown menu |
| `src/components/Breadcrumbs.tsx` | Verify | Already functional, minor style check |
| `src/components/Layout.tsx` | Verify | Already integrates TopBar + Breadcrumbs |
