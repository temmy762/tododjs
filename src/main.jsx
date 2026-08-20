import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import ResetPasswordPage from './components/ResetPasswordPage.jsx'
import PaymentSuccessPage from './components/PaymentSuccessPage.jsx'
import PaymentCancelPage from './components/PaymentCancelPage.jsx'
import ManageDevicesPage from './components/ManageDevicesPage.jsx'
import MetaPixelRouteTracker from './components/MetaPixelRouteTracker.jsx'
import { UploadProvider } from './context/UploadContext.jsx'
import './index.css'
import './i18n/config'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UploadProvider>
        {/* Reports SPA navigations to the Meta Pixel — index.html only fires
            the initial PageView, and this app never reloads the document. */}
        <MetaPixelRouteTracker />
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Standalone: reached from the device-limit email, no session required */}
          <Route path="/manage-devices" element={<ManageDevicesPage />} />
          <Route path="/subscription/success" element={<PaymentSuccessPage />} />
          <Route path="/subscription/cancel" element={<PaymentCancelPage />} />
          <Route path="*" element={<App />} />
        </Routes>
      </UploadProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
