import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Called by cron-job.org every 30 minutes
// Header: Authorization: Bearer {CRON_SECRET}
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Find all ideas due for expansion
  const { data: ideas, error } = await supabase
    .from('ideas')
    .select('id')
    .eq('status', 'running')
    .lte('next_expansion_at', new Date().toISOString())
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!ideas || ideas.length === 0) {
    return NextResponse.json({ triggered: 0 })
  }

  // Fire expansion for each idea (non-blocking)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const fires = ideas.map((idea) =>
    fetch(`${appUrl}/api/ideas/${idea.id}/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  )

  // Fire all in parallel, don't wait
  Promise.all(fires).catch(() => {})

  return NextResponse.json({ triggered: ideas.length, idea_ids: ideas.map((i) => i.id) })
}
