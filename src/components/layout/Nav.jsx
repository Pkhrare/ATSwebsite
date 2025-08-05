import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

const Nav = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <nav className="bg-white shadow-sm border-b border-slate-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6m-6 4.5h6M3.75 3h16.5c.621 0 1.125.504 1.125 1.125v16.5A1.125 1.125 0 0120.25 21H3.75A1.125 1.125 0 012.625 19.875V4.125C2.625 3.504 3.129 3 3.75 3z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">
                            Project Manager
                        </h1>
                    </div>
                    <div className="hidden md:block">
                        <ul className="ml-10 flex items-baseline space-x-4">
                            {currentUser ? (
                                <>
                                    <li><Link to="/dashboard" className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">Home</Link></li>
                                    <li><Link to="/projects" className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">Projects</Link></li>
                                    <li>
                                        <button 
                                            onClick={handleLogout}
                                            className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                                        >
                                            Sign out
                                        </button>
                                    </li>
                                </>
                            ) : (
                                <li><Link to="/login" className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium">Login</Link></li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Nav;