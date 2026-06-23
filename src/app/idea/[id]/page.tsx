import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TRDViewer } from '@/components/TRDViewer'
import { FlowchartViewer } from '@/components/FlowchartViewer'
import { ExportButton } from '@/components/ExportButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { formatDuration, progressPct, timeAgo } from '@/lib/utils'
import type { IdeaStatus, SectionType, TRDSection, Flowchart } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IdeaPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: idea } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!idea) notFound()
  if (idea.visibility === 'private' && idea.user_id !== user?.id) redirect('/login')

  const [sectionsRes, questionsRes, flowchartRes] = await Promise.all([
    supabase.from('trd_sections').select('*').eq('idea_id', id),
    supabase.from('questions').select('*').eq('idea_id', id).order('created_at', { ascending: false }),
    supabase.from('flowcharts').select('*').eq('idea_id', id).order('version', { ascending: false }).limit(1),
  ])

  const sections: Partial<Record<SectionType, TRDSection>> = {}
  for (const s of sectionsRes.data ?? []) {
    sections[s.type as SectionType] = s as TRDSection
  }

  const unansweredQuestions = (questionsRes.data ?? []).filter(
    (q) => !q.answer_text && !q.auto_assumed
  )
  const latestFlowchart: Flowchart | null = (flowchartRes.data?.[0] as Flowchart) ?? null

  const pct = progressPct(idea.iteration_count, idea.max_iterations)
  const isOwner = idea.user_id === user?.id

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="font-bold text-forge-600">⚡ IdeaForge</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <h1 className="text-2xl font-bold flex-1">{idea.title}</h1>
            <div className="flex items-center gap-2 pt-1">
              {idea.status === 'running' && (
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              )}
              <Badge variant={idea.status as IdeaStatus}>{idea.status}</Badge>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Iteration {idea.iteration_count} of {idea.max_iterations}</span>
              <span>{pct}% · {formatDuration(idea.duration_minutes)} run · {timeAgo(idea.created_at)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-forge-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              <ExportButton ideaId={id} />
              {idea.status === 'running' && (
                <form action={`/api/ideas/${id}/expand`} method="post">
                  <Button variant="outline" size="default" type="submit">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Expand now
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Unanswered questions */}
        {unansweredQuestions.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-800 mb-3">
              💬 The AI has questions — answer to guide the expansion
            </h2>
            <div className="space-y-4">
              {unansweredQuestions.map((q) => (
                <QuestionForm key={q.id} question={q} ideaId={id} />
              ))}
            </div>
          </div>
        )}

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TRD — takes 2/3 */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500 mb-3">Technical Requirements Document</h2>
            <TRDViewer sections={sections} iterationCount={idea.iteration_count} />
          </div>

          {/* Flowchart + meta — takes 1/3 */}
          <div className="space-y-4">
            {latestFlowchart && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">Architecture Flowchart</h2>
                <FlowchartViewer mermaidSource={latestFlowchart.mermaid_source} />
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-3">Details</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Run duration</dt>
                  <dd className="font-medium">{formatDuration(idea.duration_minutes)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Iterations</dt>
                  <dd className="font-medium">{idea.iteration_count}/{idea.max_iterations}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Visibility</dt>
                  <dd className="font-medium capitalize">{idea.visibility}</dd>
                </div>
                {idea.expires_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Expires</dt>
                    <dd className="font-medium">{new Date(idea.expires_at).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function QuestionForm({ question, ideaId }: { question: { id: string; question_text: string; question_context: string | null }; ideaId: string }) {
  return (
    <div className="bg-white rounded-lg border border-amber-100 p-4">
      <p className="text-sm font-medium text-gray-800 mb-1">{question.question_text}</p>
      {question.question_context && (
        <p className="text-xs text-gray-400 mb-3">{question.question_context}</p>
      )}
      <form
        action={`/api/ideas/${ideaId}/answer`}
        method="post"
        className="flex gap-2"
        onSubmit={undefined}
      >
        <input type="hidden" name="question_id" value={question.id} />
        <input
          type="text"
          name="answer"
          placeholder="Your answer…"
          className="flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-forge-500"
          required
        />
        <button
          type="submit"
          className="rounded bg-forge-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-forge-600 transition-colors"
        >
          Answer
        </button>
      </form>
    </div>
  )
}
