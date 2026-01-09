import React, { useEffect } from 'react';
import Navbar from './components/Navbar';
import TradeDashboard from './pages/TradeDashboard';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { TradingProvider, useTrading } from './contexts/TradingContext';
import ErrorBoundary from './components/ErrorBoundary';

function MainContent() {
  const { user } = useTrading();

  if (!user) {
    return <Login />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <div className="layout-content">
        <TradeDashboard />
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TradingProvider>
        <MainContent />
      </TradingProvider>
    </ErrorBoundary>
  );
}

export default App;
