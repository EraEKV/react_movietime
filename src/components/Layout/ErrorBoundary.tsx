import { Component, type ReactNode } from 'react'
import { isChunkError, recoverOnce } from '../../shared/lib/staleApp'
import LoadError from './LoadError'

interface Props {
  children: ReactNode
  /** Changes with the route: moving to another page clears the error. */
  resetKey?: string
}

interface State {
  failed: boolean
  stale: boolean
}

/**
 * Without a boundary an error while drawing removes the whole React tree and leaves a black
 * page. The one in Layout keeps the header and tab bar; the one in main.tsx is the last net.
 * A page file that is gone after a deploy starts a refresh of the app by itself.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, stale: false }

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, stale: isChunkError(error) }
  }

  componentDidCatch(error: unknown) {
    console.error('A page failed to render', error)
    if (isChunkError(error)) recoverOnce()
  }

  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false, stale: false })
    }
  }

  render() {
    return this.state.failed ? <LoadError stale={this.state.stale} /> : this.props.children
  }
}
