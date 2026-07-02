const PII_PATTERNS = [
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}\b/g, label: "CNPJ", replacement: "***CNPJ***" },
  { pattern: /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g, label: "Processo", replacement: "***PROCESSO***" },
  { pattern: /\bOAB[\s\/\-]?(?:[A-Z]{2})?[\s\/\-]?\d{5,6}\b/gi, label: "OAB", replacement: "***OAB***" },
  { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, label: "Card", replacement: "***CARD***" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email", replacement: "***EMAIL***" },
  { pattern: /\b(?:Bearer|JWT|Token)\s+[a-zA-Z0-9._\-\/]{10,}/gi, label: "Token", replacement: "***TOKEN***" },
  { pattern: /\b(?:sk-|pk-|sbp|eyJ)[a-zA-Z0-9._\-\/]{10,}/g, label: "Token", replacement: "***TOKEN***" },
  { pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, label: "CPF", replacement: "***CPF***" },
  { pattern: /(?<!\d)(?:\+?55[\s.-]?)?\(?[1-9][1-9]\)?[\s.-]?(?:9\d{4}[\s.-]?\d{4}|[2-8]\d{3}[\s.-]?\d{4})(?!\d)/g, label: "Phone", replacement: "***PHONE***" },
  { pattern: /(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, label: "CPF", replacement: "***CPF***" },
  { pattern: /\b\d{2}\.?\d{3}\.?\d{3}-?[\dXx]\b/g, label: "RG", replacement: "***RG***" },
];

function redactPII(text) {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const tests = [
  ['CPF: 12345678900', 'CPF: ***CPF***'],
  ['Ligar para (11) 99999-8888', 'Ligar para ***PHONE***'],
  ['Tel: +55 21 4002-8922', 'Tel: ***PHONE***'],
  ['Número: 11988887777', 'Número: ***PHONE***'],
  ['Authorization: Bearer eyJhbGci...', 'Authorization: ***TOKEN***'],
  ['ApiKey: sk-abcdef1234567890', 'ApiKey: ***TOKEN***'],
  ['Advogado OAB/SP 123456', 'Advogado ***OAB***'],
  ['Processo: 0801234-12.2023.8.19.0001', 'Processo: ***PROCESSO***'],
];

tests.forEach(([input, expected]) => {
  const actual = redactPII(input);
  if (actual === expected) {
    console.log('PASS: ' + input);
  } else {
    console.log('FAIL: ' + input);
    console.log('  Expected: ' + expected);
    console.log('  Actual:   ' + actual);
  }
});
