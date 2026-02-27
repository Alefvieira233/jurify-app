## 2024-03-21 - PII State Management Bug in Multi-Agent Sanitization
**Vulnerability:** Inconsistent PII rehydration leading to data loss or malformed responses.
**Learning:** When sanitizing multiple parts of an LLM request (prompt, context, system prompt) independently, using separate SanitizerEngine instances (or resetting them) prevents the rehydration step from finding PII tokens that were generated in earlier sanitization passes. This is because the lookup map for the final pass only contains tokens from that specific pass.
**Prevention:** Use a single SanitizerEngine instance with cumulative sanitization (do not reset internal maps) across all parts of a single LLM request to ensure all tokens are captured in the final lookup map used for rehydration.
