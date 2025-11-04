import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './pages/App'
import CaseDetail from './pages/CaseDetail'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/cases/:id', element: <CaseDetail /> }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
