## 2026-04-20 - Enhanced PII Redaction and Secure Randomness
**Vulnerability:** Insecure randomness (Math.random()) used for IDs and potential PII leakage in AI interaction logs.
**Learning:** Brazilian legal PII (OAB, CNJ, CPF, CNPJ) requires specific regex patterns for effective redaction. AI logs often capture full prompts which can contain these sensitive identifiers.
**Prevention:** Use crypto.randomUUID() for all generated identifiers. Always pass log fields through a centralized redactPII utility before truncation and storage, especially when dealing with LLM inputs/outputs.
