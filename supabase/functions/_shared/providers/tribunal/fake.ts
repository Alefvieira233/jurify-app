/**
 * Fake tribunal provider — deterministic mock for local dev and tests.
 *
 * Activate by setting TRIBUNAL_PROVIDER=fake or by using the factory
 * in environments without ESCAVADOR_API_KEY. Returns 3 andamentos
 * referring to the requested processo number so the timeline renders.
 */

import type { TribunalAndamento, TribunalProvider } from "./types.ts";

export class FakeProvider implements TribunalProvider {
  readonly name = "fake";

  // deno-lint-ignore require-await
  async fetchAndamentos(
    numeroProcesso: string,
    _since?: string,
  ): Promise<TribunalAndamento[]> {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const base: TribunalAndamento[] = [
      {
        externalId: `fake-${numeroProcesso}-1`,
        dataAndamento: new Date(now - 1 * day).toISOString(),
        tipo: "movimento",
        descricao: "Conclusos para despacho",
        orgao: "2ª Vara Cível",
        raw: { source: "fake", processo: numeroProcesso },
      },
      {
        externalId: `fake-${numeroProcesso}-2`,
        dataAndamento: new Date(now - 5 * day).toISOString(),
        tipo: "despacho",
        descricao: "Intimem-se as partes para especificarem provas",
        orgao: "2ª Vara Cível",
        raw: { source: "fake", processo: numeroProcesso },
      },
      {
        externalId: `fake-${numeroProcesso}-3`,
        dataAndamento: new Date(now - 14 * day).toISOString(),
        tipo: "audiencia",
        descricao: "Audiência de conciliação designada",
        orgao: "CEJUSC",
        raw: { source: "fake", processo: numeroProcesso },
      },
    ];

    return base;
  }
}
