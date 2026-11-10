import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../../store/hooks'
import { selectAvatar } from '../../store/authSlice'
import type { AuthUser, UserAvatar } from '../../types/auth'
import { offlineMessage } from '../../utils/listErrors'
import Avatar from '../../shared/ui/Avatar/Avatar'
import Button from '../../shared/ui/Button/Button'
import AvatarDialog from './AvatarDialog'
import styles from './Settings.module.css'

/** Settings → Account: your avatar and the button that opens the picker. */
export default function AvatarSetting({ user, name }: { user: AuthUser; name: string }) {
  const { t } = useTranslation('profile')
  const avatar = useAppSelector(selectAvatar)
  const [open, setOpen] = useState(false)

  async function save(next: UserAvatar | null) {
    // Offline the write would wait for the network without telling anyone.
    if (!navigator.onLine) throw new Error(offlineMessage())
    const { saveAvatar } = await import('../../services/profileService')
    await saveAvatar(user.uid, next)
  }

  return (
    <div className={styles.avatarRow}>
      <Avatar name={name} photoUrl={user.photoURL} avatar={avatar} size={64} />
      <div className={styles.avatarText}>
        <span className={styles.avatarLabel}>{t('avatar.label')}</span>
        <span className={styles.avatarNote}>{t('avatar.note')}</span>
      </div>
      <Button onClick={() => setOpen(true)}>{t('avatar.change')}</Button>
      {open && (
        <AvatarDialog name={name} current={avatar} onSave={save} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}
