import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ResetPasswordPage from './components/ResetPasswordPage.jsx'
import PaymentSuccessPage from './components/PaymentSuccessPage.jsx'
import PaymentCancelPage from './components/PaymentCancelPage.jsx'
import './index.css'
import './i18n/config'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/subscription/success" element={<PaymentSuccessPage />} />
        <Route path="/subscription/cancel" element={<PaymentCancelPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
