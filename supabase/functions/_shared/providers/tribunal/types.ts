/**
 * Tribunal provider abstraction.
 *
 * Provider-agnostic interface for fetching processo movimentações (andamentos)
 * from external legal data providers (Escavador, Codilo, Jusbrasil, ...).
 *
 * Contract:
 *   - `fetchAndamentos(numero, since?)` returns normalized andamentos.
 *   - If the processo is not indexed by the provider (HTTP 404 or similar),
 *     implementations MUST return `[]` instead of throwing.
 *   - If the provider itself is misconfigured (missing API key, etc), throw
 *     {@link ProviderNotConfiguredError} — caller knows to skip this tenant.
 *   - Any other failure (5xx, network) should propagate; the caller wraps
 *     with exponential-backoff retry.
 */

export type AndamentoTipo =
  | "movimento"
  | "decisao"
  | "despacho"
  | "audiencia"
  | "sentenca"
  | "other";

export interface TribunalAndamento {
  /** Stable id at the provider — used for dedup via UNIQUE constraint. */
  externalId: string;
  /** ISO 8601 date-time of the andamento. */
  dataAndamento: string;
  tipo: AndamentoTipo;
  descricao: string;
  /** Ex: "2ª Vara Cível de São Paulo". Optional. */
  orgao?: string;
  /** Raw provider payload — kept for replay/debug (stored in JSONB). */
  raw: unknown;
}

export interface TribunalProvider {
  /** Stable provider name — persisted in processo_andamentos.provider. */
  readonly name: string;
  /**
   * Fetch andamentos for a given processo number.
   * @param numeroProcesso CNJ number (with or without punctuation — provider-normalized internally)
   * @param since ISO date — if present, only andamentos >= since (provider-side filter if supported)
   */
  fetchAndamentos(
    numeroProcesso: string,
    since?: string,
  ): Promise<TribunalAndamento[]>;
}

/**
 * Thrown when the selected provider lacks required configuration
 * (e.g. missing ESCAVADOR_API_KEY env var). The edge function catches
 * this and marks the processo with a setup-required error instead of
 * retrying forever.
 */
export class ProviderNotConfiguredError extends Error {
  readonly code = "PROVIDER_NOT_CONFIGURED";
  constructor(provider: string, missing: string) {
    super(`Tribunal provider '${provider}' not configured: missing ${missing}`);
    this.name = "ProviderNotConfiguredError";
  }
}
