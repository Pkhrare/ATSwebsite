import React from 'react';
import { Link } from 'react-router-dom';
import companyLogo from '../assets/companyLogo2.avif'; // Import the logo

// You can replace this with your actual logo component or image
const Logo = () => (
    <img src={companyLogo} alt="Company Logo" className="w-95 mx-auto mb-8" />
);

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <div className="max-w-md w-full text-center p-8">
                <Logo />
                <h1 className="text-4xl font-bold text-slate-800 mb-4">Project Manager</h1>
                <p className="text-slate-600 mb-12">Select your login method to continue.</p>

                <div className="space-y-4">
                    <Link
                        to="/consultant-login"
                        className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span>Consultant Login</span>
                    </Link>
                    <Link
                        to="/client-login"
                        className="w-full flex items-center justify-center gap-3 bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-slate-800 transition-transform transform hover:scale-105"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span>Client Login</span>
                    </Link>
                </div>
            </div>
        </div>
    );
} 