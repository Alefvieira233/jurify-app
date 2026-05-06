/**
 * Edge function shared module — `_shared/rbac.ts`
 *
 * Server-side role checks for Edge Functions. Mirrors the contract used by
 * `src/hooks/useRBAC.ts`. The helper unions roles from `user_roles` and
 * `profiles.role` and treats unknown values as "no role".
 *
 * These tests use a hand-rolled stub Supabase client because the helper only
 * needs `.from(table).select(...).eq(...)` and `.maybeSingle()`. Keeping the
 * stub local to the test file means we are testing the logic of the helper
 * itself, not the Supabase JS surface.
 */

import { describe, it, expect } from 'vitest';
import {
  ForbiddenError,
  getEffectiveRole,
  getUserRoles,
  hasAnyRole,
  requireRole,
  forbiddenResponse,
} from '../../../../supabase/functions/_shared/rbac';

// ─── Test stub: Supabase-like client ─────────────────────────────────────────
//
// Mimics enough of the @supabase/supabase-js surface used by the helper:
//   supabase.from(table).select(...).eq(col, val)               → array
//   supabase.from(table).select(...).eq(col, val).maybeSingle() → single | null

type Tables = {
  user_roles: Array<{ user_id: string; role: string | null }>;
  profiles: Array<{ id: string; role: string | null }>;
};

function makeStub(tables: Tables) {
  return {
    from(table: keyof Tables) {
      const rows = tables[table] as Array<Record<string, unknown>>;
      return {
        select(_cols: string) {
          let filtered = rows;
          const builder = {
            eq(col: string, val: unknown) {
              filtered = filtered.filter((r) => r[col] === val);
              // Eq returns a thenable that resolves to { data }
              const thenable = {
                then(resolve: (value: { data: typeof filtered }) => void) {
                  resolve({ data: filtered });
                },
                maybeSingle() {
                  return Promise.resolve({ data: filtered[0] ?? null });
                },
              };
              return thenable;
            },
          };
          return builder;
        },
      };
    },
  };
}

// deno-lint-ignore no-explicit-any
const asClient = (stub: ReturnType<typeof makeStub>) => stub as any;

// ─── getUserRoles ────────────────────────────────────────────────────────────

describe('getUserRoles', () => {
  it('unions roles from user_roles and profiles', async () => {
    const stub = makeStub({
      user_roles: [
        { user_id: 'u1', role: 'manager' },
        { user_id: 'u1', role: 'user' },
      ],
      profiles: [{ id: 'u1', role: 'user' }],
    });

    const roles = await getUserRoles(asClient(stub), 'u1');
    expect(Array.from(roles).sort()).toEqual(['manager', 'user']);
  });

  it('falls back to profiles.role when user_roles has no entry', async () => {
    const stub = makeStub({
      user_roles: [],
      profiles: [{ id: 'u2', role: 'admin' }],
    });

    const roles = await getUserRoles(asClient(stub), 'u2');
    expect(Array.from(roles)).toEqual(['admin']);
  });

  it('drops legacy/unknown role values silently', async () => {
    const stub = makeStub({
      user_roles: [{ user_id: 'u3', role: 'administrador' }], // legacy pt-BR
      profiles: [{ id: 'u3', role: 'something_else' }],
    });

    const roles = await getUserRoles(asClient(stub), 'u3');
    // Neither value is a recognised AppRole → empty set
    expect(roles.size).toBe(0);
  });

  it('returns empty set when user has no records anywhere', async () => {
    const stub = makeStub({ user_roles: [], profiles: [] });
    const roles = await getUserRoles(asClient(stub), 'ghost');
    expect(roles.size).toBe(0);
  });
});

// ─── getEffectiveRole ────────────────────────────────────────────────────────

describe('getEffectiveRole', () => {
  it.each<[string, string[], string]>([
    ['admin wins over manager', ['admin', 'manager'], 'admin'],
    ['manager wins over user', ['manager', 'user'], 'manager'],
    ['user wins over viewer', ['user', 'viewer'], 'user'],
    ['single viewer', ['viewer'], 'viewer'],
  ])('%s', async (_label, roles, expected) => {
    const stub = makeStub({
      user_roles: roles.map((r) => ({ user_id: 'u', role: r })),
      profiles: [],
    });
    expect(await getEffectiveRole(asClient(stub), 'u')).toBe(expected);
  });

  it('defaults to viewer when no roles found', async () => {
    const stub = makeStub({ user_roles: [], profiles: [] });
    expect(await getEffectiveRole(asClient(stub), 'u')).toBe('viewer');
  });
});

// ─── hasAnyRole / requireRole ───────────────────────────────────────────────

describe('hasAnyRole / requireRole', () => {
  const stubAdmin = makeStub({
    user_roles: [{ user_id: 'u', role: 'admin' }],
    profiles: [],
  });
  const stubViewer = makeStub({
    user_roles: [{ user_id: 'u', role: 'viewer' }],
    profiles: [],
  });
  const stubNone = makeStub({ user_roles: [], profiles: [] });

  it('hasAnyRole returns true when intersection non-empty', async () => {
    expect(await hasAnyRole(asClient(stubAdmin), 'u', ['admin', 'manager'])).toBe(true);
  });

  it('hasAnyRole returns false when no intersection', async () => {
    expect(await hasAnyRole(asClient(stubViewer), 'u', ['admin', 'manager', 'user'])).toBe(false);
  });

  it('requireRole returns matched role on allow', async () => {
    const matched = await requireRole(asClient(stubAdmin), 'u', ['admin']);
    expect(matched).toBe('admin');
  });

  it('requireRole throws ForbiddenError on deny', async () => {
    await expect(requireRole(asClient(stubViewer), 'u', ['admin', 'manager', 'user']))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireRole error includes user id and roles for ops logging', async () => {
    try {
      await requireRole(asClient(stubViewer), 'u', ['admin']);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      const err = e as ForbiddenError;
      expect(err.userId).toBe('u');
      expect(err.required).toEqual(['admin']);
      expect(err.actual).toEqual(['viewer']);
      expect(err.status).toBe(403);
    }
  });

  it('requireRole denies user with no roles', async () => {
    await expect(requireRole(asClient(stubNone), 'ghost', ['admin']))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireRole rejects empty allowed list (programming error)', async () => {
    await expect(requireRole(asClient(stubAdmin), 'u', []))
      .rejects.toThrow(/empty allowed list/);
  });
});

// ─── forbiddenResponse ──────────────────────────────────────────────────────

describe('forbiddenResponse', () => {
  it('returns 403 with sanitized JSON body', async () => {
    const err = new ForbiddenError('msg', 'u', ['admin'], ['viewer']);
    const res = forbiddenResponse(err, { 'X-Test': '1' });

    expect(res.status).toBe(403);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Test')).toBe('1');

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Forbidden: insufficient role for this action');
    // Must NOT leak the actual or required roles
    expect(JSON.stringify(body)).not.toContain('admin');
    expect(JSON.stringify(body)).not.toContain('viewer');
  });
});
