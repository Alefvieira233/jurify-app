// ============================================
// 🎯 AUTO-QUALIFICATION: Analyze conversation to qualify leads
// ============================================
export interface QualificationResult {
  suggestedStatus: string;
  extractedName: string | null;
  extractedArea: string | null;
  extractedUrgency: 'alta' | 'media' | 'baixa' | null;
  temperature: 'hot' | 'warm' | 'cold';
  leadScore: number;
}

export function analyzeQualification(
  messages: Array<{ sender: string; content: string }>,
  currentStatus: string,
  _aiResponseText: string
): QualificationResult {
  const leadMessages = messages.filter(m => m.sender === 'lead').map(m => m.content.toLowerCase());
  const allText = leadMessages.join(' ');

  // Extract name (look for patterns like "meu nome é X", "sou X", "me chamo X")
  let extractedName: string | null = null;
  const namePatterns = [
    /meu nome (?:é|e)\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i,
    /(?:sou|me chamo)\s+(?:o|a)?\s*([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/i,
  ];
  for (const pattern of namePatterns) {
    for (const msg of messages.filter(m => m.sender === 'lead')) {
      const match = msg.content.match(pattern);
      if (match?.[1] && match[1].length > 2) {
        extractedName = match[1].trim();
        break;
      }
    }
    if (extractedName) break;
  }

  // Extract legal area
  const areaMap: Record<string, string> = {
    'trabalhist': 'Trabalhista',
    'familia': 'Família', 'divorcio': 'Família', 'divórcio': 'Família',
    'pensao': 'Família', 'pensão': 'Família', 'guarda': 'Família',
    'consumidor': 'Consumidor',
    'criminal': 'Criminal', 'penal': 'Criminal',
    'tributar': 'Tributário', 'imposto': 'Tributário',
    'imovel': 'Imobiliário', 'imóvel': 'Imobiliário', 'imobiliar': 'Imobiliário',
    'contrato': 'Contratual', 'contrat': 'Contratual',
    'previden': 'Previdenciário', 'inss': 'Previdenciário', 'aposentad': 'Previdenciário',
    'empresarial': 'Empresarial', 'societar': 'Empresarial',
    'civel': 'Cível', 'cível': 'Cível',
    'acidente': 'Cível', 'indeniza': 'Cível',
  };
  let extractedArea: string | null = null;
  for (const [keyword, area] of Object.entries(areaMap)) {
    if (allText.includes(keyword)) {
      extractedArea = area;
      break;
    }
  }

  // Detect urgency
  const urgencyHigh = ['urgente', 'urgência', 'hoje', 'amanhã', 'prazo', 'audiência amanhã', 'preso', 'liminar', 'emergência', 'socorro'];
  const urgencyMed = ['preciso', 'importante', 'rápido', 'logo', 'breve'];
  let extractedUrgency: 'alta' | 'media' | 'baixa' | null = null;
  if (urgencyHigh.some(u => allText.includes(u))) extractedUrgency = 'alta';
  else if (urgencyMed.some(u => allText.includes(u))) extractedUrgency = 'media';
  else if (leadMessages.length >= 3) extractedUrgency = 'baixa';

  // Determine temperature
  let temperature: 'hot' | 'warm' | 'cold' = 'cold';
  if (extractedUrgency === 'alta' || (extractedName && extractedArea)) temperature = 'hot';
  else if (extractedArea || extractedUrgency === 'media') temperature = 'warm';

  // Determine suggested status respecting DB state machine transitions:
  // novo → [em_contato, qualificado, perdido]
  // em_contato → [qualificado, proposta, perdido]
  // qualificado → [proposta, perdido, em_contato]
  // proposta → [negociacao, ganho, perdido, qualificado]
  let suggestedStatus = currentStatus;
  const messageCount = leadMessages.length;

  if (currentStatus === 'novo') {
    // First contact → em_contato (respects state machine)
    if (messageCount >= 1) suggestedStatus = 'em_contato';
    // If already has qualifying data → qualificado (also valid from novo)
    if (messageCount >= 2 && (extractedName || extractedArea)) suggestedStatus = 'qualificado';
  } else if (currentStatus === 'em_contato') {
    // Has some data → qualificado
    if (extractedName || extractedArea) suggestedStatus = 'qualificado';
    // Has both → proposta (valid from em_contato)
    if (extractedName && extractedArea) suggestedStatus = 'proposta';
  } else if (currentStatus === 'qualificado') {
    // Name AND area → proposta (valid from qualificado)
    if (extractedName && extractedArea) suggestedStatus = 'proposta';
  }

  // Don't downgrade status (never go backwards in pipeline)
  const statusOrder = ['novo', 'em_contato', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
  const currentIdx = statusOrder.indexOf(currentStatus);
  const suggestedIdx = statusOrder.indexOf(suggestedStatus);
  if (suggestedIdx < currentIdx) suggestedStatus = currentStatus;

  // Lead score (0-100) — multi-factor scoring
  let leadScore = 0;
  // Factor 1: Engagement (up to 30 points)
  leadScore += Math.min(messageCount * 5, 30);
  // Factor 2: Data completeness (up to 25 points)
  if (extractedName) leadScore += 10;
  if (extractedArea) leadScore += 10;
  if (extractedUrgency) leadScore += 5;
  // Factor 3: Pipeline advancement (up to 25 points)
  const stagePoints: Record<string, number> = { novo: 0, em_contato: 5, qualificado: 10, proposta: 15, negociacao: 20, ganho: 25 };
  leadScore += stagePoints[suggestedStatus] ?? 0;
  // Factor 4: Urgency (up to 20 points)
  if (extractedUrgency === 'alta') leadScore += 20;
  else if (extractedUrgency === 'media') leadScore += 10;
  else if (messageCount >= 3) leadScore += 5;
  // Cap at 100
  leadScore = Math.min(leadScore, 100);

  return { suggestedStatus, extractedName, extractedArea, extractedUrgency, temperature, leadScore };
}
