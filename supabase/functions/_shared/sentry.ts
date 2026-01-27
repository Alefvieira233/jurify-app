import * as Sentry from "https://esm.sh/@sentry/deno@7.114.0";

export const initSentry = () => {
    const dsn = Deno.env.get("SENTRY_DSN");

    if (!dsn) {
        console.warn("[Sentry] DSN not found. Skipping initialization.");
        return;
    }

    Sentry.init({
        dsn,
        tracesSampleRate: 1.0,
        environment: Deno.env.get("SUPABASE_DB_NAME") === "production" ? "production" : "development",
    });

    console.log("[Sentry] Initialized for Edge Function");
};

export const captureError = (error: unknown, context?: Record<string, unknown>) => {
    console.error("[Sentry] Capturing error:", error);
    Sentry.captureException(error, {
        extra: context,
    });
};
