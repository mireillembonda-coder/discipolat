import { useRef, useState, type DragEvent } from "react";
import { FileUp, FlaskConical, History, Info, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { ToConnectBadge } from "@/components/common/ToConnectBadge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { previewCsv, type CsvPreview } from "@/lib/csvPreview";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ImportPage() {
  const { t } = useTranslation();
  const { mode } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = mode === "demo";

  async function handle(f: File | undefined) {
    if (!f || disabled) return;
    setFile(f);
    setPreview(f.name.toLowerCase().endsWith(".csv") || f.type === "text/csv" ? await previewCsv(f) : null);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    void handle(e.dataTransfer.files[0]);
  }

  const sources = ["sourceSales", "sourceStock", "sourcePurchases", "sourceCatalog"] as const;

  return (
    <>
      <PageHeader title={t("import.title")} subtitle={t("import.subtitle")} actions={<ToConnectBadge hint={t("import.uploadHint")} />} />
      {disabled && (
        <Alert variant="warning" className="mb-4">
          <FlaskConical />
          <AlertDescription>{t("import.demoDisabled")}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!disabled) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragging ? "border-primary bg-accent" : "border-border",
                  disabled && "opacity-60",
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <FileUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="mt-3 font-medium">{t("import.dropTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("import.dropHint")}</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={(e) => void handle(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" className="mt-4" disabled={disabled} onClick={() => inputRef.current?.click()}>
                  {t("import.browse")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {file && (
            <Card>
              <CardHeader>
                <CardTitle>{t("import.preview")}</CardTitle>
                <CardDescription>{t("import.previewHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  <span className="font-medium">{file.name}</span>{" "}
                  <span className="text-muted-foreground">· {formatNumber(file.size / 1024, { maximumFractionDigits: 0 })} Ko</span>
                  {preview && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {preview.headers.length} {t("import.columns")}
                    </span>
                  )}
                </p>
                {preview ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {preview.headers.map((h, i) => (
                            <TableHead key={i} className="normal-case">
                              {h || `#${i + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.rows.map((r, i) => (
                          <TableRow key={i}>
                            {preview.headers.map((_, j) => (
                              <TableCell key={j} className="whitespace-nowrap text-xs">
                                {r[j]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Alert>
                    <Info />
                    <AlertDescription>{t("import.xlsxNote")}</AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button disabled>
                    <Upload /> {t("import.upload")}
                  </Button>
                  <p className="text-xs text-muted-foreground">{t("import.uploadHint")}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                {t("import.history")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("import.noHistory")}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("import.sources")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm">
              {sources.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {t(`import.${s}`)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
