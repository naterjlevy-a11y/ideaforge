import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, answer } = await req.json()
  if (!question_id || !answer?.trim()) {
    return NextResponse.json({ error: 'question_id and answer are required' }, { status: 400 })
  }

  // Verify ownership via the idea
  const { data: question } = await supabase
    .from('questions')
    .select('*, ideas!inner(user_id)')
    .eq('id', question_id)
    .eq('idea_id', id)
    .single()

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('questions')
    .update({ answer_text: answer.trim(), answered_at: new Date().toISOString() })
    .eq('id', question_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
