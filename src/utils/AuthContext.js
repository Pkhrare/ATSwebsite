import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  const login = () => {
    console.log("Logging in with:", userName, password);
    
  };

  return (
    <AuthContext.Provider value={{ userName, setUserName, password, setPassword, login }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for easier usage
export const useAuth = () => useContext(AuthContext);
