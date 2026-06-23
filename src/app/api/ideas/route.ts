import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check concurrent running limit (max 3)
  const { count } = await supabase
    .from('ideas')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'running')
    .is('deleted_at', null)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'You have 3 running ideas. Pause or complete one first.' },
      { status: 429 }
    )
  }

  const body = await request.json()
  const { title, raw_input, duration_minutes = 180, visibility = 'private' } = body

  if (!title || title.length < 3 || title.length > 120) {
    return NextResponse.json({ error: 'Title must be 3–120 characters.' }, { status: 400 })
  }
  if (!raw_input || raw_input.length < 20 || raw_input.length > 2000) {
    return NextResponse.json({ error: 'Description must be 20–2000 characters.' }, { status: 400 })
  }
  if (duration_minutes < 60 || duration_minutes > 1440) {
    return NextResponse.json({ error: 'Duration must be 60–1440 minutes.' }, { status: 400 })
  }

  const intervalMin = 30
  const maxIterations = Math.floor(duration_minutes / intervalMin)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + duration_minutes * 60000)

  const { data: idea, error } = await supabase
    .from('ideas')
    .insert({
      user_id: user.id,
      title,
      raw_input,
      duration_minutes,
      visibility,
      status: 'running',
      iteration_count: 0,
      max_iterations: maxIterations,
      iteration_interval_min: intervalMin,
      next_expansion_at: now.toISOString(),
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Trigger first expansion immediately (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${appUrl}/api/ideas/${idea.id}/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {})

  return NextResponse.json(idea, { status: 201 })
}
