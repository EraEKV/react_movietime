import { useTranslation } from 'react-i18next'
import type { ListRole, ListVisibility } from '../../types/list'
import type { IconName } from '../../shared/ui/Icon/icons'
import Badge from '../../shared/ui/Badge/Badge'

const ROLE_ICONS: Record<ListRole, IconName> = {
  owner: 'user',
  editor: 'edit',
  viewer: 'eye',
  link: 'link',
}

/** What you can do with a list; icon + word, never colour alone. */
export function RoleBadge({ role }: { role: ListRole }) {
  const { t } = useTranslation()
  return (
    <Badge
      icon={ROLE_ICONS[role]}
      tone={role === 'owner' || role === 'editor' ? 'strong' : undefined}
    >
      {t(`role.${role}`)}
    </Badge>
  )
}

/** Who can see a list: private, anyone with the link, or N members. */
export function VisibilityBadge({
  visibility,
  members = 0,
}: {
  visibility: ListVisibility
  members?: number
}) {
  const { t } = useTranslation()
  if (members > 0) return <Badge icon="users">{t('visibility.shared', { count: members })}</Badge>
  return visibility === 'link' ? (
    <Badge icon="link">{t('visibility.link')}</Badge>
  ) : (
    <Badge icon="eye-off">{t('visibility.private')}</Badge>
  )
}
