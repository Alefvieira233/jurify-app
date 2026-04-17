/**
 * Tribunal provider factory.
 *
 * Selection order:
 *   1. TRIBUNAL_PROVIDER env var ('escavador' | 'codilo' | 'jusbrasil' | 'fake')
 *   2. Defaults to 'escavador' if ESCAVADOR_API_KEY is set
 *   3. Defaults to 'fake' otherwise (local dev / tests)
 *
 * Codilo / Jusbrasil: not implemented yet — throws if requested.
 * Extend by adding an adapter and a case below.
 */

import { EscavadorProvider } from "./escavador.ts";
import { FakeProvider } from "./fake.ts";
import type { TribunalProvider } from "./types.ts";

export type {
  AndamentoTipo,
  TribunalAndamento,
  TribunalProvider,
} from "./types.ts";
export { ProviderNotConfiguredError } from "./types.ts";
export { EscavadorProvider } from "./escavador.ts";
export { FakeProvider } from "./fake.ts";

function resolveDefaultProvider(): string {
  const configured = Deno.env.get("TRIBUNAL_PROVIDER");
  if (configured) return configured;
  return Deno.env.get("ESCAVADOR_API_KEY") ? "escavador" : "fake";
}

export function getTribunalProvider(explicit?: string): TribunalProvider {
  const name = (explicit ?? resolveDefaultProvider()).toLowerCase();
  switch (name) {
    case "escavador":
      return new EscavadorProvider();
    case "fake":
      return new FakeProvider();
    case "codilo":
    case "jusbrasil":
      throw new Error(`Tribunal provider '${name}' not implemented yet`);
    default:
      throw new Error(`Unknown tribunal provider: ${name}`);
  }
}
