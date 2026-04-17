/**
 * tribunal-sync — integration tests via the FakeProvider.
 *
 * Imports directly from `supabase/functions/_shared/providers/tribunal/`
 * so any change to the real provider contract or dedup keys will break
 * these tests — which is the point.
 *
 * The full edge function (`tribunal-sync/index.ts`) uses Deno `jsr:`
 * specifiers and cannot be imported by Vitest (Node) directly. These
 * tests validate the provider contract + dedup semantics that runSync()
 * depends on, under a deterministic FakeProvider.
 */

import { describe, it, expect } from 'vitest';
import { FakeProvider } from '../../../supabase/functions/_shared/providers/tribunal/fake';
import { ProviderNotConfiguredError } from '../../../supabase/functions/_shared/providers/tribunal/types';
import { EscavadorProvider } from '../../../supabase/functions/_shared/providers/tribunal/escavador';
import type { TribunalAndamento } from '../../../supabase/functions/_shared/providers/tribunal/types';

// Polyfill Deno.env for tests running under Node (Vitest).
// The provider modules read Deno.env.get at constructor time.
const denoGlobal = globalThis as unknown as { Deno?: { env: { get: (k: string) => string | undefined } } };
if (!denoGlobal.Deno) {
  denoGlobal.Deno = {
    env: {
      get: (key: string) => process.env[key],
    },
  };
}

interface UpsertedRow {
  tenant_id: string;
  processo_id: string;
  external_id: string | null;
  provider: string;
  descricao: string;
}

/** Minimal stub that mimics ON CONFLICT(processo_id, provider, external_id) DO NOTHING. */
function makeStubClient(store: { andamentos: UpsertedRow[] }) {
  return {
    from(_table: string) {
      return {
        upsert(rows: UpsertedRow[]) {
          let inserted = 0;
          for (const row of rows) {
            const dup = store.andamentos.some(
              (r) =>
                r.processo_id === row.processo_id &&
                r.provider === row.provider &&
                r.external_id === row.external_id,
            );
            if (!dup) {
              store.andamentos.push(row);
              inserted += 1;
            }
          }
          return Promise.resolve({ error: null, count: inserted });
        },
      };
    },
  };
}

describe('FakeProvider', () => {
  it('returns 3 deterministic andamentos covering multiple tipos', async () => {
    const provider = new FakeProvider();
    const andamentos = await provider.fetchAndamentos('0001234-56.2024.8.26.0100');

    expect(andamentos).toHaveLength(3);
    expect(andamentos.every((a) => a.externalId.startsWith('fake-'))).toBe(true);
    expect(andamentos.map((a) => a.tipo).sort()).toEqual(
      ['audiencia', 'despacho', 'movimento'].sort(),
    );
  });

  it('populates descricao + ISO data_andamento', async () => {
    const andamentos = await new FakeProvider().fetchAndamentos('12345');
    for (const a of andamentos) {
      expect(a.descricao.length).toBeGreaterThan(0);
      expect(a.dataAndamento).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe('dedup semantics — processo_andamentos UNIQUE(processo_id, provider, external_id)', () => {
  it('second sync with same external_ids inserts zero rows', async () => {
    const provider = new FakeProvider();
    const store = { andamentos: [] as UpsertedRow[] };
    const client = makeStubClient(store);

    async function runOnce(): Promise<number> {
      const andamentos: TribunalAndamento[] = await provider.fetchAndamentos('NUM-1');
      const rows: UpsertedRow[] = andamentos.map((a) => ({
        tenant_id: 't1',
        processo_id: 'p1',
        external_id: a.externalId,
        provider: provider.name,
        descricao: a.descricao,
      }));
      const { count } = await client.from('processo_andamentos').upsert(rows);
      return (count as number) ?? 0;
    }

    const first = await runOnce();
    const second = await runOnce();

    expect(first).toBe(3);
    expect(second).toBe(0);
    expect(store.andamentos).toHaveLength(3);
  });
});

describe('EscavadorProvider configuration gate', () => {
  it('throws ProviderNotConfiguredError when API key is missing', () => {
    const prev = process.env.ESCAVADOR_API_KEY;
    delete process.env.ESCAVADOR_API_KEY;
    try {
      expect(() => new EscavadorProvider()).toThrow(ProviderNotConfiguredError);
    } finally {
      if (prev) process.env.ESCAVADOR_API_KEY = prev;
    }
  });

  it('accepts an explicit API key without env var', () => {
    const prev = process.env.ESCAVADOR_API_KEY;
    delete process.env.ESCAVADOR_API_KEY;
    try {
      const provider = new EscavadorProvider('test-key-123');
      expect(provider.name).toBe('escavador');
    } finally {
      if (prev) process.env.ESCAVADOR_API_KEY = prev;
    }
  });
});
