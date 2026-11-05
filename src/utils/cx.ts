/** Joins class names, skipping falsy values: cx('a', isOn && 'b') → 'a b' or 'a'. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
