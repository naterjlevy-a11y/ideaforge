import { generateText, generateJSON } from './gemini'
import {
  buildExpansionPrompt,
  buildQuestionPrompt,
  buildFlowchartPrompt,
} from './prompts'
import type { SectionType, IdeaWithSections } from '@/types'
import { PHASE_1_SECTIONS } from '@/types'

export interface ExpandResult {
  sections: Partial<Record<SectionType, string>>
  questions: Array<{ question: string; context: string }>
  flowchart: string | null
  tokensUsed: number
  durationMs: number
}

export async function expandIdea(idea: IdeaWithSections): Promise<ExpandResult> {
  const start = Date.now()
  let tokensUsed = 0

  const result: ExpandResult = {
    sections: {},
    questions: [],
    flowchart: null,
    tokensUsed: 0,
    durationMs: 0,
  }

  // Build context from any answered questions
  const questionContext = buildQuestionContext(idea)

  // Determine which sections to expand this iteration
  const toExpand = getSectionsToExpand(idea)

  // Expand each section
  for (const sectionType of toExpand) {
    const existing = idea.sections[sectionType]?.content ?? null
    const prompt = buildExpansionPrompt(
      idea.title,
      idea.raw_input,
      sectionType,
      existing,
      questionContext
    )
    const { text, tokens } = await generateText(prompt)
    if (text.trim().split(/\s+/).length >= 50) {
      result.sections[sectionType] = text.trim()
      tokensUsed += tokens
    }
  }

  // Generate follow-up questions (first 2 iterations only)
  if (idea.iteration_count < 2) {
    const existingSummary = Object.entries(result.sections)
      .map(([k, v]) => `### ${k}\n${v?.slice(0, 300)}...`)
      .join('\n\n')
    const prompt = buildQuestionPrompt(idea.title, idea.raw_input, existingSummary)
    try {
      const questions = await generateJSON<Array<{ question: string; context: string }>>(prompt)
      result.questions = Array.isArray(questions) ? questions.slice(0, 3) : []
      tokensUsed += 500
    } catch {
      // Non-fatal: questions are optional
    }
  }

  // Generate/update flowchart if we have architecture content
  const archContent =
    result.sections['system_architecture'] ??
    idea.sections['system_architecture']?.content
  if (archContent) {
    const prompt = buildFlowchartPrompt(idea.title, archContent)
    const { text, tokens } = await generateText(prompt)
    const cleaned = text.trim().replace(/^```(?:mermaid)?\n?/i, '').replace(/\n?```$/, '').trim()
    if (cleaned.startsWith('flowchart') || cleaned.startsWith('graph')) {
      result.flowchart = cleaned
      tokensUsed += tokens
    }
  }

  result.tokensUsed = tokensUsed
  result.durationMs = Date.now() - start
  return result
}

function getSectionsToExpand(idea: IdeaWithSections): SectionType[] {
  const existing = Object.keys(idea.sections) as SectionType[]
  const missing = PHASE_1_SECTIONS.filter((s) => !existing.includes(s))

  // First iteration: expand all Phase 1 sections
  if (idea.iteration_count === 0) return PHASE_1_SECTIONS

  // Subsequent: expand missing first, then re-deepen thin ones
  if (missing.length > 0) return missing.slice(0, 3)

  const thin = PHASE_1_SECTIONS.filter((s) => {
    const wc = idea.sections[s]?.word_count ?? 0
    return wc < 200
  })
  return thin.slice(0, 3)
}

function buildQuestionContext(idea: IdeaWithSections): string {
  const answered = idea.unanswered_questions?.filter((q) => q.answer_text) ?? []
  if (answered.length === 0) return ''
  return answered
    .map((q) => `Q: ${q.question_text}\nA: ${q.answer_text}`)
    .join('\n\n')
}
