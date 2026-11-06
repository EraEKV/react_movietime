/**
 * Intl with a safety net for Kazakh. Safari and Firefox ship Kazakh locale data, but Chrome
 * doesn't: `Intl.DateTimeFormat('kk')` there prints "Fri" and "Month: M11", and numbers come
 * out as "9,000.5". So when the browser has no Kazakh data:
 * - numbers use Russian rules — the same as Kazakh ones ("9 000,5", "63 млн $");
 * - month and weekday names and relative words come from the small tables below.
 * Every formatter in utils goes through this file, so the rest of the app just passes a locale.
 */

const KK_MONTHS = [
  'қаңтар',
  'ақпан',
  'наурыз',
  'сәуір',
  'мамыр',
  'маусым',
  'шілде',
  'тамыз',
  'қыркүйек',
  'қазан',
  'қараша',
  'желтоқсан',
]
const KK_MONTHS_SHORT = [
  'қаң.',
  'ақп.',
  'нау.',
  'сәу.',
  'мам.',
  'мау.',
  'шіл.',
  'там.',
  'қыр.',
  'қаз.',
  'қар.',
  'жел.',
]
// Index = Date.getDay(): Sunday first.
const KK_WEEKDAYS = ['жексенбі', 'дүйсенбі', 'сейсенбі', 'сәрсенбі', 'бейсенбі', 'жұма', 'сенбі']
const KK_WEEKDAYS_SHORT = ['жс', 'дс', 'сс', 'ср', 'бс', 'жм', 'сб']
const KK_UNITS: Partial<Record<Intl.RelativeTimeFormatUnit, string>> = {
  second: 'секунд',
  minute: 'минут',
  hour: 'сағат',
  day: 'күн',
}
const KK_LANGUAGES: Record<string, string> = {
  en: 'ағылшын тілі',
  ru: 'орыс тілі',
  kk: 'қазақ тілі',
  ko: 'корей тілі',
  ja: 'жапон тілі',
  zh: 'қытай тілі',
  hi: 'хинди тілі',
  fr: 'француз тілі',
  es: 'испан тілі',
  de: 'неміс тілі',
  it: 'итальян тілі',
  pt: 'португал тілі',
  tr: 'түрік тілі',
  uk: 'украин тілі',
  sv: 'швед тілі',
  da: 'дат тілі',
}

const nativeData = new Map<string, boolean>()

/** True when the browser really formats this locale (Cyrillic month name for kk). */
function hasNativeData(locale: string): boolean {
  if (locale !== 'kk') return true
  let known = nativeData.get(locale)
  if (known === undefined) {
    const month = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
      Date.UTC(2020, 0, 15),
    )
    known = /[Ѐ-ӿ]/.test(month)
    nativeData.set(locale, known)
  }
  return known
}

const fallback = (locale: string) => !hasNativeData(locale)

/** Locale for number formatting: Kazakh without data borrows Russian (same separators). */
export const numberLocale = (locale: string) => (fallback(locale) ? 'ru' : locale)

export function formatNumberWith(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(numberLocale(locale), options).format(value)
}

/** 2 → "2h" / "2 ч" / "2 сағ" (narrow unit). */
export function formatUnitWith(value: number, unit: 'hour' | 'minute', locale: string): string {
  if (fallback(locale)) return `${value} ${unit === 'hour' ? 'сағ' : 'мин'}`
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(value)
}

/** Intl.DateTimeFormat#format, or the Kazakh tables when the browser has no data. */
export function formatDateWith(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: string,
): string {
  if (!fallback(locale)) return new Intl.DateTimeFormat(locale, options).format(date)

  const utc = options.timeZone === 'UTC'
  const year = utc ? date.getUTCFullYear() : date.getFullYear()
  const month = utc ? date.getUTCMonth() : date.getMonth()
  const day = utc ? date.getUTCDate() : date.getDate()
  const weekday = utc ? date.getUTCDay() : date.getDay()
  const medium = options.dateStyle === 'medium'

  const parts: string[] = []
  if (medium || options.day) parts.push(String(day))
  if (medium || options.month === 'short') parts.push(KK_MONTHS_SHORT[month]!)
  else if (options.month) parts.push(KK_MONTHS[month]!)
  if (medium || options.year) parts.push(`${year} ж.`)

  let text = parts.join(' ')
  if (options.weekday) {
    const name = (options.weekday === 'long' ? KK_WEEKDAYS : KK_WEEKDAYS_SHORT)[weekday]!
    text = text ? `${name}, ${text}` : name
  }
  if (options.timeStyle === 'short') {
    const hours = utc ? date.getUTCHours() : date.getHours()
    const minutes = utc ? date.getUTCMinutes() : date.getMinutes()
    text += `, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  return text
}

/** Intl.RelativeTimeFormat with numeric: 'auto' ("yesterday", "5 minutes ago"). */
export function formatRelativeWith(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
): string {
  if (!fallback(locale)) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit)
  }
  if (unit === 'second' && value === 0) return 'қазір'
  if (unit === 'day' && Math.abs(value) <= 1) return ['кеше', 'бүгін', 'ертең'][value + 1]!
  const word = KK_UNITS[unit] ?? unit
  return value < 0 ? `${-value} ${word} бұрын` : `${value} ${word} кейін`
}

const KK_REGIONS: Record<string, string> = {
  KZ: 'Қазақстан',
  RU: 'Ресей',
  US: 'АҚШ',
  GB: 'Ұлыбритания',
  UA: 'Украина',
  BY: 'Беларусь',
  UZ: 'Өзбекстан',
  KG: 'Қырғызстан',
  TR: 'Түркия',
  DE: 'Германия',
  FR: 'Франция',
  IT: 'Италия',
  ES: 'Испания',
  CA: 'Канада',
  AU: 'Австралия',
  JP: 'Жапония',
  KR: 'Оңтүстік Корея',
  CN: 'Қытай',
  IN: 'Үндістан',
  PL: 'Польша',
}

/** "Kazakhstan" / "Казахстан" / "Қазақстан" for an ISO 3166-1 code (a code that has no name stays itself). */
export function regionNameWith(code: string, locale: string): string {
  // Chrome has no Kazakh Intl data: a short table, then English for the rest.
  if (fallback(locale))
    return KK_REGIONS[code] ?? new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

/** "English" / "английский" / "ағылшын тілі" for an ISO 639-1 code. */
export function languageNameWith(code: string, locale: string): string {
  if (fallback(locale)) return KK_LANGUAGES[code] ?? code
  return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code
}
