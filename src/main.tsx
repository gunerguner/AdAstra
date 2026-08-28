/** 挂 React 根、语言环境和错误边界；生产注册 Service Worker。 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import App from './app/App'
import { ErrorBoundary } from './shared/ui'
import { AppError, logAppError, toAppError } from './shared/errors/appError'
import { LocaleProvider } from '@/i18n'
import './styles/index.css'

const root = document.getElementById('root')
if (!root) throw new AppError('render', 'error.rootMissing')

createRoot(root).render(
  <StrictMode>
    <LocaleProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </LocaleProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js')
      } catch (error) {
        logAppError(toAppError(error, 'service-worker'), 'error.swRegister')
      }
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch((error) => logAppError(error, 'error.swUnregisterDev'))
  }
}
