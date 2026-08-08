# Sentinel Security Journal 🛡️

This journal documents critical security learnings and vulnerability patterns identified and remediated in the Jurify codebase.

## 2026-05-07 - Implicit Trust in Internal Edge Functions
**Vulnerability:** Edge Functions designed for internal backend orchestration (such as `analyze-whatsapp-sentiment` and `transcribe-whatsapp-audio`) were accessible over public HTTP requests without signature verification.
**Learning:** Assuming platform-level routing or network isolation is a dangerous fallacy. Standard client tokens are insufficient; direct backend-to-backend invocations must enforce strict, cryptographic service role validation at their entry points.
**Prevention:** Implement `isServiceRole(req)` validation checks at the very entry point of every sensitive internal-use-only Edge Function.

## 2026-05-15 - Redact-After-Truncate Logging Leak
**Vulnerability:** Personal Identifiable Information (PII) like CPFs and email addresses escaped diagnostic log redaction when strings were truncated before being passed to `redactPII`.
**Learning:** Truncating a string using `.substring()` before applying PII filters risks slicing active patterns (e.g., splitting a phone number or document identifier in half), causing regex engines to fail to recognize the pattern while still outputting the sensitive portion in logs.
**Prevention:** Always invoke `redactPII()` on full diagnostic strings *before* performing character-based truncation or slice operations for database logging and console output.

## 2026-06-10 - Overlapping Document and Phone Patterns in Security Redaction
**Vulnerability:** Raw CPF document patterns overlapped with Brazilian mobile numbers (which are also 11 digits long), causing incorrect label assignment during security redactions.
**Learning:** Without specific negative lookbehinds/lookaheads and pattern exclusion rules, overlapping numeric formats can corrupt diagnostic logs and produce incorrect labels.
**Prevention:** Refine the raw CPF regex pattern to explicitly ignore digit combinations that are valid mobile phone formats (such as mobile numbers starting with '9' as their third digit) to prevent mislabeling and overlap.
