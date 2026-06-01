export type SectionKey = 'campuses' | 'roles' | 'services' | 'events'

export interface RailItem {
  key: SectionKey
  label: string
  count: number
}

export type RequestConfirm = (opts: {
  title: string
  message?: string
  onConfirm: () => void
}) => void
