# ADR-007: Kapso API for WhatsApp integration

**Status:** Accepted
**Date:** 2026-03
**Supersedes:** Evolution API (removed 2026-03-25)

## Context

WhatsApp integration is critical for law firm client communication. We initially used the Evolution API but migrated to Kapso due to:

- Evolution API required self-hosted infrastructure
- Connection instability (QR code re-scanning needed frequently)
- Limited official Meta API support

## Decision

Migrate to **Kapso Platform API** which provides:
- Meta Embedded Signup (no QR code needed)
- Managed infrastructure (no self-hosting)
- Official WhatsApp Business API compliance
- Webhook-based message delivery

Key implementation:
- `kapso-manager` Edge Function handles all API interactions (v2.0, Evolution code removed)
- Setup wizard uses Meta Embedded Signup flow (not QR code)
- `WhatsAppKapsoSetup.tsx` guides users through connection setup
- Webhook receives messages at `whatsapp-webhook` Edge Function (no JWT, signature-verified)
- AI integration via `WhatsAppIA.tsx` for automated responses

Setup link body: `{ "setup_link": {} }` (confirmed by Kapso docs)

## Consequences

**Positive:**
- No self-hosted infrastructure to maintain
- Official Meta compliance (less risk of bans)
- Stable connections without QR code re-scanning
- Simpler setup flow for end users

**Negative:**
- Vendor dependency on Kapso platform
- API costs per message
- Less control over connection management
- Must handle Kapso-specific webhook format

**Migration artifacts removed:**
- `QRCodeWizard.tsx` and `ConnectionTypeChooser.tsx` deleted
- All Evolution API endpoints removed from `kapso-manager`
