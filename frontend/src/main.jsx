import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../../design-system/src/styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />
)
