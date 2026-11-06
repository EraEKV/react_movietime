import { useState } from 'react'

type Errors<K extends string> = Partial<Record<K, string | null>>

/**
 * Small controlled-form helper: values, validation and *when* to show errors.
 * An error appears after the field loses focus once (blur) or after a submit attempt,
 * not while the user is still typing the first characters.
 */
export function useForm<K extends string>(
  initial: Record<K, string>,
  validate: (values: Record<K, string>) => Errors<K>,
) {
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  // Derived on every render: no extra state to keep in sync with the values.
  const allErrors = validate(values)
  const errors: Errors<K> = {}
  for (const key of Object.keys(values) as K[]) {
    if (submitted || touched[key]) errors[key] = allErrors[key] ?? null
  }

  return {
    values,
    errors,
    setValue: (key: K, value: string) => setValues((v) => ({ ...v, [key]: value })),
    blur: (key: K) => setTouched((t) => ({ ...t, [key]: true })),
    /** Marks the form as submitted; returns true when every field is valid. */
    trySubmit: () => {
      setSubmitted(true)
      return Object.values(allErrors).every((error) => !error)
    },
  }
}
