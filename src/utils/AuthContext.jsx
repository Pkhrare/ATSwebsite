import React, { createContext, useState, useContext, useEffect } from 'react';

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

console.log("Firebase config loaded:", Object.keys(firebaseConfig).length > 0 ? "Config present" : "Config missing");

let auth;
let provider;
let firebaseInitialized = false;

try {
    const firebaseApp = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    auth = getAuth(firebaseApp);
    provider = new GoogleAuthProvider();
    firebaseInitialized = true;

    // Set persistence to LOCAL to keep the user logged in
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.log("Firebase persistence set to LOCAL"))
      .catch((error) => {
        console.error("Auth persistence error:", error);
      });
} catch (error) {
    console.error("Error initializing Firebase:", error);
}

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole')); // Initialize from localStorage

    useEffect(() => {
        if (!firebaseInitialized) {
            console.error("Firebase not initialized, skipping auth listener");
            setLoading(false);
            return;
        }

        console.log("Setting up auth state change listener");
        // Subscribe to auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("Auth state changed:", user ? "User logged in" : "No user");
            setCurrentUser(user);
            // When auth state changes, we rely on the role already in state/localStorage
            // We no longer hardcode it here.
            if (!user) {
                // If user is null (logged out), clear the role
                setUserRole(null);
                localStorage.removeItem('userRole');
            }
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, []);

    const loginWithEmail = (email, password) => {
        if (!firebaseInitialized) {
            console.error("Firebase not initialized, cannot login");
            return Promise.reject(new Error("Firebase not initialized"));
        }

        console.log("Attempting email login");
        return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("Email login successful for consultant");
            setCurrentUser(userCredential.user);
            setUserRole('consultant'); // Set role for consultant
            localStorage.setItem('userRole', 'consultant');
            return userCredential;
        });
    };

    const startClientSession = () => {
        // This function doesn't authenticate, it just sets the role for the session
        console.log("Starting a client session");
        setUserRole('client');
        localStorage.setItem('userRole', 'client');
    };

    const logout = () => {
        if (!firebaseInitialized) {
            console.error("Firebase not initialized, cannot logout");
            return Promise.reject(new Error("Firebase not initialized"));
        }

        console.log("Attempting logout");
        return signOut(auth)
        .then(() => {
            console.log("Logout successful");
            setCurrentUser(null);
            setUserRole(null); // Clear role on logout
            localStorage.removeItem('userRole');
        });
    };

    const signInWithGoogle = () => {
        if (!firebaseInitialized) {
            console.error("Firebase not initialized, cannot sign in with Google");
            return Promise.reject(new Error("Firebase not initialized"));
        }

        console.log("Attempting Google sign in");
        return signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Google sign in successful");
            setCurrentUser(result.user);
            // Assuming Google sign-in is for consultants
            setUserRole('consultant');
            localStorage.setItem('userRole', 'consultant');
            return result;
        });
    };

    const value = {
        currentUser,
        loginWithEmail,
        startClientSession, // Expose the new session function
        logout,
        signInWithGoogle,
        userRole // Add userRole to context value
    };

    console.log("AuthProvider rendering, loading:", loading, "user:", currentUser ? "logged in" : "not logged in", "role:", userRole);

    // Don't render children until we've checked for a logged-in user
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};