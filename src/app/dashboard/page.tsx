import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { IdeaCard } from '@/components/IdeaCard'
import { Button } from '@/components/ui/button'
import { Plus, LogOut } from 'lucide-react'
import type { Idea } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ideas } = await supabase
    .from('ideas')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const running = (ideas ?? []).filter((i) => i.status === 'running')
  const rest = (ideas ?? []).filter((i) => i.status !== 'running')

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-forge-600">⚡ IdeaForge</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Ideas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {running.length} running · {(ideas?.length ?? 0) - running.length} complete/paused
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Idea
            </Button>
          </Link>
        </div>

        {/* Concurrent limit warning */}
        {running.length >= 3 && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            You have 3 running ideas (the maximum). Pause or wait for one to complete before adding another.
          </div>
        )}

        {(ideas?.length ?? 0) === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">💡</p>
            <h2 className="text-lg font-semibold mb-2">No ideas yet</h2>
            <p className="text-sm text-gray-500 mb-6">Drop your first idea and let the AI do the work.</p>
            <Link href="/dashboard/new">
              <Button><Plus className="mr-2 h-4 w-4" />Forge your first idea</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {running.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  Currently Running
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {running.map((idea: Idea) => <IdeaCard key={idea.id} idea={idea} />)}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 mb-3">All Ideas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((idea: Idea) => <IdeaCard key={idea.id} idea={idea} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
