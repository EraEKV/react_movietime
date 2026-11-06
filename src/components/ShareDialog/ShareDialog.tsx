import { useTranslation } from 'react-i18next'
import { useRef, useState, type FormEvent } from 'react'
import { useTimedState } from '../../hooks/useTimedState'
import type { Member, MemberRole, Visibility } from '../../types/sharing'
import { cx } from '../../utils/cx'
import { membersOf, memberName, roleLabel, validateInvite } from '../../utils/sharing'
import i18n, { translatedOption } from '../../i18n'
import Avatar from '../Avatar/Avatar'
import { RoleBadge } from '../Badge/ListBadges'
import Banner from '../Banner/Banner'
import Button from '../Button/Button'
import { buttonClass } from '../Button/variants'
import Dialog from '../Dialog/Dialog'
import Icon from '../Icon/Icon'
import Menu from '../Menu/Menu'
import SelectField from '../SelectField/SelectField'
import Switch from '../Switch/Switch'
import TextField from '../TextField/TextField'
import styles from './ShareDialog.module.css'

const ROLE_OPTIONS = [
  translatedOption('editor' as const, 'role.editor'),
  translatedOption('viewer' as const, 'role.viewer'),
]

export interface ShareDialogProps {
  open: boolean
  onClose: () => void
  /** Name of the shared list or plan, for the title. */
  name: string
  url: string
  owner: { name: string; email: string | null; photoUrl: string | null }
  visibility: Visibility
  roles: Record<string, MemberRole>
  /** All actions resolve when the server has the change; a rejection is shown in the dialog. */
  onVisibilityChange: (visibility: Visibility) => Promise<void>
  onInvite: (email: string, role: MemberRole) => Promise<void>
  onRoleChange: (email: string, role: MemberRole) => Promise<void>
  onRemove: (email: string) => Promise<void>
}

/**
 * The one sharing dialog for lists and plans: link switch + copy, invite by email with a
 * role, and the people with access. It only talks through callbacks, so the page decides
 * which service and document it changes. The list itself comes back through the live
 * snapshot, so the dialog never keeps its own copy of the members.
 */
export default function ShareDialog(props: ShareDialogProps) {
  const { t } = useTranslation(['sharing', 'common'])
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('share.title', { name: props.name })}
      footer={
        <Button variant="primary" onClick={props.onClose}>
          {t('share.done')}
        </Button>
      }
    >
      {/* A separate component: Dialog mounts children only while open, so every opening
          starts with an empty invite field and no old errors. */}
      <ShareDialogBody {...props} />
    </Dialog>
  )
}

function ShareDialogBody({
  url,
  owner,
  visibility,
  roles,
  onVisibilityChange,
  onInvite,
  onRoleChange,
  onRemove,
}: ShareDialogProps) {
  const { t } = useTranslation(['sharing', 'common'])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, showCopied] = useTimedState<'copied' | 'manual'>(2500)
  // Removing access is instant (no confirm), so it can be undone for a few seconds.
  const [removed, showRemoved, clearRemoved] = useTimedState<Member>(8000)
  const linkRef = useRef<HTMLInputElement>(null)
  const members = membersOf({ roles })
  const linkOn = visibility === 'link'

  /** Changes that the snapshot shows at once: not awaited, a failure lands in the banner. */
  function run(action: Promise<void>) {
    setActionError(null)
    action.catch((error: unknown) => setActionError(messageOf(error)))
  }

  async function handleCopy() {
    try {
      // Needs a secure context (https or localhost) and may be refused by the browser.
      await navigator.clipboard.writeText(url)
      showCopied('copied')
    } catch {
      // Fallback: select the text so the user can copy it with the keyboard.
      linkRef.current?.select()
      showCopied('manual')
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault()
    const problem = validateInvite(email, { ownEmail: owner.email, roles })
    if (problem) return setInviteError(problem)
    if (!navigator.onLine) return setInviteError(t('share.offline'))
    setInviting(true)
    try {
      await onInvite(email, role)
      setEmail('')
      setInviteError(null)
    } catch (error) {
      setInviteError(messageOf(error))
    } finally {
      setInviting(false)
    }
  }

  return (
    <>
      <section className={styles.link} aria-label={t('share.linkSection')}>
        <Switch
          label={t('share.linkSwitch')}
          description={t('share.linkHint')}
          checked={linkOn}
          onChange={(on) => run(onVisibilityChange(on ? 'link' : 'private'))}
        />
        {linkOn && (
          <div className={styles.copyRow}>
            <TextField
              ref={linkRef}
              label={t('share.linkSection')}
              hideLabel
              icon="link"
              value={url}
              onChange={() => {}}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              hint={copied === 'manual' ? t('share.copyManual') : undefined}
            />
            <Button icon={copied === 'copied' ? 'check' : 'copy'} onClick={() => void handleCopy()}>
              {copied === 'copied' ? t('share.copied') : t('share.copy')}
            </Button>
          </div>
        )}
        {/* Announces the result of Copy to screen readers. */}
        <span className="sr-only" aria-live="polite">
          {copied === 'copied' ? t('share.linkCopied') : ''}
        </span>
      </section>

      <form className={styles.invite} onSubmit={(e) => void handleInvite(e)} noValidate>
        <div className={styles.inviteRow}>
          <div className={styles.email}>
            <TextField
              label={t('share.inviteLabel')}
              type="email"
              autoComplete="off"
              inputMode="email"
              placeholder={t('share.invitePlaceholder')}
              value={email}
              onChange={(value) => {
                setEmail(value)
                setInviteError(null)
              }}
              error={inviteError}
            />
          </div>
          <SelectField
            className={styles.role}
            label={t('share.role')}
            value={role}
            options={ROLE_OPTIONS}
            onChange={setRole}
          />
          <Button type="submit" className={styles.inviteButton} loading={inviting}>
            {t('share.invite')}
          </Button>
        </div>
        <p className={styles.note}>
          <Icon name="info" size={16} />
          <span>{t('share.inviteNote')}</span>
        </p>
      </form>

      <section aria-labelledby="share-people">
        <h3 id="share-people" className={styles.peopleTitle}>
          {t('share.people')}
        </h3>
        <ul className={styles.people}>
          <li className={styles.person}>
            <Avatar name={owner.name} photoUrl={owner.photoUrl} size={36} />
            <div className={styles.who}>
              <span className={styles.name}>{t('share.you', { name: owner.name })}</span>
              {owner.email && <span className={styles.address}>{owner.email}</span>}
            </div>
            <RoleBadge role="owner" />
          </li>
          {members.map((member) => (
            <li key={member.email} className={styles.person}>
              <Avatar name={memberName(member.email)} size={36} />
              <div className={styles.who}>
                <span className={styles.name}>{memberName(member.email)}</span>
                <span className={styles.address}>{member.email}</span>
              </div>
              <Menu
                label={t('share.access', { email: member.email, role: roleLabel(member.role) })}
                align="right"
                triggerClassName={cx(buttonClass('ghost', 'sm'), styles.roleTrigger)}
                trigger={
                  <>
                    {roleLabel(member.role)}
                    <Icon name="chevron-down" size={16} />
                  </>
                }
                items={[
                  ...ROLE_OPTIONS.map((option) => ({
                    label: option.label,
                    checked: member.role === option.value,
                    onSelect: () => {
                      if (option.value !== member.role) {
                        run(onRoleChange(member.email, option.value))
                      }
                    },
                  })),
                  { kind: 'divider' as const },
                  {
                    label: t('share.removeAccess'),
                    icon: 'trash' as const,
                    danger: true,
                    onSelect: () => {
                      run(onRemove(member.email))
                      showRemoved(member)
                    },
                  },
                ]}
              />
            </li>
          ))}
        </ul>
        {members.length === 0 && (
          <p className={styles.empty}>{linkOn ? t('share.emptyLink') : t('share.emptyPrivate')}</p>
        )}
      </section>

      {removed && (
        <Banner
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                run(onInvite(removed.email, removed.role))
                clearRemoved()
              }}
            >
              {t('common:actions.undo')}
            </Button>
          }
        >
          {t('share.removed', { email: removed.email })}
        </Banner>
      )}
      {actionError && (
        <Banner tone="warning" icon="alert">
          {actionError}
        </Banner>
      )}
    </>
  )
}

function messageOf(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'permission-denied') return i18n.t('sharing:share.errorOwner')
  if (error instanceof Error && !code) return error.message
  return i18n.t('sharing:share.errorSave')
}
