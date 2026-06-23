'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SECTION_LABELS, type SectionType, type TRDSection } from '@/types'

// Simple markdown → HTML renderer (no extra deps)
function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,    '<em>$1</em>')
    .replace(/`(.+?)`/g,      '<code class="bg-gray-100 px-1 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.+)$/gm,    '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n\n/g,         '</p><p class="mb-3">')
    .replace(/^(?!<[h|l])/gm, '')
}

const EXPORT_ORDER_VIEWER: SectionType[] = [
  'executive_summary', 'problem_statement', 'target_users',
  'features_mvp', 'features_v2', 'user_stories',
  'system_architecture', 'data_model', 'api_design',
  'security', 'performance', 'error_handling',
  'deployment', 'testing', 'roadmap',
  'open_questions', 'sanity_check', 'next_steps',
]

interface TRDViewerProps {
  sections: Partial<Record<SectionType, TRDSection>>
  iterationCount: number
}

export function TRDViewer({ sections, iterationCount }: TRDViewerProps) {
  const [expanded, setExpanded] = useState<Set<SectionType>>(
    new Set(['executive_summary', 'problem_statement', 'next_steps'])
  )

  function toggle(type: SectionType) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const present = EXPORT_ORDER_VIEWER.filter((t) => sections[t])
  const missing = EXPORT_ORDER_VIEWER.filter((t) => !sections[t])

  if (present.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">The AI is working on your idea…</p>
        <p className="text-sm mt-1">First sections will appear in about a minute.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-4">
        {present.length} of {EXPORT_ORDER_VIEWER.length} sections complete · Iteration {iterationCount}
      </p>

      {/* Completed sections */}
      {present.map((type) => {
        const section = sections[type]!
        const isOpen = expanded.has(type)
        return (
          <div key={type} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => toggle(type)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  {SECTION_LABELS[type]}
                </span>
                <span className="text-xs text-gray-400">
                  {section.word_count ?? 0} words · v{section.version}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div
                className="px-5 pb-5 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none border-t border-gray-100 pt-4"
                dangerouslySetInnerHTML={{
                  __html: `<p class="mb-3">${renderMarkdown(section.content)}</p>`,
                }}
              />
            )}
          </div>
        )
      })}

      {/* Pending sections */}
      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 mb-2">Coming in next iteration:</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((type) => (
              <span
                key={type}
                className="rounded-lg bg-gray-50 border border-dashed border-gray-200 px-3 py-1.5 text-xs text-gray-400"
              >
                {SECTION_LABELS[type]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
