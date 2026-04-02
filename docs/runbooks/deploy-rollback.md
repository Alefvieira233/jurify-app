# Deploy Rollback

## When to Rollback
- Critical bug discovered post-deploy (blank pages, auth broken, data corruption)
- Error rate spike detected in Sentry within minutes of deploy
- Users reporting inability to use core features

## Frontend Rollback (Vercel)

1. Open Vercel Dashboard > Project > Deployments.
2. Find the last known-good deployment (before the bad one).
3. Click the three-dot menu > "Promote to Production".
4. Verify the rollback: visit the production URL and test core flows.

## Edge Functions Rollback

1. Identify the last good git tag or commit hash.
2. Check out that commit: `git checkout <commit-hash>`.
3. Redeploy affected functions: `supabase functions deploy <function-name>`.
4. Return to main branch: `git checkout main`.

## Database Migration Rollback

1. Identify the migration that caused the issue in `supabase/migrations/`.
2. Write a manual reversal SQL script (DROP added columns, restore removed ones).
3. Execute via Supabase Dashboard > SQL Editor (test on staging first if possible).
4. Remove or rename the bad migration file to prevent re-application.

## Post-Rollback Verification

1. Confirm the production URL loads correctly.
2. Test auth flow (login, signup, logout).
3. Test the feature area affected by the bad deploy.
4. Check Sentry for new errors after rollback.
5. Notify the team about the rollback and root cause.
