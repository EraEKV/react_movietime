import { Suspense, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import PageLoader from '../../shared/ui/PageLoader/PageLoader'

/**
 * Loading boundary for the page area. Router navigations run in a transition, and React
 * never replaces a page that is already on screen with a fallback during a transition: the
 * old page just stays while the next page's chunk downloads, so a tap on a link seems to do
 * nothing. A boundary that is new on every navigation (the `key`) is allowed to show its
 * skeleton at once, so the person sees the page is loading. If the chunk is already there,
 * nothing suspends and no skeleton appears.
 */
export default function PageSuspense({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <Suspense key={pathname} fallback={<PageLoader />}>
      {children}
    </Suspense>
  )
}
