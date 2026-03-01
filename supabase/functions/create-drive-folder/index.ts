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

    const { name, lead_id, agendamento_id } = await req.json()

    const { data: token } = await supabase
      .from('google_calendar_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single()

    if (!token) throw new Error('Google not connected')

    const mainFolder = await createDriveFolder(token.access_token, name)

    const subfolders = ['Documentos', 'Audiências', 'Contratos', 'Anexos']
    const createdFolders = []

    for (const subfolder of subfolders) {
      const folder = await createDriveFolder(
        token.access_token,
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
        status: 400,
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
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  const detail = await detailResponse.json()
  return { ...folder, webViewLink: detail.webViewLink }
}
