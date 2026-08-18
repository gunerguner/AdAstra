import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppError, logAppError, toAppError } from '@/shared/errors/appError'
import { ErrorPanel } from './ErrorPanel'
import styles from './ErrorBoundary.module.css'

type Props = {
  children: ReactNode
}

type State = {
  error: AppError | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: toAppError(error, 'render') }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    logAppError(error, info.componentStack ?? 'ErrorBoundary')
  }

  override render() {
    if (!this.state.error) return this.props.children
    return (
      <main className={styles.shell}>
        <ErrorPanel
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      </main>
    )
  }
}
