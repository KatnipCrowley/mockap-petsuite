import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import 'leaflet/dist/leaflet.css'
import './styles/styles.css'
import './styles/design.css'
import './styles/design-pages.css'
import './styles/design-polish.css'
import './styles/design-suite.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`))
}
