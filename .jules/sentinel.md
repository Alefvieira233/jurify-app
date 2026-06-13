## 2026-02-11 - [Harden] Security Utility Gaps (Injection & PII)
**Vulnerability:** Documented gaps in prompt injection detection allowed 1→i homoglyph bypass and flexible "ignore instructions" variations. Additionally, critical Brazilian PII (CNPJ, OAB, Processo CNJ) was not redacted.
**Learning:** Security utilities sometimes carry "documented gaps" as technical debt. These gaps (like the 1→i homoglyph or short base64 payloads) can be easily exploited if they aren't proactively closed and their corresponding "gap" tests flipped to enforcement tests.
**Prevention:** Periodically audit security modules for comments starting with "documented gap" and upgrade them to active protections. Ensure PII patterns cover all locally relevant identifiers (Brazilian specific in this case).
