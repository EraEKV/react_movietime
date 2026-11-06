import type { IconName } from '../components/Icon/icons'
import type { ActivityItem } from '../types/activity'
import { statusLabel } from './library'
import { mediaHref, parseMediaKey } from './media'

/** One feed row in words: "<before> <title> <after>", the title links to `href`. */
export interface ActivityText {
  icon: IconName
  before: string
  title: string
  after: string
  href: string | null
}

const titleHref = (key: string | undefined): string | null => {
  const parsed = key ? parseMediaKey(key) : null
  return parsed ? mediaHref(parsed.mediaType, parsed.id) : null
}

const planHref = (id: string | undefined) => (id ? `/planner/${id}` : null)

/** Turns a stored record into a sentence. Pure, so it is easy to test and to translate later. */
export function describeActivity(item: ActivityItem): ActivityText {
  const { title, meta } = item
  switch (item.type) {
    case 'library.add':
      return {
        icon: 'plus',
        before: 'Added',
        title,
        after: meta?.status ? `to ${statusLabel(meta.status)}` : 'to your library',
        href: titleHref(item.mediaKey),
      }
    case 'library.status':
      return {
        icon: 'bookmark',
        before: 'Moved',
        title,
        after: meta?.status ? `to ${statusLabel(meta.status)}` : '',
        href: titleHref(item.mediaKey),
      }
    case 'list.create':
      return {
        icon: 'list',
        before: 'Created the list',
        title,
        after: '',
        href: item.refId ? `/lists/${item.refId}` : null,
      }
    case 'plan.create':
      return {
        icon: 'calendar',
        before: 'Planned',
        title,
        after: meta?.sessions
          ? `· ${meta.sessions} ${meta.sessions === 1 ? 'session' : 'sessions'}`
          : '',
        href: planHref(item.refId),
      }
    case 'session.done':
      // Series plans carry the series' mediaKey and an episode range; movie plans list titles.
      return item.mediaKey
        ? {
            icon: 'check',
            before: meta?.units ? `Watched ${meta.units} of` : 'Watched a session of',
            title,
            after: '',
            href: planHref(item.refId),
          }
        : {
            icon: 'check',
            before: 'Watched',
            title,
            after: meta?.units ? `· ${meta.units}` : '',
            href: planHref(item.refId),
          }
    case 'plan.done':
      return {
        icon: 'heat',
        before: 'Finished the plan',
        title,
        after: '',
        href: planHref(item.refId),
      }
  }
}
