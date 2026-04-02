# Supabase Down

## Symptoms
- Blank pages or infinite loading spinners
- 503/502 errors in browser console
- React Query queries stuck in `loading` or `error` state

## Diagnosis

1. Check [status.supabase.com](https://status.supabase.com) for platform-wide incidents.
2. Open Supabase Dashboard > Edge Functions > Logs for function-level errors.
3. Verify environment secrets are still valid (Settings > API > Project API keys).
4. Check if RLS policies were recently modified (`supabase/migrations/`).
5. Test direct API call: `curl https://yfxgncbopvnsltjqetxw.supabase.co/rest/v1/ -H "apikey: <anon_key>"`.

## Mitigation
- React Query cache serves stale data while Supabase is unreachable.
- Users see "connection lost" indicators via query error states.
- No writes are possible; inform users to retry later.

## Resolution

1. If Supabase platform outage: wait for resolution, monitor status page.
2. If secrets rotated: update `VITE_SUPABASE_ANON_KEY` in Vercel and redeploy.
3. If RLS policy broke access: revert the migration (see [deploy-rollback](deploy-rollback.md)).
4. If Edge Function crash: check logs, fix, redeploy with `supabase functions deploy <name>`.
5. Verify recovery: confirm queries resolve and data loads in the app.
