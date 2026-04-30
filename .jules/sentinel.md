# Sentinel Security Journal

## 2026-04-17 - PII Leakage in AI Logs
**Vulnerability:** Personally Identifiable Information (PII) such as CPF, CNPJ, OAB, and legal process numbers were being logged in plaintext to the `agent_ai_logs` table.
**Learning:** Even if the database is secured with RLS, logging sensitive user data in plaintext creates unnecessary risk and may violate data protection regulations like LGPD. Truncation of logs (e.g., `substring(0, 500)`) is insufficient if the PII appears within the first few hundred characters.
**Prevention:** Apply robust PII redaction BEFORE truncation and database insertion. Synchronize PII patterns between frontend sanitizers and backend logging utilities. Handle edge cases like varying OAB formats (OAB/SP, OAB SP) and international phone prefixes (+55).
