import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { libraryNoticeDismissed, selectLibraryNotice } from '../../store/librarySlice'
import Toast from '../Toast/Toast'

const NOTICE_MS = 6000

/**
 * App-wide toast for library events that don't belong to one page: guest titles synced
 * after sign-in, or a Firestore write that failed. Lives in Layout.
 */
export default function LibraryNotice() {
  const dispatch = useAppDispatch()
  const notice = useAppSelector(selectLibraryNotice)

  useEffect(() => {
    if (!notice) return
    const timerId = setTimeout(() => dispatch(libraryNoticeDismissed()), NOTICE_MS)
    return () => clearTimeout(timerId)
  }, [notice, dispatch])

  if (!notice) return null
  return (
    <Toast
      icon={notice.tone === 'success' ? 'check' : 'alert'}
      actionLabel="Dismiss"
      onAction={() => dispatch(libraryNoticeDismissed())}
    >
      {notice.text}
    </Toast>
  )
}
