/** The colour of an emoji avatar: `default` is the soft accent tint, the rest are plan tokens. */
export type AvatarColor =
  'default' | 'plan-1' | 'plan-2' | 'plan-3' | 'plan-4' | 'plan-5' | 'plan-6'

/**
 * The avatar a user chose (`users/{uid}.avatar`): an emoji on a colour, or a photo kept in
 * the profile itself as a small data URL (no storage bucket). Without one, the Google photo
 * or the initials show.
 */
export type UserAvatar =
  { kind: 'emoji'; emoji: string; color: AvatarColor } | { kind: 'photo'; photo: string }
