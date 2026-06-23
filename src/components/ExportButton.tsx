'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Copy, Download, Check, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  ideaId: string
}

export function ExportButton({ ideaId }: ExportButtonProps) {
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  async function handleCopyForClaude() {
    setCopying(true)
    try {
      const res = await fetch(`/api/ideas/${ideaId}/export?format=claude`)
      const { prompt } = await res.json()
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      alert('Copy failed — try again')
    } finally {
      setCopying(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/ideas/${ideaId}/export?format=markdown`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') ?? 'TRD.md'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed — try again')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handleCopyForClaude} disabled={copying || copied} variant="default">
        {copied ? (
          <><Check className="mr-2 h-4 w-4" /> Copied!</>
        ) : copying ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Copying…</>
        ) : (
          <><Copy className="mr-2 h-4 w-4" /> Copy for Claude Code</>
        )}
      </Button>
      <Button onClick={handleDownload} disabled={downloading} variant="outline">
        {downloading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading…</>
        ) : (
          <><Download className="mr-2 h-4 w-4" /> Download .md</>
        )}
      </Button>
    </div>
  )
}
