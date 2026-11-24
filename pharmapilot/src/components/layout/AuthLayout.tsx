import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, PackageCheck, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/common/Logo'

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const points = [
    { icon: BarChart3, text: t('auth.heroPoints.p1') },
    { icon: ShieldCheck, text: t('auth.heroPoints.p2') },
    { icon: PackageCheck, text: t('auth.heroPoints.p3') },
  ]
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section className="hidden flex-col justify-between bg-navy p-10 text-navy-foreground lg:flex xl:p-14">
        <Logo inverted />
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">{t('auth.heroTitle')}</h2>
          <ul className="mt-8 space-y-5">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-4 w-4 text-emerald-300" />
                </span>
                <span className="text-sm leading-relaxed text-navy-muted">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-sm text-navy-muted">
          <p className="font-medium text-white">{t('brand.tagline')}</p>
          <p className="mt-1">{t('auth.heroNote')}</p>
        </div>
      </section>
      <section className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </section>
    </div>
  )
}
