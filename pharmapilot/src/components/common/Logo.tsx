import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path d="M10 22V10h6.5a4 4 0 0 1 0 8H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="22" r="2" fill="#6ee7b7" />
    </svg>
  )
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-navy')}>
        PharmaPilot <span className={inverted ? 'text-emerald-300' : 'text-primary'}>AI</span>
      </span>
    </div>
  )
}
