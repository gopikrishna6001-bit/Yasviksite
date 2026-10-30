import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Cache-bust token — change when CDN must pick up a new main bundle.
console.info('[yasvik]', __YASVIK_BUILD_ID__)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
