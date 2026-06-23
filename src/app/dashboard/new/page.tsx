import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { IdeaForm } from '@/components/IdeaForm'
import { ArrowLeft } from 'lucide-react'

export default async function NewIdeaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="mx-3 text-gray-200">|</span>
          <span className="font-bold text-forge-600">⚡ IdeaForge</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">New Idea</h1>
          <p className="text-sm text-gray-500">
            Describe your idea naturally. The AI will ask follow-up questions and expand it
            into a full TRD while you're away.
          </p>
        </div>
        <IdeaForm />
      </main>
    </div>
  )
}
