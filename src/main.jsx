import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import IdentityShell from './IdentityShell.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import './identity.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <IdentityShell />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
