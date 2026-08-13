import { useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { downloadJson, parseImport } from '@/lib/exportImport'
import type { FireData } from '@/lib/types'
import { useFireStore } from '@/store/useFireStore'

const STATUS_TEXT: Record<string, string> = {
  offline: 'Offline',
  syncing: 'Синхронизация…',
  synced: 'Синхронизировано',
  error: 'Ошибка синка',
}

export function DataSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const sync = useFireStore((s) => s.sync)
  const sendCode = useFireStore((s) => s.sendCode)
  const verifyCode = useFireStore((s) => s.verifyCode)
  const signOut = useFireStore((s) => s.signOut)
  const syncNow = useFireStore((s) => s.syncNow)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const loggedIn = sync.status === 'synced' || sync.status === 'syncing'
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Синхронизация</span>
                <Badge variant={sync.status === 'error' ? 'destructive' : 'secondary'}>
                  {STATUS_TEXT[sync.status] ?? 'Offline'}
                </Badge>
              </div>
              {sync.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Последняя синхронизация: {new Date(sync.lastSyncAt).toLocaleString('ru-RU')}
                </p>
              )}
              {loggedIn ? (
                <div className="space-y-2">
                  <p className="text-sm">{sync.email}</p>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={() => void syncNow()}>
                      Синхронизировать
                    </Button>
                    <Button className="flex-1" variant="outline" onClick={() => void signOut()}>
                      Выйти
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sync-email">Email</Label>
                  <Input id="sync-email" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                  {sync.email && (
                    <div className="space-y-2">
                      <Label htmlFor="sync-code">Код из письма</Label>
                      <Input id="sync-code" inputMode="numeric" value={code} placeholder="6 цифр" onChange={(e) => setCode(e.target.value)} />
                      <Button className="w-full" onClick={() => void verifyCode(sync.email!, code)}>
                        Войти
                      </Button>
                    </div>
                  )}
                  {!sync.email && (
                    <Button
                      className="w-full"
                      disabled={sending || !email.includes('@')}
                      onClick={() => {
                        setSending(true)
                        void sendCode(email).finally(() => setSending(false))
                      }}
                    >
                      {sending ? 'Отправка…' : 'Получить код'}
                    </Button>
                  )}
                  {sync.email && !sending && (
                    <p className="text-xs text-muted-foreground">Код отправлен на {sync.email}. Если письма нет — подождите минуту, лимит писем ограничен.</p>
                  )}
                </div>
              )}
              {sync.error && <p className="text-xs text-rose-500">{sync.error}</p>}
              <p className="text-xs text-muted-foreground">Локальные данные никуда не отправляются без входа.</p>
            </div>
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
