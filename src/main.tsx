import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope/wght.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/600.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AppError, logAppError, toAppError } from './engine/appError'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new AppError('render', '找不到应用根节点')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('ad-astra-update-ready'))
            }
          })
        })
      } catch (error) {
        logAppError(toAppError(error, 'service-worker'), '离线缓存注册失败，将继续使用在线模式')
      }
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    }).catch((error) => logAppError(error, '注销开发环境 Service Worker'))
  }
}
