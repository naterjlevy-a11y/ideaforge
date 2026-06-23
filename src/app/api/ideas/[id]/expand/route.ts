import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { expandIdea } from '@/lib/ai/expand'
import type { IdeaWithSections, SectionType } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Use service client so this works both from user sessions and cron calls
  const supabase = await createServiceClient()

  // Verify ownership for user-triggered calls (cron bypasses via service key)
  const anonClient = await createClient()
  const { data: { user } } = await anonClient.auth.getUser()

  const { data: idea, error: ideaError } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (ideaError || !idea) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only owner can manually trigger expansion
  if (user && idea.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (idea.status === 'completed' || idea.status === 'failed') {
    return NextResponse.json({ error: 'Idea is not running.' }, { status: 400 })
  }

  if (idea.status === 'paused') {
    return NextResponse.json({ error: 'Idea is paused.' }, { status: 400 })
  }

  // Check if expired
  if (idea.expires_at && new Date(idea.expires_at) < new Date()) {
    await supabase.from('ideas').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ message: 'Idea duration complete.' })
  }

  // Fetch current state
  const [sectionsRes, questionsRes, flowchartRes] = await Promise.all([
    supabase.from('trd_sections').select('*').eq('idea_id', id),
    supabase.from('questions').select('*').eq('idea_id', id),
    supabase.from('flowcharts').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ])

  const sections: IdeaWithSections['sections'] = {}
  for (const s of sectionsRes.data ?? []) {
    sections[s.type as SectionType] = s
  }

  const ideaWithSections: IdeaWithSections = {
    ...idea,
    sections,
    latest_flowchart: flowchartRes.data?.[0] ?? null,
    unanswered_questions: questionsRes.data ?? [],
  }

  let expandResult
  try {
    expandResult = await expandIdea(ideaWithSections)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    await supabase.from('expansion_logs').insert({
      idea_id: id,
      iteration: idea.iteration_count,
      model_used: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
      success: false,
      error_message: message,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Write sections to DB (upsert)
  const sectionInserts = Object.entries(expandResult.sections).map(([type, content]) => ({
    idea_id: id,
    type,
    content,
    version: (sections[type as SectionType]?.version ?? 0) + 1,
    iteration: idea.iteration_count + 1,
  }))

  if (sectionInserts.length > 0) {
    await supabase.from('trd_sections').upsert(sectionInserts, {
      onConflict: 'idea_id,type',
      ignoreDuplicates: false,
    })
  }

  // Write questions
  if (expandResult.questions.length > 0) {
    const expiresAt = new Date(Date.now() + 2 * idea.iteration_interval_min * 60000).toISOString()
    await supabase.from('questions').insert(
      expandResult.questions.map((q) => ({
        idea_id: id,
        iteration: idea.iteration_count + 1,
        question_text: q.question,
        question_context: q.context,
        expires_at: expiresAt,
      }))
    )
  }

  // Write flowchart
  if (expandResult.flowchart) {
    const latestVersion = flowchartRes.data?.[0]?.version ?? 0
    await supabase.from('flowcharts').insert({
      idea_id: id,
      mermaid_source: expandResult.flowchart,
      version: latestVersion + 1,
      iteration: idea.iteration_count + 1,
    })
  }

  // Update idea state
  const newIteration = idea.iteration_count + 1
  const isComplete = newIteration >= idea.max_iterations
  const nextExpansionAt = isComplete
    ? null
    : new Date(Date.now() + idea.iteration_interval_min * 60000).toISOString()

  await supabase.from('ideas').update({
    iteration_count: newIteration,
    status: isComplete ? 'completed' : 'running',
    completed_at: isComplete ? new Date().toISOString() : null,
    next_expansion_at: nextExpansionAt,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  // Log expansion
  await supabase.from('expansion_logs').insert({
    idea_id: id,
    iteration: newIteration,
    model_used: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    prompt_tokens: expandResult.tokensUsed,
    completion_tokens: 0,
    sections_updated: Object.keys(expandResult.sections),
    questions_asked: expandResult.questions.length,
    duration_ms: expandResult.durationMs,
    success: true,
  })

  return NextResponse.json({
    iteration: newIteration,
    max_iterations: idea.max_iterations,
    sections_updated: Object.keys(expandResult.sections),
    questions_asked: expandResult.questions.length,
    flowchart_updated: !!expandResult.flowchart,
    is_complete: isComplete,
  })
}
