import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import TradeDashboard from './pages/TradeDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import { TradingProvider, useTrading } from './contexts/TradingContext';
import ErrorBoundary from './components/ErrorBoundary';

function AppRoutes() {
  const { user } = useTrading();

  if (user && user.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
      <Route path="/" element={
        <div className="app-container">
          <Navbar />
          <div className="layout-content">
            <TradeDashboard />
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TradingProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TradingProvider>
    </ErrorBoundary>
  );
}

export default App;
