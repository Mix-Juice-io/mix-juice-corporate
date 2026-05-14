import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import AnalyticsTracker from './components/AnalyticsTracker'
import HomePage from './pages/HomePage'
import ServicePage from './pages/ServicePage'
import ContactPage from './pages/ContactPage'
import FLabelPage from './pages/FLabelPage'
import FLabelTermsPage from './pages/FLabelTermsPage'
import FLabelPrivacyPage from './pages/FLabelPrivacyPage'

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AnalyticsTracker />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/service/f-label" element={<FLabelPage />} />
          <Route path="/service/f-label/terms" element={<FLabelTermsPage />} />
          <Route path="/service/f-label/privacy" element={<FLabelPrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}

export default App
