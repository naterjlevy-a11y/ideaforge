import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'running' | 'completed' | 'paused' | 'failed' | 'pending'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:   'bg-gray-100 text-gray-700',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  failed:    'bg-red-100 text-red-700',
  pending:   'bg-purple-100 text-purple-700',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
