'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Loader2, Zap } from 'lucide-react'

const DURATION_OPTIONS = [
  { label: '1 hour',   value: 60 },
  { label: '3 hours',  value: 180 },
  { label: '6 hours',  value: 360 },
  { label: '12 hours', value: 720 },
  { label: '20 hours', value: 1200 },
]

export function IdeaForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(180)
  const [customDuration, setCustomDuration] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveDuration = customDuration
    ? Math.round(parseFloat(customDuration) * 60)
    : durationMinutes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          raw_input: rawInput.trim(),
          duration_minutes: effectiveDuration,
          visibility,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create idea')

      router.push(`/idea/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Idea Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Invisalign Progress Tracker"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500"
          maxLength={120}
          required
        />
        <p className="text-xs text-gray-400 mt-1">{title.length}/120</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Describe your idea
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="Just describe it naturally. What does it do? Who is it for? What problem does it solve? Don't worry about formatting — the AI will expand everything."
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500 resize-none"
          minLength={20}
          maxLength={2000}
          required
        />
        <p className="text-xs text-gray-400 mt-1">{rawInput.length}/2000 (min 20)</p>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How long should the AI work on this?
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setDurationMinutes(opt.value); setCustomDuration('') }}
              className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
                !customDuration && durationMinutes === opt.value
                  ? 'border-forge-500 bg-forge-50 text-forge-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {/* Custom duration */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="Custom"
              min="1"
              max="24"
              step="0.5"
              className={`w-20 rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-forge-500 ${
                customDuration ? 'border-forge-500 bg-forge-50' : 'border-gray-200'
              }`}
            />
            <span className="text-xs text-gray-500">hours</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Longer = more iterations = richer TRD.{' '}
          {effectiveDuration
            ? `${Math.floor(effectiveDuration / 30)} expansion iterations.`
            : ''}
        </p>
      </div>

      {/* Visibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
        <div className="flex gap-3">
          {(['private', 'public'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`rounded-lg px-4 py-2 text-sm border transition-colors capitalize ${
                visibility === v
                  ? 'border-forge-500 bg-forge-50 text-forge-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {v === 'private' ? '🔒 Private' : '🌍 Public'}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {visibility === 'private'
            ? 'Only you can see this idea.'
            : 'Visible in the public explore feed. Others can fork it.'}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Forging your idea…</>
        ) : (
          <><Zap className="mr-2 h-4 w-4" /> Forge This Idea</>
        )}
      </Button>
    </form>
  )
}
