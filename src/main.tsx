import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { supabaseClient } from './lib/supabaseClient.ts'
import './index.css'

// ✅ Expor globalmente para testes no console
;(window as any).supabaseClient = supabaseClient

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
