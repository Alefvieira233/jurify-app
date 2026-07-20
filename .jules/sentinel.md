# Sentinel's Security Journal 🛡️

## 2026-05-25 - Custom Audit Header Parsing and Test Credentials False Positives
**Vulnerability:** Custom security verification scripts using static/indexed selectors (such as `.headers[0]`) on configuration files like `vercel.json` introduced false negative gaps and false positive test suite interruptions.
**Learning:**
1. Evaluating only the first configuration block ignored actual production headers on general route definitions (`/(.*)`).
2. Failure to exclude mock secrets (such as dummy testing JWT keys in test setup files) broke CI/CD pipelines under stricter auditing tools.
**Prevention:**
1. Always parse multi-block configurations comprehensively using functional traversal methods like `.flatMap()` or general-purpose schema validators.
2. Maintain clean separation between runtime source code scanning and test-related dummy artifacts by explicitly excluding designated test directories (`**/tests/**` or `setup.ts`) in non-test static analyses.
