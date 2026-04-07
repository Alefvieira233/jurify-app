/**
 * Google Calendar Edge Function — Sync Completo
 *
 * Operações:
 * - listEvents: Listar eventos em período
 * - createEvent: Criar evento
 * - updateEvent: Atualizar evento
 * - deleteEvent: Deletar evento
 * - syncEvents: Sync bidirecional
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { applyRateLimit } from '../_shared/rate-limiter.ts'
import { GoogleOAuthService } from './google-oauth.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin') || undefined)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const rateLimitCheck = await applyRateLimit(req, {
        maxRequests: 20,
        windowSeconds: 60,
        namespace: "google-calendar",
    }, { user, corsHeaders });

    if (!rateLimitCheck.allowed) {
        return rateLimitCheck.response;
    }

    const body = await req.json()
    const method = body.action || body.method
    const data = body.data

    const ALLOWED_METHODS = [
      'listEvents',
      'createEvent',
      'updateEvent',
      'deleteEvent',
      'syncEvents',
      'exchange_code',
      'refresh_token',
      'listCalendars',
      'revokeTokens'
    ]
    if (!ALLOWED_METHODS.includes(method)) {
      return new Response(
        JSON.stringify({ error: 'Invalid method' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const googleService = new GoogleOAuthService(supabase, user.id)

    switch (method) {
      case 'listEvents': {
        const { calendarId = 'primary', timeMin, timeMax } = data
        const events = await googleService.listEvents(calendarId, timeMin, timeMax)
        return new Response(JSON.stringify({ events }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'createEvent': {
        const { calendarId = 'primary', eventData } = data
        const event = await googleService.createEvent(calendarId, eventData)
        return new Response(JSON.stringify({ event }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'updateEvent': {
        const { calendarId = 'primary', eventId, eventData } = data
        const event = await googleService.updateEvent(calendarId, eventId, eventData)
        return new Response(JSON.stringify({ event }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'deleteEvent': {
        const { calendarId = 'primary', eventId } = data
        await googleService.deleteEvent(calendarId, eventId)
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'syncEvents': {
        const { agendamentoId, googleEventId, action } = data

        await supabase.from('google_calendar_sync_logs').insert({
          user_id: user.id,
          agendamento_id: agendamentoId,
          google_event_id: googleEventId,
          action,
          status: 'success',
        })

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'exchange_code': {
        const { code, redirect_uri } = body
        const tokens = await googleService.exchangeCode(code, redirect_uri)

        // SECURITY: Never return refresh_token to the client
        // @ts-ignore: We want to exclude it
        const { refresh_token, ...safeTokens } = tokens

        return new Response(JSON.stringify(safeTokens), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'refresh_token': {
        const { refresh_token } = body
        const tokens = await googleService.refreshToken(refresh_token)

        // SECURITY: Never return refresh_token to the client
        // @ts-ignore: We want to exclude it
        const { refresh_token: _, ...safeTokens } = tokens

        return new Response(JSON.stringify(safeTokens), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'listCalendars': {
        const calendars = await googleService.listCalendars()
        return new Response(JSON.stringify({ calendars }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'revokeTokens': {
        await googleService.revokeTokens()
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        throw new Error(`Method ${method} not supported`)
    }
  } catch (error) {
    console.error('Google Calendar error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin') || undefined), 'Content-Type': 'application/json' }
      }
    )
  }
})
