import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  
  useEffect(() => {
    console.log("ProtectedRoute - Authentication state:", currentUser ? "Authenticated" : "Not authenticated");
  }, [currentUser]);
  
  if (!currentUser) {
    console.log("ProtectedRoute - Redirecting to login page");
    // User is not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }
  
  // User is authenticated, render the protected component
  console.log("ProtectedRoute - Rendering protected content");
  return children;
};

export default ProtectedRoute; 