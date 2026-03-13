// /src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Context Providers
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './context/ToastContext'
import { HistoryProvider } from './context/HistoryContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <HistoryProvider>
          <AppProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AppProvider>
        </HistoryProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

