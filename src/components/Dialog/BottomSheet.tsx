import Dialog, { type DialogProps } from './Dialog'

/** Mobile overlay for filters, episode details and pickers. */
export default function BottomSheet(props: Omit<DialogProps, 'variant'>) {
  return <Dialog {...props} variant="sheet" />
}
