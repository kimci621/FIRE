import { useState } from 'react'
import { Database, Settings, Trophy, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileBanner } from '@/components/header/ProfileBanner'
import { CatchUpBanner } from '@/components/header/CatchUpBanner'
import { PortfolioChart } from '@/components/chart/PortfolioChart'
import { InvestTips } from '@/components/invest/InvestTips'
import { Calendar } from '@/components/calendar/Calendar'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { DataSheet } from '@/components/data/DataSheet'
import { StorageWarning } from '@/components/data/StorageWarning'
import { AchievementModal } from '@/components/milestones/AchievementModal'
import { BadgesDialog } from '@/components/milestones/BadgesDialog'
import { HelpDialog } from '@/components/help/HelpDialog'
import { useMilestoneCelebration } from '@/hooks/useMilestoneCelebration'
import { useSyncInit } from '@/hooks/useSyncInit'
import { useReminder } from '@/hooks/useReminder'
import { useTheme } from '@/hooks/useTheme'

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [badgesOpen, setBadgesOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const celebration = useMilestoneCelebration()
  useSyncInit()
  useReminder()
  useTheme()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-16 pt-6">
        <ProfileBanner />
        <StorageWarning />
        <CatchUpBanner />
        <PortfolioChart />
        <Calendar />
        <InvestTips />
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="w-full px-1.5 text-xs sm:px-2 sm:text-sm [&_svg]:size-3.5"
            onClick={() => setBadgesOpen(true)}
          >
            <Trophy />
            Достижения
          </Button>
          <Button
            variant="outline"
            className="w-full px-1.5 text-xs sm:px-2 sm:text-sm [&_svg]:size-3.5"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings />
            Настройки
          </Button>
          <Button
            variant="outline"
            className="w-full px-1.5 text-xs sm:px-2 sm:text-sm [&_svg]:size-3.5"
            onClick={() => setDataOpen(true)}
          >
            <Database />
            Данные
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setHelpOpen(true)}>
          <BookOpen className="mr-2 h-4 w-4" />
          Как пользоваться приложением
        </Button>
      </div>
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BadgesDialog open={badgesOpen} onOpenChange={setBadgesOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <DataSheet open={dataOpen} onOpenChange={setDataOpen} />
      <AchievementModal celebration={celebration} />
    </div>
  )
}
