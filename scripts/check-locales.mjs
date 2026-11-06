// Every language must have the same keys as English (plural forms aside), because the app
// runs without a fallback language. Usage: npm run check:locales
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('../public/locales/', import.meta.url).pathname
const PLURAL = /_(zero|one|two|few|many|other)$/

function keys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key.replace(PLURAL, '')}`],
  )
}

const read = (lang, file) => JSON.parse(readFileSync(join(root, lang, file), 'utf8'))
const files = readdirSync(join(root, 'en')).filter((file) => file.endsWith('.json'))
let problems = 0

for (const lang of ['ru', 'kk']) {
  for (const file of files) {
    const expected = new Set(keys(read('en', file)))
    const actual = new Set(keys(read(lang, file)))
    for (const key of expected) {
      if (!actual.has(key)) (problems++, console.error(`${lang}/${file}: missing ${key}`))
    }
    for (const key of actual) {
      if (!expected.has(key)) (problems++, console.error(`${lang}/${file}: unknown ${key}`))
    }
  }
}

if (problems) process.exit(1)
console.log(`Locales OK: ${files.length} namespaces × en, ru, kk`)
