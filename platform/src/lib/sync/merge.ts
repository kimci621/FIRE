import type { FireData, MonthEntry, Profile } from '../types'

export interface RemoteRow {
  id: string | null
  data: unknown
  updatedAt: string
}

/** Применить облачные строки новее локальных. Возвращает новое FireData и число применённых строк. */
export function mergePull(
  local: FireData,
  remoteProfile: RemoteRow | null,
  remoteMonths: RemoteRow[],
): { data: FireData; pulled: number } {
  let pulled = 0
  let profile = local.profile
  const months = [...local.months]

  const remoteNewer = (localTs: string | undefined, remoteTs: string) => !localTs || remoteTs > localTs

  if (remoteProfile && remoteNewer(local.meta.lastModified?.profile, remoteProfile.updatedAt)) {
    profile = remoteProfile.data as Profile
    pulled++
  }

  for (const row of remoteMonths) {
    if (!row.id) continue
    const localTs = local.meta.lastModified?.months?.[row.id]
    const existing = months.findIndex((m) => m.id === row.id)
    if (remoteNewer(localTs, row.updatedAt)) {
      const entry = row.data as MonthEntry
      if (existing >= 0) months[existing] = entry
      else months.push(entry)
      pulled++
    }
  }

  return { data: { ...local, profile, months }, pulled }
}

/** Строки, где локальная версия новее облачной (или облачной нет) — для push. */
export function diffPush(
  local: FireData,
  remoteProfile: RemoteRow | null,
  remoteMonths: RemoteRow[],
): { profile?: Profile; months: MonthEntry[] } {
  const localNewer = (localTs: string | undefined, remoteTs: string | undefined) =>
    Boolean(localTs) && (!remoteTs || localTs > remoteTs)

  const result: { profile?: Profile; months: MonthEntry[] } = { months: [] }
  if (localNewer(local.meta.lastModified?.profile, remoteProfile?.updatedAt)) {
    result.profile = local.profile
  }
  const remoteById = new Map(remoteMonths.map((r) => [r.id, r.updatedAt]))
  for (const m of local.months) {
    if (localNewer(local.meta.lastModified?.months?.[m.id], remoteById.get(m.id))) {
      result.months.push(m)
    }
  }
  return result
}
