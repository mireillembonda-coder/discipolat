import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { BackendMissingNotice, DemoEntry } from './LoginPage'

export function SignupPage() {
  const { t } = useTranslation()
  const { configured, signUp } = useAuth()
  const { exitDemo } = useWorkspace()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', pharmacyName: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) return setError(t('auth.errors.passwordShort'))
    setBusy(true)
    try {
      exitDemo()
      const { needsEmailConfirmation } = await signUp({ ...form, email: form.email.trim() })
      if (needsEmailConfirmation) setDone(true)
      else navigate('/', { replace: true })
    } catch {
      setError(t('auth.errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  const valid = form.fullName && form.pharmacyName && form.email && form.password

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-navy">{t('auth.signupTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('auth.signupSubtitle')}</p>
      <div className="mt-8">
        {!configured && <BackendMissingNotice />}
        {done ? (
          <div className="flex gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('auth.signupDone')}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set('fullName')} disabled={!configured} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyName">{t('auth.pharmacyName')}</Label>
              <Input id="pharmacyName" autoComplete="organization" value={form.pharmacyName} onChange={set('pharmacyName')} disabled={!configured} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} disabled={!configured} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} disabled={!configured} />
              <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!configured || busy || !valid}>
              {busy && <Loader2 className="animate-spin" />}
              {t('auth.submitSignup')}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t('auth.terms')}</p>
          </form>
        )}
        <DemoEntry />
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('auth.hasAccount')}{' '}
          <Link to="/connexion" className="font-medium text-primary hover:underline">
            {t('auth.goLogin')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
