import React from 'react'
import ReactDOM from 'react-dom/client'
import Embed from './Embed.tsx'
import "./index.css"

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Embed />
  </React.StrictMode>,
)

