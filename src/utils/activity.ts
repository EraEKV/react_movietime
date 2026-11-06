import i18n from '../shared/i18n'
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
        before: i18n.t('profile:feed.added'),
        title,
        after: meta?.status
          ? i18n.t('profile:feed.toStatus', { status: statusLabel(meta.status) })
          : i18n.t('profile:feed.toLibrary'),
        href: titleHref(item.mediaKey),
      }
    case 'library.status':
      return {
        icon: 'bookmark',
        before: i18n.t('profile:feed.moved'),
        title,
        after: meta?.status
          ? i18n.t('profile:feed.toStatus', { status: statusLabel(meta.status) })
          : '',
        href: titleHref(item.mediaKey),
      }
    case 'list.create':
      return {
        icon: 'list',
        before: i18n.t('profile:feed.createdList'),
        title,
        after: '',
        href: item.refId ? `/lists/${item.refId}` : null,
      }
    case 'plan.create':
      return {
        icon: 'calendar',
        before: i18n.t('profile:feed.planned'),
        title,
        after: meta?.sessions ? `· ${i18n.t('count.sessions', { count: meta.sessions })}` : '',
        href: planHref(item.refId),
      }
    case 'session.done':
      // Series plans carry the series' mediaKey and an episode range; movie plans list titles.
      return item.mediaKey
        ? {
            icon: 'check',
            before: meta?.units
              ? i18n.t('profile:feed.watchedUnits', { units: meta.units })
              : i18n.t('profile:feed.watchedSession'),
            title,
            after: '',
            href: planHref(item.refId),
          }
        : {
            icon: 'check',
            before: i18n.t('profile:feed.watched'),
            title,
            after: meta?.units ? `· ${meta.units}` : '',
            href: planHref(item.refId),
          }
    case 'plan.done':
      return {
        icon: 'heat',
        before: i18n.t('profile:feed.finished'),
        title,
        after: '',
        href: planHref(item.refId),
      }
  }
}
