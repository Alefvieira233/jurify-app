/**
 * Escavador provider — https://api.escavador.com/api/v2
 *
 * Docs: https://api.escavador.com/docs (public).
 * Uses the v2 movimentacoes endpoint for the given CNJ number.
 *
 * Auth: Bearer token (ESCAVADOR_API_KEY env var).
 *
 * Behaviour:
 *   - 404 → empty array (processo not indexed).
 *   - 401/403 → throws ProviderNotConfiguredError (bad key).
 *   - 5xx / network → propagates so caller can retry.
 */

import {
  ProviderNotConfiguredError,
  type AndamentoTipo,
  type TribunalAndamento,
  type TribunalProvider,
} from "./types.ts";

const ESCAVADOR_BASE = "https://api.escavador.com/api/v2";

interface EscavadorMovimentacao {
  id?: number | string;
  data?: string;
  data_movimentacao?: string;
  conteudo?: string;
  descricao?: string;
  tipo?: string;
  orgao_julgador?: { nome?: string } | string | null;
}

interface EscavadorResponse {
  items?: EscavadorMovimentacao[];
  data?: EscavadorMovimentacao[];
}

/** Strip non-digits from CNJ — Escavador accepts both but digits-only is safest. */
function normalizeCnj(numero: string): string {
  return numero.replace(/\D/g, "");
}

function mapTipo(raw: string | undefined): AndamentoTipo {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (lower.includes("senten")) return "sentenca";
  if (lower.includes("decis")) return "decisao";
  if (lower.includes("despacho")) return "despacho";
  if (lower.includes("audi")) return "audiencia";
  if (lower.includes("movimento") || lower.includes("movimenta")) {
    return "movimento";
  }
  return "other";
}

function extractOrgao(raw: EscavadorMovimentacao["orgao_julgador"]): string | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") return raw;
  return raw.nome ?? undefined;
}

function toAndamento(m: EscavadorMovimentacao): TribunalAndamento | null {
  const dataRaw = m.data_movimentacao ?? m.data;
  if (!dataRaw) return null;

  // Normalize to ISO — Escavador returns ISO-ish strings already.
  const iso = new Date(dataRaw).toISOString();
  const descricao = (m.conteudo ?? m.descricao ?? "").trim();
  if (!descricao) return null;

  const externalId = m.id != null
    ? String(m.id)
    // Fallback: composite key from data + hash-ish descricao (first 40 chars).
    // Guarantees stable dedup when provider does not expose a primary id.
    : `${iso}:${descricao.slice(0, 40)}`;

  return {
    externalId,
    dataAndamento: iso,
    tipo: mapTipo(m.tipo),
    descricao,
    orgao: extractOrgao(m.orgao_julgador),
    raw: m,
  };
}

export class EscavadorProvider implements TribunalProvider {
  readonly name = "escavador";
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? Deno.env.get("ESCAVADOR_API_KEY") ?? "";
    if (!key) {
      throw new ProviderNotConfiguredError(this.name, "ESCAVADOR_API_KEY");
    }
    this.apiKey = key;
  }

  async fetchAndamentos(
    numeroProcesso: string,
    _since?: string,
  ): Promise<TribunalAndamento[]> {
    const cnj = normalizeCnj(numeroProcesso);
    if (!cnj) return [];

    const url = `${ESCAVADOR_BASE}/processos/numero_cnj/${cnj}/movimentacoes`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json",
        "X-Requested-With": "jurify-tribunal-sync",
      },
    });

    // Processo not indexed or not found — not an error, just empty.
    if (res.status === 404) return [];

    // Bad credentials → configuration problem, not a transient error.
    if (res.status === 401 || res.status === 403) {
      throw new ProviderNotConfiguredError(
        this.name,
        `invalid API key (HTTP ${res.status})`,
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Escavador fetch failed: HTTP ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
      );
    }

    const json = (await res.json()) as EscavadorResponse;
    const rows = json.items ?? json.data ?? [];

    const andamentos: TribunalAndamento[] = [];
    for (const row of rows) {
      const mapped = toAndamento(row);
      if (mapped) andamentos.push(mapped);
    }
    return andamentos;
  }
}
