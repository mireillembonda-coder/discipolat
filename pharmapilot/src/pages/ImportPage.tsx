import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUp, FlaskConical, Link2, Lock, Package, Receipt, ShoppingCart, Warehouse } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { IntegrationBadge } from '@/components/common/IntegrationBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { parseCsvPreview, type CsvPreview } from '@/lib/csv'
import { cn } from '@/lib/utils'

const DATASETS = [
  { id: 'sales', icon: Receipt },
  { id: 'products', icon: Package },
  { id: 'stock', icon: Warehouse },
  { id: 'purchases', icon: ShoppingCart },
] as const

function FilePreview() {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)

  const handle = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setPreview(null)
    if (/\.xlsx?$/i.test(file.name)) return setError(t('import.excelLater'))
    if (!/\.(csv|txt)$/i.test(file.name)) return setError(t('import.unsupported'))
    // Lecture limitée au début du fichier : aperçu uniquement, rien n'est envoyé.
    const text = await file.slice(0, 512 * 1024).text()
    setPreview({ ...parseCsvPreview(text, 8), fileName: file.name })
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          void handle(e.dataTransfer.files[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          drag ? 'border-primary bg-accent' : 'border-border hover:bg-muted/50',
        )}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <FileUp className="h-5 w-5" />
        </span>
        <p className="font-medium text-navy">{t('import.dropTitle')}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t('import.dropBody')}</p>
        <input ref={input} type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={(e) => void handle(e.target.files?.[0])} />
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {preview && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-navy">
                {t('import.preview')} — {preview.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('import.previewInfo', { rows: preview.totalRows, cols: preview.headers.length, sep: preview.delimiter === '\t' ? 'tab' : preview.delimiter })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled>
                {t('import.sendToCloud')}
              </Button>
              <IntegrationBadge id="import_files" />
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.headers.map((h, i) => (
                    <TableHead key={i}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((r, i) => (
                  <TableRow key={i}>
                    {preview.headers.map((_, j) => (
                      <TableCell key={j} className="whitespace-nowrap">
                        {r[j] ?? ''}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> {t('import.previewLocal')}
          </p>
        </div>
      )}
    </>
  )
}

export default function ImportPage() {
  const { t } = useTranslation()
  const { mode } = useWorkspace()

  return (
    <>
      <PageHeader title={t('import.title')} subtitle={t('import.subtitle')} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="p-5">
            {mode === 'demo' ? (
              <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t('import.demoDisabled')}</p>
              </div>
            ) : (
              <FilePreview />
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('import.datasets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {DATASETS.map(({ id, icon: Icon }) => (
                  <li key={id} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{t(`import.ds.${id}.name`)}</p>
                      <p className="text-xs text-muted-foreground">{t(`import.ds.${id}.desc`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> {t('import.connectors')}
                </CardTitle>
                <IntegrationBadge id="lgo_connectors" />
              </div>
              <CardDescription>{t('import.connectorsBody')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </>
  )
}
