import { useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { downloadJson, parseImport } from '@/lib/exportImport'
import type { FireData } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

export function DataSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const parsedRef = useRef<FireData | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const onExport = () => {
    const s = useFireStore.getState()
    downloadJson({ profile: s.profile, months: s.months, meta: s.meta })
    setMessage('Экспортировано ✓')
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = parseImport(await file.text())
    if (!result.ok) {
      parsedRef.current = null
      setMessage(result.error)
      return
    }
    parsedRef.current = result.data
    setMessage(`Файл готов: ${result.data.months.length} мес. Нажмите «Применить импорт».`)
  }

  const applyImport = () => {
    if (!parsedRef.current) return
    useFireStore.getState().importData(parsedRef.current)
    parsedRef.current = null
    setMessage('Импортировано ✓')
  }

  const doReset = () => {
    useFireStore.getState().resetAll()
    setConfirmReset(false)
    setMessage('Сброшено к дефолтам ✓')
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Данные</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Синхронизация</span>
              <Badge variant="secondary">Offline Mode</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Supabase-синк появится в Фазе 2.</p>
            <Separator />
            <Button className="w-full" onClick={onExport}>
              Экспорт JSON
            </Button>
            <Button className="w-full" variant="outline" onClick={() => fileRef.current?.click()}>
              Импорт JSON
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} data-testid="import-file" />
            {parsedRef.current && (
              <Button className="w-full" onClick={applyImport}>
                Применить импорт
              </Button>
            )}
            <Button className="w-full" variant="destructive" onClick={() => setConfirmReset(true)}>
              Сбросить к дефолтам
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить все данные?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Все месяцы и настройки вернутся к значениям по умолчанию.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={doReset}>
              Сбросить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
