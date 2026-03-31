import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './i18n'
import App from './App'
import './index.css'
import { applyThemePreference, getStoredThemePreference } from '@/theme/config'

applyThemePreference(getStoredThemePreference())

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
