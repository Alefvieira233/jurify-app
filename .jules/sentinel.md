# Sentinel's Security Journal 🛡️

## 2025-05-15 - PII Leakage in AI Interaction Logs and Weak Randomness
**Vulnerability:** AI interaction logs ('agent_ai_logs' table) were storing raw user prompts and AI responses, which frequently contain sensitive Brazilian PII (CPF, RG, CNPJ, OAB). Additionally, security-critical identifiers (execution IDs, token IDs) were being generated using 'Math.random()', which is cryptographically insecure and predictable.

**Learning:** While the application had 'redactPII' and 'SanitizerEngine' utilities, they were not consistently applied to internal persistence layers (logs). Security-critical IDs must always use 'crypto.getRandomValues()' to prevent collision or predictability attacks, especially in multi-tenant SaaS environments.

**Prevention:**
1. Centralize PII redaction patterns in '_shared/security.ts' and ensure they are applied to all persistent logs of AI interactions.
2. Mandate the use of 'crypto.getRandomValues()' for any ID generation that serves as a security boundary or lookup key.
3. Synchronize redaction patterns between frontend and backend to ensure consistent data protection across the entire data flow.
