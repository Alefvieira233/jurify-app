# WhatsApp Webhook Failing

## Symptoms
- New WhatsApp messages not appearing in the conversation list
- Outbound messages send but inbound stops arriving
- Kapso dashboard shows webhook delivery failures

## Diagnosis

1. Open Kapso dashboard and check webhook delivery logs for HTTP errors.
2. Check Supabase Edge Function logs for `whatsapp-webhook` invocations.
3. Verify HMAC signature validation is not rejecting requests (look for 401/403).
4. Check rate limiter state: 429 responses indicate throttling.
5. Test the webhook endpoint manually with a curl POST.

## Common Causes
- **Secret rotated**: Kapso webhook signing secret changed but not updated in Supabase.
- **Rate limit hit**: Burst of messages triggered the rate limiter.
- **Edge Function cold start**: First invocation after idle period timed out.
- **RLS policy change**: New migration broke insert permissions for webhook service role.

## Resolution

1. **Secret mismatch**: Update the webhook secret in Supabase Dashboard > Edge Functions > Secrets.
2. **Rate limit**: Check `_shared/rate-limiter.ts` thresholds; temporarily increase if needed.
3. **Cold start timeout**: Redeploy the function (`supabase functions deploy whatsapp-webhook`).
4. **RLS issue**: Check recent migrations, revert if needed, verify service role bypass.
5. After fix: send a test message from WhatsApp and confirm it appears in-app.
