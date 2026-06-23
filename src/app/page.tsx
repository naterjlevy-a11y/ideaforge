import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Clock, Download, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-forge-600 text-lg">⚡ IdeaForge</span>
          <div className="flex items-center gap-3">
            <Link href="/explore" className="text-sm text-gray-500 hover:text-gray-900">Explore</Link>
            <Link href="/login">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
            <Link href="/login?signup=true">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="inline-flex items-center gap-2 rounded-full bg-forge-50 border border-forge-100 px-4 py-1.5 text-xs font-medium text-forge-600 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-forge-500 animate-pulse" />
          Free to use · Powered by Gemini AI
        </div>

        <h1 className="text-5xl font-bold text-gray-900 max-w-2xl leading-tight mb-4">
          Drop an idea.<br />
          <span className="text-forge-600">Come back to a plan.</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mb-8">
          Type your app idea. Set a run time. Walk away. IdeaForge expands it into a full
          Technical Requirements Document — architecture, data models, user stories, and
          flowcharts — automatically, in the background.
        </p>

        <Link href="/login?signup=true">
          <Button size="lg" className="gap-2">
            <Zap className="h-5 w-5" />
            Start forging for free
          </Button>
        </Link>

        <p className="text-xs text-gray-400 mt-3">No credit card · 3 ideas free · Works on phone &amp; desktop</p>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: <Zap className="h-6 w-6 text-forge-500" />, title: '1. Drop your idea', desc: 'Type your raw idea in plain English. No formatting needed.' },
              { icon: <Clock className="h-6 w-6 text-forge-500" />, title: '2. Set a timer', desc: 'Choose 1–20 hours. Longer = more iterations = richer output.' },
              { icon: <Globe className="h-6 w-6 text-forge-500" />, title: '3. Go live your life', desc: 'AI expands your idea every 30 min. Works while you sleep.' },
              { icon: <Download className="h-6 w-6 text-forge-500" />, title: '4. Copy & build', desc: 'Come back to a full TRD. Copy it into Claude Code and start.' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-3">{step.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        IdeaForge · Built with Next.js + Supabase + Gemini AI
      </footer>
    </main>
  )
}
