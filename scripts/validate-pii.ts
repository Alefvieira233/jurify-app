import { redactPII } from '../supabase/functions/_shared/security.ts';

const testCases = [
  {
    name: 'CPF',
    input: 'O CPF do cliente é 123.456.789-00',
    expected: /O CPF do cliente é \*\*\*CPF\*\*\*/,
  },
  {
    name: 'RG',
    input: 'O RG é 12.345.678-9',
    expected: /O RG é \*\*\*RG\*\*\*/,
  },
  {
    name: 'OAB',
    input: 'Advogado OAB/SP 123456',
    expected: /Advogado \*\*\*OAB\*\*\*/,
  },
  {
    name: 'Email',
    input: 'Contato: teste@exemplo.com.br',
    expected: /Contato: \*\*\*EMAIL\*\*\*/,
  },
  {
    name: 'Phone',
    input: 'Telefone: (11) 98765-4321',
    expected: /Telefone: \*\*\*PHONE\*\*\*/,
  },
];

console.log('--- PII Redaction Validation ---');
let passed = 0;

for (const test of testCases) {
  const result = redactPII(test.input);
  if (test.expected.test(result)) {
    console.log(`✅ ${test.name}: PASSED`);
    passed++;
  } else {
    console.log(`❌ ${test.name}: FAILED`);
    console.log(`   Input:    ${test.input}`);
    console.log(`   Output:   ${result}`);
    console.log(`   Expected: ${test.expected}`);
  }
}

console.log(`\nResults: ${passed}/${testCases.length} passed`);
process.exit(passed === testCases.length ? 0 : 1);
