import React, { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { Link } from 'react-router-dom';
import companyLogo from '../assets/companyLogo2.avif'; // Import the logo

const Logo = () => (
    <img src={companyLogo} alt="Company Logo" className="w-65 mx-auto mb-6" />
);

const ConsultantLogin = () => {
    const { login, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await login(email, password);
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');
        try {
            await signInWithGoogle();
        } catch (err) {
            setError('Failed to sign in with Google.');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 relative">
                <Link to="/" className="absolute top-4 left-4 text-slate-500 hover:text-slate-800" aria-label="Back to landing">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                </Link>
                <Logo />
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Consultant Login</h2>
                <p className="text-center text-slate-500 mb-8">Access the project dashboard.</p>
                
                {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="you@example.com"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="text-sm font-medium text-slate-700">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full mt-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:bg-blue-400"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div>
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-slate-50"
                        disabled={isLoading}
                    >
                        <img className="h-5 w-5 mr-3" src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
                        Sign in with Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConsultantLogin;
