# Sentinel's Security Journal 🛡️

## 2026-07-28 - Brazilian PII Redaction Overlap (CPF vs Phone Number)
**Vulnerability:** Exact 11-digit raw numbers are misclassified under LGPD. Brazil CPF and Brazilian mobile numbers with area code (DDD) are both 11 digits (e.g., `11999998888` vs `12345678900`). Unformatted CPF matchers steal phone numbers, leading to incorrect redaction labeling (e.g. labeling a mobile number as `***CPF***`).
**Learning:** Brazilian mobile numbers always use `9` as their third digit (the first digit of the local number). Raw CPF numbers can be safely matched by constraining the 11-digit regex to expect a non-nine digit at the third position (`(?<!\d)\d{2}[0-8]\d{8}(?!\d)`), cleanly separating unformatted phone numbers from raw CPF values without complex stateful validation.
**Prevention:** Always restrict raw 11-digit patterns in Brazilian context using `[0-8]` for the third digit to bypass mobile phone collision.
