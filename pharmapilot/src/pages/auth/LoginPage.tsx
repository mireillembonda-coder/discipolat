import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Info, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'

export function BackendMissingNotice() {
  const { t } = useTranslation()
  return (
    <div className="mb-6 flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div>
        <p className="font-medium text-navy">{t('auth.backendMissingTitle')}</p>
        <p className="mt-0.5 text-muted-foreground">{t('auth.backendMissingBody')}</p>
      </div>
    </div>
  )
}

export function DemoEntry() {
  const { t } = useTranslation()
  const { enterDemo } = useWorkspace()
  const navigate = useNavigate()
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => {
          enterDemo()
          navigate('/', { replace: true })
        }}
      >
        <FlaskConical className="text-amber-600" /> {t('auth.demoCta')}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
    </>
  )
}

export function LoginPage() {
  const { t } = useTranslation()
  const { configured, signIn } = useAuth()
  const { exitDemo } = useWorkspace()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      exitDemo() // une session réelle ne cohabite jamais avec la démonstration
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? ''
      setError(/invalid/i.test(msg) ? t('auth.errors.invalid') : t('auth.errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">{t('auth.loginTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
      <div className="mt-8">
        {!configured && <BackendMissingNotice />}
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!configured} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('auth.forgot')} <IntegrationBadge id="password_reset" />
              </span>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!configured}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={!configured || busy || !email || !password}>
            {busy && <Loader2 className="animate-spin" />}
            {t('auth.submitLogin')}
          </Button>
        </form>
        <DemoEntry />
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/inscription" className="font-medium text-primary hover:underline">
            {t('auth.goSignup')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
