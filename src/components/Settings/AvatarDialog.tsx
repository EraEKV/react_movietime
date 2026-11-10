import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { AvatarColor, UserAvatar } from '../../types/auth'
import { AVATAR_COLORS, AVATAR_EMOJIS, clampCrop, type Crop } from '../../utils/avatar'
import { loadPhoto, renderPhoto, type LoadedPhoto } from '../../utils/avatarImage'
import Avatar from '../../shared/ui/Avatar/Avatar'
import Banner from '../../shared/ui/Banner/Banner'
import Button from '../../shared/ui/Button/Button'
import Dialog from '../../shared/ui/Dialog/Dialog'
import Tabs from '../../shared/ui/Tabs/Tabs'
import PhotoCropper, { VIEW } from './PhotoCropper'
import styles from './AvatarDialog.module.css'

type Tab = 'emoji' | 'photo'

interface AvatarDialogProps {
  /** The name shown in the preview (initials when nothing is chosen). */
  name: string
  current: UserAvatar | null
  /** Resolves when saved; a rejection keeps the dialog open with the message. */
  onSave: (avatar: UserAvatar | null) => Promise<void>
  onClose: () => void
}

/**
 * Pick an avatar: an emoji on one of the plan colours, or a photo cropped to a circle in
 * the browser (nothing is uploaded anywhere: the saved square is a small data URL in the
 * profile). The page mounts it only while open, so every opening starts from what is saved.
 */
export default function AvatarDialog({ name, current, onSave, onClose }: AvatarDialogProps) {
  const { t } = useTranslation(['profile', 'common'])
  const [tab, setTab] = useState<Tab>(current?.kind === 'photo' ? 'photo' : 'emoji')
  const [emoji, setEmoji] = useState(current?.kind === 'emoji' ? current.emoji : '🎬')
  const [color, setColor] = useState<AvatarColor>(
    current?.kind === 'emoji' ? current.color : 'default',
  )
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null)
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // The object URL of a chosen photo is released when it is replaced and when the dialog closes.
  useEffect(() => {
    const url = photo?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo])

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // The same file can be chosen again after an error.
    if (!file) return
    setError(null)
    try {
      setPhoto(await loadPhoto(file))
      setCrop({ zoom: 1, x: 0, y: 0 })
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === 'too-big'
            ? 'avatar.photo.tooBig'
            : 'avatar.photo.notImage',
        ),
      )
    }
  }

  // The preview follows the emoji tab live; on the photo tab the cropper is the preview.
  const preview: UserAvatar | null = tab === 'emoji' ? { kind: 'emoji', emoji, color } : current

  async function save(avatar: UserAvatar | null) {
    setSaving(true)
    setError(null)
    try {
      await onSave(avatar)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  function savePhoto() {
    if (!photo) return
    const url = renderPhoto(
      photo.img,
      VIEW,
      clampCrop(photo.img.naturalWidth, photo.img.naturalHeight, VIEW, crop),
    )
    if (!url) return setError(t('avatar.photo.tooLarge'))
    void save({ kind: 'photo', photo: url })
  }

  const canSave = tab === 'emoji' ? true : photo !== null

  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      title={t('avatar.title')}
      footer={
        <>
          {current && (
            <Button
              variant="ghost"
              className={styles.remove}
              disabled={saving}
              onClick={() => void save(null)}
            >
              {t('avatar.remove')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            icon="check"
            loading={saving}
            disabled={!canSave}
            onClick={() =>
              tab === 'emoji' ? void save({ kind: 'emoji', emoji, color }) : savePhoto()
            }
          >
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.preview}>
          <Avatar name={name} avatar={preview} size={72} />
        </div>
        <Tabs<Tab>
          label={t('avatar.tabs')}
          panelId="avatar-panel"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'emoji', label: t('avatar.emojiTab') },
            { value: 'photo', label: t('avatar.photoTab') },
          ]}
        />

        <div id="avatar-panel" role="tabpanel" className={styles.panel}>
          {tab === 'emoji' ? (
            <>
              <fieldset className={styles.group}>
                <legend className={styles.legend}>{t('avatar.color')}</legend>
                <div className={styles.swatches}>
                  {AVATAR_COLORS.map((value) => (
                    <label key={value} className={styles.swatch} data-color={value}>
                      <input
                        type="radio"
                        name="avatar-color"
                        value={value}
                        checked={color === value}
                        onChange={() => setColor(value)}
                      />
                      <span className="sr-only">{t(`avatar.colors.${value}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend className={styles.legend}>{t('avatar.emoji')}</legend>
                <div className={styles.emojis}>
                  {AVATAR_EMOJIS.map((value) => (
                    <label key={value} className={styles.emoji}>
                      <input
                        type="radio"
                        name="avatar-emoji"
                        value={value}
                        checked={emoji === value}
                        onChange={() => setEmoji(value)}
                      />
                      <span aria-hidden="true">{value}</span>
                      <span className="sr-only">{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className={styles.file}
                aria-label={t('avatar.photo.choose')}
                onChange={(event) => void choose(event)}
              />
              {photo ? (
                <PhotoCropper
                  src={photo.url}
                  width={photo.img.naturalWidth}
                  height={photo.img.naturalHeight}
                  crop={crop}
                  onChange={setCrop}
                />
              ) : (
                <p className={styles.hint}>{t('avatar.photo.intro')}</p>
              )}
              <Button icon="plus" onClick={() => fileInput.current?.click()}>
                {t(photo ? 'avatar.photo.another' : 'avatar.photo.choose')}
              </Button>
            </>
          )}
        </div>
        {error && (
          <Banner tone="warning" icon="alert">
            {error}
          </Banner>
        )}
      </div>
    </Dialog>
  )
}
