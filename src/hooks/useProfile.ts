import { useEffect, useState } from 'react'
import { watchProfile } from '../services/profileService'
import type { UserProfile } from '../types/auth'

type ProfileState =
  | { status: 'loading'; profile: null; error: null }
  | { status: 'error'; profile: null; error: unknown }
  | { status: 'success'; profile: UserProfile | null; error: null }

interface Stored {
  uid: string | null
  profile: UserProfile | null
  error: unknown
}

/**
 * Live `users/{uid}` document. onSnapshot pushes every change (and cached data offline);
 * the effect's cleanup unsubscribes when the uid changes or the page unmounts.
 */
export function useProfile(uid: string | null): ProfileState {
  const [stored, setStored] = useState<Stored>({ uid: null, profile: null, error: null })

  useEffect(() => {
    if (!uid) return
    return watchProfile(
      uid,
      (profile) => setStored({ uid, profile, error: null }),
      (error) => setStored({ uid, profile: null, error }),
    )
  }, [uid])

  // Data for another uid (or none yet) means the subscription for this one hasn't answered.
  if (!uid || stored.uid !== uid) return { status: 'loading', profile: null, error: null }
  if (stored.error) return { status: 'error', profile: null, error: stored.error }
  return { status: 'success', profile: stored.profile, error: null }
}
