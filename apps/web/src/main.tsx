import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LiftsProvider } from './lib/LiftsContext'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/ironlogs">
      <LiftsProvider>
        <App />
      </LiftsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
