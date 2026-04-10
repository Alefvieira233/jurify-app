/**
 * RBAC — parity test between the SQL `has_permission()` function and
 * `ROLE_PERMISSIONS` in src/types/rbac.ts.
 *
 * The previous version of this file declared a TypeScript replica of the SQL
 * function and tested the replica. That was a contract duplicated three ways
 * (SQL, TS replica, TS source of truth) with nothing enforcing agreement.
 *
 * This version parses the real SQL migration from disk, extracts the permission
 * matrix, and cross-checks it against ROLE_PERMISSIONS. If either side drifts
 * without updating the other, the test fails.
 *
 * Note: a full integration test that actually invokes the SQL function would
 * require a running Supabase (local `supabase start`). This file validates
 * the STATIC CONTRACT between the two sources of truth. See
 * `docs/audit/2026-04-10/99-REMEDIATION-PLAN.md` Story 3.4 for the live-DB
 * test framework that complements this.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROLE_PERMISSIONS, type UserRole, type Action } from '../../types/rbac';

// ─── Parse the SQL migration ─────────────────────────────────

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../supabase/migrations/20260209000001_rls_role_based_policies.sql'
);

/**
 * Extracted permission matrix from the SQL `has_permission` function.
 * Shape: { [role]: { [resource]: Set<action> } }
 */
type SqlMatrix = Record<string, Record<string, Set<string>>>;

/**
 * Parse the `has_permission` SQL function body and extract the role/resource/action
 * matrix. The function uses a CASE expression with a known structure:
 *
 *   WHEN '<role>' THEN
 *     CASE _resource
 *       WHEN '<resource>' THEN _action IN ('create','read',...)
 *       ELSE false
 *     END
 */
function parseSqlHasPermission(): SqlMatrix {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  // Slice just the has_permission function body between SELECT CASE and END; $$
  const functionStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.has_permission');
  if (functionStart === -1) {
    throw new Error('has_permission function not found in migration');
  }
  const functionEnd = sql.indexOf('$$;', functionStart);
  if (functionEnd === -1) {
    throw new Error('unterminated has_permission function');
  }
  const body = sql.slice(functionStart, functionEnd);

  const matrix: SqlMatrix = {};

  // Split on top-level role WHEN clauses. The outer CASE is over the role.
  // Each role branch starts with `WHEN '<role>' THEN` or `ELSE` (viewer fallback).
  //
  // Role order in the function: admin, manager, user, ELSE (viewer).
  // We split into sections by the role headers.
  const rolePattern = /WHEN '(admin|manager|user)' THEN([\s\S]*?)(?=WHEN '(?:admin|manager|user)' THEN|ELSE\s*CASE _resource|$)/g;

  let match: RegExpExecArray | null;
  while ((match = rolePattern.exec(body)) !== null) {
    const role = match[1];
    matrix[role] = extractResourceMatrix(match[2]);
  }

  // Extract viewer (the ELSE branch at the end)
  const viewerMatch = body.match(/ELSE\s*CASE _resource([\s\S]*?)END\s*END/);
  if (viewerMatch) {
    matrix.viewer = extractResourceMatrix(viewerMatch[1]);
  }

  return matrix;
}

/**
 * Extract a { resource → Set<action> } map from a SQL fragment like:
 *   WHEN 'leads'     THEN _action IN ('create','read','update','delete')
 *   WHEN 'contratos' THEN _action IN ('create','read','update','delete')
 *   ELSE false
 */
function extractResourceMatrix(fragment: string): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  const resourcePattern = /WHEN '([a-z_]+)'\s*THEN\s*_action IN \(([^)]+)\)/g;

  let m: RegExpExecArray | null;
  while ((m = resourcePattern.exec(fragment)) !== null) {
    const resource = m[1];
    const actions = m[2]
      .split(',')
      .map((a) => a.trim().replace(/^'|'$/g, ''))
      .filter((a) => a.length > 0);
    result[resource] = new Set(actions);
  }

  return result;
}

const SQL_MATRIX = parseSqlHasPermission();

// Convert ROLE_PERMISSIONS to the same { role → resource → Set<action> } shape
function buildTsMatrix(): SqlMatrix {
  const matrix: SqlMatrix = {};
  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    matrix[role] = {};
    for (const perm of permissions) {
      if (perm.actions.length > 0) {
        matrix[role][perm.resource] = new Set(perm.actions);
      }
    }
  }
  return matrix;
}

const TS_MATRIX = buildTsMatrix();

// ─── Sanity: parser actually found something ─────────────────

describe('RBAC — SQL migration parser', () => {
  it('parsed all four roles from the SQL function', () => {
    expect(Object.keys(SQL_MATRIX).sort()).toEqual(['admin', 'manager', 'user', 'viewer']);
  });

  it('admin has at least 10 resources (sanity check)', () => {
    expect(Object.keys(SQL_MATRIX.admin).length).toBeGreaterThanOrEqual(10);
  });

  it('admin.leads includes all four CRUD actions', () => {
    expect(SQL_MATRIX.admin.leads).toEqual(new Set(['create', 'read', 'update', 'delete']));
  });

  it('viewer can only read leads', () => {
    expect(SQL_MATRIX.viewer.leads).toEqual(new Set(['read']));
  });
});

// ─── Parity: for every resource present in BOTH, actions must match exactly

describe('RBAC — SQL ↔ TypeScript parity on shared resources', () => {
  const allRoles: UserRole[] = ['admin', 'manager', 'user', 'viewer'];

  for (const role of allRoles) {
    describe(`role: ${role}`, () => {
      const sqlResources = SQL_MATRIX[role];
      const tsResources = TS_MATRIX[role];

      // Resources covered by both SQL and TS
      const sharedResources = Object.keys(sqlResources).filter((r) => tsResources[r] !== undefined);

      it(`has at least 8 shared resources to compare`, () => {
        expect(sharedResources.length).toBeGreaterThanOrEqual(8);
      });

      for (const resource of Object.keys(sqlResources).sort()) {
        if (!tsResources[resource]) continue;

        it(`${role}.${resource} actions match between SQL and TS`, () => {
          const sqlActions = Array.from(sqlResources[resource]).sort();
          const tsActions = Array.from(tsResources[resource]).sort();
          expect(sqlActions).toEqual(tsActions);
        });
      }
    });
  }
});

// ─── Drift detection: flag SQL-only and TS-only resources

describe('RBAC — drift detection', () => {
  const allRoles: UserRole[] = ['admin', 'manager', 'user', 'viewer'];

  for (const role of allRoles) {
    it(`${role}: no SQL-only resources (would mean DB enforces something the UI doesn't know about)`, () => {
      const sqlResources = new Set(Object.keys(SQL_MATRIX[role]));
      const tsResources = new Set(Object.keys(TS_MATRIX[role]));
      const sqlOnly = [...sqlResources].filter((r) => !tsResources.has(r));
      expect(sqlOnly).toEqual([]);
    });
  }

  /**
   * Frontend resources that are intentionally not enforced at the DB function
   * level — either they use other RLS patterns (e.g., tenant_id match only)
   * or they are client-side UX affordances with no DB enforcement.
   *
   * Adding anything to this list is a conscious tradeoff and must be reviewed.
   */
  const ACCEPTED_TS_ONLY_RESOURCES = new Set([
    'processos',
    'prazos',
    'honorarios',
    'documentos',
    'conexoes',
    'departamentos',
    'tags',
    'fluxos',
    'regras',
  ]);

  for (const role of allRoles) {
    it(`${role}: every TS-only resource is explicitly accepted`, () => {
      const sqlResources = new Set(Object.keys(SQL_MATRIX[role]));
      const tsResources = new Set(Object.keys(TS_MATRIX[role]));
      const tsOnly = [...tsResources].filter((r) => !sqlResources.has(r));
      const unaccepted = tsOnly.filter((r) => !ACCEPTED_TS_ONLY_RESOURCES.has(r));
      expect(unaccepted).toEqual([]);
    });
  }
});

// ─── Privilege escalation guards

describe('RBAC — privilege escalation prevention', () => {
  function canSql(role: string, resource: string, action: Action): boolean {
    return SQL_MATRIX[role]?.[resource]?.has(action) ?? false;
  }

  describe('Viewer is strictly read-only on core tables', () => {
    const coreTables = ['leads', 'contratos', 'agentes_ia', 'agendamentos', 'notificacoes'] as const;
    const writeActions: Action[] = ['create', 'update', 'delete'];

    for (const table of coreTables) {
      for (const action of writeActions) {
        it(`viewer cannot ${action} ${table}`, () => {
          expect(canSql('viewer', table, action)).toBe(false);
        });
      }
    }
  });

  describe('User cannot perform manager-only actions', () => {
    it('user cannot delete leads', () => {
      expect(canSql('user', 'leads', 'delete')).toBe(false);
      expect(canSql('manager', 'leads', 'delete')).toBe(true);
    });

    it('user cannot create contratos', () => {
      expect(canSql('user', 'contratos', 'create')).toBe(false);
      expect(canSql('manager', 'contratos', 'create')).toBe(true);
    });

    it('user cannot update contratos', () => {
      expect(canSql('user', 'contratos', 'update')).toBe(false);
      expect(canSql('manager', 'contratos', 'update')).toBe(true);
    });

    it('user cannot delete agendamentos', () => {
      expect(canSql('user', 'agendamentos', 'delete')).toBe(false);
      expect(canSql('manager', 'agendamentos', 'delete')).toBe(true);
    });
  });

  describe('Manager cannot perform admin-only actions', () => {
    it('manager cannot create/update/delete agentes_ia', () => {
      expect(canSql('manager', 'agentes_ia', 'create')).toBe(false);
      expect(canSql('manager', 'agentes_ia', 'update')).toBe(false);
      expect(canSql('manager', 'agentes_ia', 'delete')).toBe(false);
      expect(canSql('admin', 'agentes_ia', 'delete')).toBe(true);
    });

    it('manager cannot delete contratos', () => {
      expect(canSql('manager', 'contratos', 'delete')).toBe(false);
      expect(canSql('admin', 'contratos', 'delete')).toBe(true);
    });

    it('manager cannot manage usuarios', () => {
      expect(canSql('manager', 'usuarios', 'manage')).toBe(false);
      expect(canSql('admin', 'usuarios', 'manage')).toBe(true);
    });

    it('manager cannot manage integracoes', () => {
      expect(canSql('manager', 'integracoes', 'manage')).toBe(false);
      expect(canSql('admin', 'integracoes', 'manage')).toBe(true);
    });
  });

  describe('Unknown roles and resources fail closed', () => {
    it('SQL has no matrix entry for unknown roles (they fall through to viewer ELSE branch)', () => {
      // The SQL function's ELSE branch (viewer) only grants read on whitelisted resources.
      // This is captured by the viewer matrix, so we assert the viewer has no 'manage' anywhere.
      for (const actions of Object.values(SQL_MATRIX.viewer)) {
        expect(actions.has('manage')).toBe(false);
        expect(actions.has('create')).toBe(false);
        expect(actions.has('update')).toBe(false);
        expect(actions.has('delete')).toBe(false);
      }
    });

    it('no role has an `execute` action on agentes_ia except admin/manager/user', () => {
      expect(SQL_MATRIX.admin.agentes_ia.has('execute')).toBe(true);
      expect(SQL_MATRIX.manager.agentes_ia.has('execute')).toBe(true);
      expect(SQL_MATRIX.user.agentes_ia.has('execute')).toBe(true);
      expect(SQL_MATRIX.viewer.agentes_ia?.has('execute') ?? false).toBe(false);
    });
  });
});

// ─── Defense-in-depth: RLS policies reference has_permission

describe('RBAC — RLS policies call has_permission for core tables', () => {
  const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');

  // Every core-table write policy must reference has_permission(auth.uid(), ...)
  const CORE_POLICIES: Array<[string, string]> = [
    ['leads', 'create'],
    ['leads', 'update'],
    ['leads', 'delete'],
    ['contratos', 'create'],
    ['contratos', 'update'],
    ['contratos', 'delete'],
    ['agentes_ia', 'create'],
    ['agentes_ia', 'update'],
    ['agentes_ia', 'delete'],
    ['agendamentos', 'create'],
    ['agendamentos', 'update'],
    ['agendamentos', 'delete'],
  ];

  for (const [resource, action] of CORE_POLICIES) {
    it(`migration references has_permission(auth.uid(), '${resource}', '${action}')`, () => {
      const pattern = new RegExp(
        `has_permission\\(auth\\.uid\\(\\),\\s*'${resource}',\\s*'${action}'\\)`
      );
      expect(migrationSql).toMatch(pattern);
    });
  }
});
