import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="596937966421-53mo6kdqs67n080ghjg8s2df1c80ve6t.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)
