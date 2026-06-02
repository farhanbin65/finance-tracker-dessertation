import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import './index.css'

const domain      = import.meta.env.VITE_AUTH0_DOMAIN
const clientId    = import.meta.env.VITE_AUTH0_CLIENT_ID
const callbackUrl = import.meta.env.VITE_AUTH0_CALLBACK_URL

console.log('CALLBACK URL:', import.meta.env.VITE_AUTH0_CALLBACK_URL)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Auth0 wraps everything — must be outermost provider */}
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: import.meta.env.VITE_AUTH0_CALLBACK_URL
        }}
      >
        {/* Theme wraps App — so every page gets CSS variables */}
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Auth0Provider>
    </BrowserRouter>
  </React.StrictMode>
)