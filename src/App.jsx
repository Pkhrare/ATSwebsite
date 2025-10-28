

import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './Pages/Home';
import Projects from './Pages/Projects';
import Landing from './Pages/Landing';
import ConsultantLogin from './Pages/ConsultantLogin';
import ClientLogin from './Pages/ClientLogin';
import ProjectDeactivated from './Pages/ProjectDeactivated';
import ClientCard from './components/cards/ClientCard';
import ProtectedRoute from './utils/ProtectedRoute';
import { useAuth } from './utils/AuthContext';
import Templates from './Pages/Templates';
import Layout from './components/layout/Layout';
import InfoPageView from './Pages/InfoPageView';
import InfoPageEdit from './Pages/InfoPageEdit';
import ClientInfoPageView from './Pages/ClientInfoPageView';
import JsonRichTextEditor from './Pages/JsonRichTextEditor';
import CombinedLicenseIntroPage from './Pages/ProjectPageForms/CombinedLicenseIntroPage';
import EnrollmentIntroPage from './Pages/ProjectPageForms/EnrollmentIntroPage';
import PolicyProcedureIntroPage from './Pages/ProjectPageForms/PolicyProcedureIntroPage';
import PostSubmissionPage from './Pages/PostSubmissionPage';
import QuickIntroPage from './Pages/ProjectPageForms/QuickIntroPage';
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
        <Route path='/project-deactivated' element={<ProjectDeactivated />} />
        <Route path='/client/project/:projectId' element={<ClientCard />} />
        <Route path="/combined-license-form" element={<CombinedLicenseIntroPage />} />
        <Route path="/enrollment-form" element={<EnrollmentIntroPage />} />
        <Route path="/policy-procedure-form" element={<PolicyProcedureIntroPage />} />
        <Route path="/quick-intro-form" element={<QuickIntroPage />} />
        <Route path="/submission-success" element={<PostSubmissionPage />} />
        
        {/* Client-specific info pages (sidebar only, no navbar) */}
        <Route path='/client/info/:pageId' element={<ClientInfoPageView />} />
        
        {/* Protected routes wrapped by the persistent Layout component */}
        <Route 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path='/dashboard' element={<Home />} />
          <Route path='/projects' element={<Projects />} />
          <Route path='/templates' element={<Templates />} />
          <Route path='/json-editor' element={<JsonRichTextEditor />} />
          <Route path='/info/:pageId' element={<InfoPageView />} />
          <Route path='/info/edit/:pageId' element={<InfoPageEdit />} />
        </Route>
        
        {/* Redirect any unknown/root paths for authenticated users to the dashboard */}
        <Route path='*' element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
