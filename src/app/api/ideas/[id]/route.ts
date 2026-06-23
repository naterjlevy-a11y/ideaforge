import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SectionType } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch idea (owner or public)
  const { data: idea, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (idea.visibility === 'private' && idea.user_id !== user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch sections, questions, and latest flowchart in parallel
  const [sectionsRes, questionsRes, flowchartRes] = await Promise.all([
    supabase.from('trd_sections').select('*').eq('idea_id', id),
    supabase.from('questions').select('*').eq('idea_id', id).order('created_at', { ascending: false }),
    supabase.from('flowcharts').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ])

  const sections: Partial<Record<SectionType, unknown>> = {}
  for (const s of sectionsRes.data ?? []) {
    sections[s.type as SectionType] = s
  }

  const unanswered = (questionsRes.data ?? []).filter((q) => !q.answer_text && !q.auto_assumed)

  return NextResponse.json({
    ...idea,
    sections,
    latest_flowchart: flowchartRes.data?.[0] ?? null,
    unanswered_questions: unanswered,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['status', 'visibility']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (body.status === 'paused') updates.paused_at = new Date().toISOString()
  if (body.status === 'running') updates.paused_at = null

  const { data, error } = await supabase
    .from('ideas')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('ideas')
    .update({ deleted_at: new Date().toISOString(), status: 'failed' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
