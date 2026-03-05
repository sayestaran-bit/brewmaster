// /src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Context Providers
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'

console.log("🛠️ MAIN.JSX: Iniciando el montaje de React...");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
console.log("✅ MAIN.JSX: Montaje solicitado a createRoot.");
