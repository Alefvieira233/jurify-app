## 2026-07-25 - Unauthorized administrative access in Edge Functions
**Vulnerability:** Several internal Supabase Edge Functions (`analyze-whatsapp-sentiment`, `transcribe-whatsapp-audio`, and `google-calendar` service methods) were publicly accessible without authorization checks.
**Learning:** Functions intended for internal use via `supabase.functions.invoke` are not automatically protected by the platform and must explicitly verify the `Authorization` header.
**Prevention:** Always implement `isServiceRole(req)` validation for internal-only Edge Functions or administrative methods.

## 2026-07-25 - Tabnabbing in Auth Forms
**Vulnerability:** External links (`target="_blank"`) in `RegisterForm.tsx` and `LoginForm.tsx` were missing `rel="noopener noreferrer"`.
**Learning:** Regressions can occur in frequently modified UI components like authentication forms.
**Prevention:** Standardize external links to always include security attributes and include them in UI component audits.
