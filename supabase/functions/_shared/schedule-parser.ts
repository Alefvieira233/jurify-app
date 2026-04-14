/**
 * Parser PT-BR de data/hora em texto livre para agendamento via WhatsApp.
 *
 * Entrada: "quero marcar uma reunião na quinta às 14h", "amanhã às 10", "15/03 às 9h30"
 * Saída: Date UTC ou null se não conseguir extrair confiavelmente.
 *
 * Assume timezone de São Paulo (UTC-3) para horários relativos.
 */

const WEEKDAYS: Record<string, number> = {
  domingo: 0, dom: 0,
  "segunda": 1, "segunda-feira": 1, seg: 1,
  "terça": 2, "terca": 2, "terça-feira": 2, "terca-feira": 2, ter: 2,
  "quarta": 3, "quarta-feira": 3, qua: 3,
  "quinta": 4, "quinta-feira": 4, qui: 4,
  "sexta": 5, "sexta-feira": 5, sex: 5,
  "sabado": 6, "sábado": 6, sab: 6,
};

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3

function nowInBRT(): Date {
  const now = new Date();
  return new Date(now.getTime() - BRT_OFFSET_MS);
}

function brtToUTC(brt: Date): Date {
  return new Date(brt.getTime() + BRT_OFFSET_MS);
}

function nextWeekday(from: Date, target: number): Date {
  const result = new Date(from);
  const diff = (target - result.getDay() + 7) % 7 || 7; // próxima ocorrência (nunca hoje)
  result.setDate(result.getDate() + diff);
  return result;
}

export const BUSINESS_HOUR_START = 8;
export const BUSINESS_HOUR_END = 20;

export type ValidationReason = "weekend" | "out_of_hours" | "past";

interface ParsedDateTime {
  dateTimeUTC: Date;
  /** Confiança 0-1 (baseado em quantas âncoras o texto tinha) */
  confidence: number;
  /** Trecho que gerou o parse, para debug/log */
  matched: string;
}

export interface ScheduleValidation {
  valid: boolean;
  reason?: ValidationReason;
  message?: string;
}

/**
 * Valida se um horário cai em janela comercial (seg-sex, 8h-20h BRT).
 * Retorna {valid:false, reason, message} com texto pronto pro lead.
 */
export function validateBusinessHours(dateTimeUTC: Date): ScheduleValidation {
  if (dateTimeUTC.getTime() < Date.now()) {
    return { valid: false, reason: "past", message: "Essa data já passou. Pode me indicar outra data no futuro?" };
  }
  const brt = new Date(dateTimeUTC.getTime() - BRT_OFFSET_MS);
  const day = brt.getDay();
  if (day === 0 || day === 6) {
    return {
      valid: false,
      reason: "weekend",
      message: "Nosso atendimento é de segunda a sexta. Qual dia útil fica melhor pra você?",
    };
  }
  const hour = brt.getHours();
  if (hour < BUSINESS_HOUR_START || hour >= BUSINESS_HOUR_END) {
    return {
      valid: false,
      reason: "out_of_hours",
      message: `Nosso horário é das ${BUSINESS_HOUR_START}h às ${BUSINESS_HOUR_END}h. Qual horário dentro dessa janela fica bom?`,
    };
  }
  return { valid: true };
}

/**
 * Extrai {hour, minute} do texto. Aceita: "14h", "14:00", "14h30", "às 9", "às 9 da manhã", "2 da tarde".
 * Retorna null se não encontrar.
 */
function parseTime(text: string): { hour: number; minute: number; matched: string } | null {
  // 14h30 / 14:30 / 14h
  const hm = text.match(/\b(\d{1,2})\s*(?::|h)\s*(\d{2})?\b/i);
  if (hm) {
    let h = parseInt(hm[1], 10);
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      // Ajuste "2 da tarde" -> 14
      const tardeNoite = /\b(?:da\s+)?(tarde|noite)\b/i.test(text);
      if (tardeNoite && h < 12) h += 12;
      return { hour: h, minute: m, matched: hm[0] };
    }
  }
  // "às 9 da manhã", "às 3 da tarde", "2 da tarde" (sem "às")
  const periodo = text.match(/(?:\b(?:às|as)\s+)?(\d{1,2})\s+(?:da\s+|de\s+)?(manhã|manha|tarde|noite)(?=\s|$|[.,!?])/i);
  if (periodo) {
    let h = parseInt(periodo[1], 10);
    const p = periodo[2].toLowerCase();
    if (p.startsWith("tarde") || p.startsWith("noite")) {
      if (h < 12) h += 12;
    }
    if (h >= 0 && h <= 23) return { hour: h, minute: 0, matched: periodo[0] };
  }
  return null;
}

/**
 * Extrai data do texto. Retorna Date em horário BRT (sem hora aplicada ainda).
 */
function parseDate(text: string, nowBRT: Date): { date: Date; matched: string } | null {
  const lower = text.toLowerCase();

  // "hoje"
  if (/\bhoje\b/.test(lower)) {
    return { date: new Date(nowBRT), matched: "hoje" };
  }
  // "depois de amanhã" (testa antes de "amanhã" para não colidir)
  if (/\bdepois\s+de\s+amanh[ãa](?=\s|$|[.,!?])/i.test(lower)) {
    const d = new Date(nowBRT);
    d.setDate(d.getDate() + 2);
    return { date: d, matched: "depois de amanhã" };
  }
  // "amanhã" / "amanha" — \b não funciona após 'ã' (regex ASCII), usar lookahead
  if (/\bamanh[ãa](?=\s|$|[.,!?])/i.test(lower)) {
    const d = new Date(nowBRT);
    d.setDate(d.getDate() + 1);
    return { date: d, matched: "amanhã" };
  }
  // Dia da semana: "na quinta", "próxima terça", "quinta-feira"
  for (const [name, num] of Object.entries(WEEKDAYS)) {
    // Usa lookahead em vez de \b final para suportar caracteres acentuados (ç, ã)
    const re = new RegExp(`\\b(?:na|no|pr[óo]xim[ao])?\\s*${name}(?=\\s|$|[.,!?-])`, "i");
    const match = text.match(re);
    if (match) {
      return { date: nextWeekday(nowBRT, num), matched: match[0].trim() };
    }
  }
  // Data explícita: "15/03", "15/03/2025", "15-03"
  const explicit = text.match(/\b(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b/);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = parseInt(explicit[2], 10) - 1;
    let year = explicit[3] ? parseInt(explicit[3], 10) : nowBRT.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      const d = new Date(year, month, day);
      // Se data já passou neste ano, avança um ano
      if (!explicit[3] && d.getTime() < nowBRT.getTime() - 86400000) {
        d.setFullYear(year + 1);
      }
      return { date: d, matched: explicit[0] };
    }
  }
  return null;
}

/**
 * Principal: extrai data+hora do texto do lead.
 * Retorna null se parse não encontrar âncoras suficientes ou gerar data passada.
 */
export function parseScheduleFromText(text: string): ParsedDateTime | null {
  if (!text || text.trim().length < 3) return null;

  const nowBRT = nowInBRT();
  const dateMatch = parseDate(text, nowBRT);
  const timeMatch = parseTime(text);

  if (!dateMatch && !timeMatch) return null;

  const baseDate = dateMatch ? dateMatch.date : new Date(nowBRT);
  const hour = timeMatch ? timeMatch.hour : 10; // default 10h se só data
  const minute = timeMatch ? timeMatch.minute : 0;

  const brt = new Date(baseDate);
  brt.setHours(hour, minute, 0, 0);

  const dateTimeUTC = brtToUTC(brt);

  // Rejeita datas no passado (com 15min de tolerância)
  if (dateTimeUTC.getTime() < Date.now() - 15 * 60 * 1000) return null;

  let confidence = 0;
  if (dateMatch) confidence += 0.5;
  if (timeMatch) confidence += 0.5;

  const matched = [dateMatch?.matched, timeMatch?.matched].filter(Boolean).join(" ");
  return { dateTimeUTC, confidence, matched };
}

/**
 * Detecta sinais de intenção de agendamento na mensagem do lead.
 * Mais amplo que o regex antigo — cobre casos proativos do lead.
 */
export function detectScheduleIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(agendar|marcar|agendamento|reuni[ãa]o|consulta|hor[áa]rio|atendimento|encontro|visita)\b/i.test(lower)
    || /\b(quero|gostaria|posso|podemos|pode)\s+.*\b(agendar|marcar|reuni[ãa]o|consulta|hor[áa]rio)\b/i.test(lower);
}

/**
 * Verifica conflito: busca agendamentos do mesmo responsável com overlap de ±slotMinutes.
 * Retorna true se há conflito.
 */
export async function hasScheduleConflict(
  supabase: { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { gte: (k: string, v: string) => { lte: (k: string, v: string) => Promise<{ data: unknown[] | null; error: unknown }> } } } } },
  tenantId: string,
  responsavel: string,
  dateTimeUTC: Date,
  slotMinutes = 60,
): Promise<boolean> {
  const windowMs = slotMinutes * 60 * 1000;
  const from = new Date(dateTimeUTC.getTime() - windowMs).toISOString();
  const to = new Date(dateTimeUTC.getTime() + windowMs).toISOString();

  const { data, error } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("tenant_id", tenantId)
    .gte("data_hora", from)
    .lte("data_hora", to);

  if (error) {
    console.error("[schedule-parser] conflict check error:", error);
    return false; // Fail open — não bloquear agendamento se query falhar
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Formata data em PT-BR para confirmação textual ao lead.
 * Ex: "quinta-feira, 15/03 às 14h00"
 */
export function formatScheduleForLead(dateTimeUTC: Date): string {
  const brt = new Date(dateTimeUTC.getTime() - BRT_OFFSET_MS);
  const weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  const wd = weekdays[brt.getDay()];
  const dd = String(brt.getDate()).padStart(2, "0");
  const mm = String(brt.getMonth() + 1).padStart(2, "0");
  const hh = String(brt.getHours()).padStart(2, "0");
  const mi = String(brt.getMinutes()).padStart(2, "0");
  return `${wd}, ${dd}/${mm} às ${hh}h${mi}`;
}
