import { Button } from '@/components/ui/button'
import { useStorageHealth } from '@/hooks/useStorageHealth'
import { useFireStore } from '@/store/useFireStore'

export function StorageWarning() {
  const { corrupt, clear } = useStorageHealth()
  if (!corrupt) return null
  return (
    <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm space-y-2">
      <p>Локальные данные повреждены. Сбросьте их к значениям по умолчанию, чтобы продолжить.</p>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          clear()
          useFireStore.getState().resetAll()
        }}
      >
        Сбросить данные
      </Button>
    </div>
  )
}
