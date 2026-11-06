import type { ListRole, ListVisibility } from '../../types/list'
import type { IconName } from '../Icon/icons'
import Badge from './Badge'

const ROLES: Record<ListRole, { icon: IconName; label: string }> = {
  owner: { icon: 'user', label: 'Owner' },
  editor: { icon: 'edit', label: 'Editor' },
  viewer: { icon: 'eye', label: 'Viewer' },
  link: { icon: 'link', label: 'Link visitor' },
}

/** What you can do with a list; icon + word, never colour alone. */
export function RoleBadge({ role }: { role: ListRole }) {
  const { icon, label } = ROLES[role]
  return (
    <Badge icon={icon} tone={role === 'owner' || role === 'editor' ? 'strong' : undefined}>
      {label}
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
  if (members > 0) return <Badge icon="users">{`Shared with ${members}`}</Badge>
  return visibility === 'link' ? (
    <Badge icon="link">Anyone with link</Badge>
  ) : (
    <Badge icon="eye-off">Private</Badge>
  )
}
