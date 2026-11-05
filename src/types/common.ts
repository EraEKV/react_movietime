/** An option for selects, tabs and radio groups. Values are strings because they live in the URL or in form state. */
export interface Option<V extends string = string> {
  value: V
  label: string
}

/** Lifecycle of a request, derived by the data hooks. */
export type RequestStatus = 'idle' | 'loading' | 'error' | 'success'
