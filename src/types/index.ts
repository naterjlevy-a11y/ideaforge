export type IdeaStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed'
export type IdeaVisibility = 'public' | 'private'

export type SectionType =
  | 'executive_summary'
  | 'problem_statement'
  | 'target_users'
  | 'features_mvp'
  | 'features_v2'
  | 'user_stories'
  | 'system_architecture'
  | 'data_model'
  | 'api_design'
  | 'security'
  | 'performance'
  | 'error_handling'
  | 'deployment'
  | 'testing'
  | 'roadmap'
  | 'open_questions'
  | 'sanity_check'
  | 'next_steps'

export const SECTION_LABELS: Record<SectionType, string> = {
  executive_summary:   'Executive Summary',
  problem_statement:   'Problem Statement',
  target_users:        'Target Users',
  features_mvp:        'MVP Features',
  features_v2:         'V2 Features',
  user_stories:        'User Stories',
  system_architecture: 'System Architecture',
  data_model:          'Data Model',
  api_design:          'API Design',
  security:            'Security',
  performance:         'Performance',
  error_handling:      'Error Handling',
  deployment:          'Deployment',
  testing:             'Testing Strategy',
  roadmap:             'Roadmap',
  open_questions:      'Open Questions',
  sanity_check:        'Sanity Checks',
  next_steps:          'Next Steps',
}

export const PHASE_1_SECTIONS: SectionType[] = [
  'executive_summary',
  'problem_statement',
  'target_users',
  'features_mvp',
  'system_architecture',
  'next_steps',
]

export interface Idea {
  id: string
  user_id: string
  title: string
  raw_input: string
  status: IdeaStatus
  visibility: IdeaVisibility
  duration_minutes: number
  iteration_count: number
  max_iterations: number
  iteration_interval_min: number
  next_expansion_at: string | null
  started_at: string | null
  expires_at: string | null
  completed_at: string | null
  paused_at: string | null
  view_count: number
  fork_count: number
  like_count: number
  forked_from_id: string | null
  created_at: string
  updated_at: string
}

export interface TRDSection {
  id: string
  idea_id: string
  type: SectionType
  content: string
  version: number
  iteration: number
  word_count: number | null
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  idea_id: string
  iteration: number
  question_text: string
  question_context: string | null
  answer_text: string | null
  auto_assumed: boolean
  auto_assumption: string | null
  answered_at: string | null
  expires_at: string | null
  created_at: string
}

export interface Flowchart {
  id: string
  idea_id: string
  mermaid_source: string
  version: number
  iteration: number
  created_at: string
}

export interface ExpansionLog {
  id: string
  idea_id: string
  iteration: number
  model_used: string
  prompt_tokens: number | null
  completion_tokens: number | null
  cost_usd: number
  sections_updated: SectionType[] | null
  questions_asked: number
  duration_ms: number | null
  success: boolean
  error_message: string | null
  created_at: string
}

export interface IdeaWithSections extends Idea {
  sections: Partial<Record<SectionType, TRDSection>>
  latest_flowchart: Flowchart | null
  unanswered_questions: Question[]
}
