import Link from 'next/link'
import { Badge } from './ui/badge'
import { formatDuration, progressPct, timeAgo } from '@/lib/utils'
import type { Idea, IdeaStatus } from '@/types'

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const pct = progressPct(idea.iteration_count, idea.max_iterations)

  return (
    <Link href={`/idea/${idea.id}`} className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-forge-500 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{idea.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {idea.status === 'running' && (
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          <Badge variant={idea.status as IdeaStatus}>{idea.status}</Badge>
        </div>
      </div>

      <p className="text-xs text-gray-500 line-clamp-2 mb-4">
        {idea.raw_input}
      </p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Iteration {idea.iteration_count}/{idea.max_iterations}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-forge-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{formatDuration(idea.duration_minutes)} run</span>
        <span>{timeAgo(idea.created_at)}</span>
      </div>
    </Link>
  )
}
