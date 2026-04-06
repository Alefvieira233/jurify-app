# Sentry Alerts Setup Guide

## Required Alerts for Production

Configure these in Sentry Dashboard (https://jurify-yw.sentry.io):

### 1. Error Spike Alert (CRITICAL)
- **Type:** Issue Alert
- **Condition:** Number of events > 10 in 5 minutes
- **Action:** Email + Slack notification
- **Priority:** Critical

### 2. New Issue in Production
- **Type:** Issue Alert  
- **Condition:** A new issue is created
- **Filter:** Environment = production
- **Action:** Email notification
- **Priority:** High

### 3. Slow Agent Response
- **Type:** Metric Alert
- **Condition:** Tag `alert.type` = `slow_response` occurs > 5 times in 10 minutes
- **Action:** Email notification
- **Priority:** Medium
- **Note:** Already instrumented via `reportSlowAgent()` in `src/lib/sentry.ts`

### 4. High Agent Failure Rate
- **Type:** Issue Alert
- **Condition:** Message contains "Agent failure rate" 
- **Action:** Email + Slack notification  
- **Priority:** High
- **Note:** Already instrumented via `reportHighAgentFailureRate()` in `src/lib/sentry.ts`

### 5. Performance Degradation
- **Type:** Metric Alert
- **Condition:** Transaction duration p95 > 5 seconds
- **Action:** Email notification
- **Priority:** Medium

### 6. Unhandled Promise Rejection Spike
- **Type:** Issue Alert
- **Condition:** Issue category = Error, count > 20 in 10 minutes
- **Action:** Email notification
- **Priority:** High

## Instrumentation Already in Place

The following are already configured in `src/lib/sentry.ts`:
- `captureAgentError()` — agent execution errors with full context
- `reportSlowAgent()` — agent response time > 10s threshold
- `reportHighAgentFailureRate()` — tenant failure rate > 5%
- `measurePerformance()` — slow operation warnings (> 3s)
- `beforeSend` filter — drops network errors and extension noise

## Environment Variables Required

```
VITE_SENTRY_DSN=<project DSN>
SENTRY_AUTH_TOKEN=<for source maps>
SENTRY_ORG=jurify-yw
SENTRY_PROJECT=javascript-react
```
