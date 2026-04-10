/**
 * Google Drive Folder Creation Edge Function
 *
 * Cria pasta estruturada para cada caso/agendamento:
 * /Clientes/[Nome Cliente]/[Tipo Caso] - [Data]/
 *   - Documentos
 *   - Audiências
 *   - Contratos
 *   - Anexos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { applyRateLimit } from '../_shared/rate-limiter.ts'
import { decrypt, encrypt } from '../_shared/crypto.ts'

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
        maxRequests: 10,
        windowSeconds: 60,
        namespace: "create-drive-folder",
    }, { user, corsHeaders });

    if (!rateLimitCheck.allowed) {
        return rateLimitCheck.response;
    }

    const { name, lead_id, agendamento_id } = await req.json()

    const { data: tokenRow } = await supabase
      .from('google_calendar_tokens')
      .select('access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tokenRow || !tokenRow.access_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Integration not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt stored token; refresh if expired.
    let accessToken = await decrypt(tokenRow.access_token_encrypted)
    const now = new Date()
    const expiresAt = new Date(tokenRow.expires_at)

    if (now >= expiresAt) {
      if (!tokenRow.refresh_token_encrypted) {
        throw new Error('Google access token expired and no refresh token available — user must reconnect')
      }
      const refreshToken = await decrypt(tokenRow.refresh_token_encrypted)
      const refreshResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })
      if (!refreshResp.ok) {
        throw new Error('Failed to refresh Google token')
      }
      const refreshed = await refreshResp.json()
      accessToken = refreshed.access_token
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token_encrypted: await encrypt(refreshed.access_token),
          expires_at: newExpiresAt,
        })
        .eq('user_id', user.id)
    }

    const mainFolder = await createDriveFolder(accessToken, name)

    const subfolders = ['Documentos', 'Audiências', 'Contratos', 'Anexos']
    const createdFolders = []

    for (const subfolder of subfolders) {
      const folder = await createDriveFolder(
        accessToken,
        subfolder,
        mainFolder.id
      )
      createdFolders.push(folder)
    }

    await supabase.from('drive_folders').insert({
      lead_id,
      agendamento_id,
      folder_id: mainFolder.id,
      folder_url: mainFolder.webViewLink,
      subfolders: createdFolders.map(f => ({
        id: f.id,
        name: f.name,
        url: f.webViewLink
      })),
      created_by: user.id,
    })

    return new Response(JSON.stringify({
      success: true,
      folder: mainFolder,
      subfolders: createdFolders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Drive folder error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin') || undefined), 'Content-Type': 'application/json' }
      }
    )
  }
})

async function createDriveFolder(accessToken: string, name: string, parentId?: string) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined,
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
      signal: AbortSignal.timeout(15_000),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Error creating folder: ${error.error?.message || 'Unknown'}`)
  }

  const folder = await response.json()

  const detailResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folder.id}?fields=webViewLink`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    }
  )

  const detail = await detailResponse.json()
  return { ...folder, webViewLink: detail.webViewLink }
}
