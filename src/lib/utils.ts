import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return 'text-emerald-600 dark:text-emerald-400'
    case 'review': return 'text-amber-600 dark:text-amber-400'
    case 'rejected': return 'text-red-600 dark:text-red-400'
    case 'missing_data': return 'text-slate-600 dark:text-slate-400'
    default: return 'text-slate-600 dark:text-slate-400'
  }
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-emerald-500'
}

export function getRiskBadge(score: number): string {
  if (score >= 80) return 'destructive'
  if (score >= 50) return 'warning'
  return 'default'
}
