'use client'

import { useEffect, useRef, useState } from 'react'

interface FlowchartViewerProps {
  mermaidSource: string
}

export function FlowchartViewer({ mermaidSource }: FlowchartViewerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!mermaidSource || !ref.current) return

    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })

        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, mermaidSource)

        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setLoaded(true)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Flowchart is being updated — check back after the next iteration.')
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [mermaidSource])

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        {error}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 overflow-x-auto">
      {!loaded && (
        <div className="text-center py-8 text-sm text-gray-400 animate-pulse">
          Rendering flowchart…
        </div>
      )}
      <div ref={ref} className={loaded ? '' : 'hidden'} />
    </div>
  )
}
