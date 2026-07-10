## 2026-05-25 - [CRITICAL] Implicit Trust in Internal Edge Functions
**Vulnerability:** Several internal Edge Functions (google-calendar, analyze-whatsapp-sentiment, transcribe-whatsapp-audio) lacked explicit `Authorization` header verification, relying on the assumption that they are only reachable via internal platform calls.
**Learning:** In a serverless/Edge Function architecture, "internal" endpoints can often be reached via direct HTTP calls if their URLs are discovered, unless they explicitly verify the caller's identity (e.g., via `isServiceRole(req)`).
**Prevention:** Always implement Zero Trust principles. Use `isServiceRole(req)` or similar utilities at the entry point of every Edge Function that performs administrative or background tasks, even if intended only for internal use.

## 2026-05-25 - PII Redaction Pattern Collision
**Vulnerability:** Brazilian RG patterns (9 digits) can collide with 9-digit mobile phone numbers, leading to incorrect redaction labeling.
**Learning:** Regex-based PII redaction requires strict ordering of patterns based on specificity and expected format (e.g., matching +55 prefixes or parenthesis for phones first).
**Prevention:** Prioritize more specific patterns (Card, Email, Phone with prefix) over general numeric patterns (RG, CPF) in the redaction array.
