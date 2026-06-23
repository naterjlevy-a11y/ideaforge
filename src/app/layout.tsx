import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IdeaForge — Drop an idea. Come back to a plan.',
  description: 'AI-powered idea expansion engine that builds full TRDs while you\'re away.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
