// The calendar subscription link (api/ics.ts): the secret in it and the address it makes.

/** 24 random bytes as 32 URL-safe characters (base64url without padding): 192 bits. */
export function newFeedToken(
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (bytes) => crypto.getRandomValues(bytes),
): string {
  const bytes = random(new Uint8Array(24))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** What the rules and the server accept as a token. */
export const isFeedToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{32}$/.test(value)

/** The address to paste into Google Calendar ("From URL"). */
export const feedUrl = (origin: string, token: string) => `${origin}/api/calendar/${token}.ics`
