

import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Pages/Home';
import Projects from './Pages/Projects';
import Landing from './Pages/Landing';
import ConsultantLogin from './Pages/ConsultantLogin';
import ClientLogin from './Pages/ClientLogin';
import ClientCard from './components/cards/ClientCard';
import ProtectedRoute from './utils/ProtectedRoute';
import { useAuth } from './utils/AuthContext';
import Templates from './Pages/Templates';

function App() {
  const { currentUser } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* The new landing page is the entry point */}
        <Route path="/" element={<Landing />} />

        {/* Public routes for login */}
        <Route path='/consultant-login' element={
          currentUser ? <Navigate to="/dashboard" replace /> : <ConsultantLogin />
        } />
        <Route path='/client-login' element={<ClientLogin />} />
        <Route path='/client/project/:projectId' element={<ClientCard />} />
        
        {/* Protected routes - assuming dashboard is the main view after login */}
        <Route path='/dashboard' element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path='/projects' element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        } />
        <Route path='/templates' element={
          <ProtectedRoute>
            <Templates />
          </ProtectedRoute>
        } />
        
        {/* Redirect any unknown/root paths for authenticated users to the dashboard */}
        <Route path='*' element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
