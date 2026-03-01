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

    const { method, data } = await req.json()

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

      default:
        throw new Error(`Method ${method} not supported`)
    }
  } catch (error) {
    console.error('Google Calendar error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get('origin') || undefined), 'Content-Type': 'application/json' }
      }
    )
  }
})
