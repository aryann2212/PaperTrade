import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';
import { TradingProvider } from './contexts/TradingContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TradingProvider>
        <App />
      </TradingProvider>
    </ErrorBoundary>
  </StrictMode>,
)
