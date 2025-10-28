import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { useInfoPages } from '../../utils/InfoPageContext';

const Sidebar = () => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { pages: infoPages, isLoading: infoPagesLoading, error: infoPagesError } = useInfoPages();

    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            {/* Mobile Sidebar */}
            <div className="md:hidden">
                <button onClick={() => setIsOpen(!isOpen)} className="fixed top-4 left-4 z-50 p-2 bg-slate-700 text-white rounded-md transition-opacity duration-300 hover:opacity-80">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>

                <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white w-64 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out shadow-2xl`}>
                    {/* Header with close button */}
                    <div className="bg-slate-900 px-4 py-4 border-b border-slate-700 flex justify-end">
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                            aria-label="Close menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="p-4">
                        <nav>
                            <ul className="space-y-2">
                                {/* Home Section */}
                                <li>
                                    <Link 
                                        to="/dashboard" 
                                        className="flex items-center gap-3 px-3 py-2.5 text-slate-200 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200 font-medium" 
                                        onClick={closeSidebar}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                        Home
                                    </Link>
                                </li>

                                {/* Divider */}
                                <li className="border-t border-slate-700 my-4"></li>

                                {/* Information Section */}
                                <li>
                                    <button 
                                        onClick={() => setIsInfoOpen(!isInfoOpen)} 
                                        className="w-full flex justify-between items-center text-left px-3 py-2.5 text-slate-200 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200 font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Information
                                            {infoPages.length > 0 && (
                                                <span className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded-full">
                                                    {infoPages.length}
                                                </span>
                                            )}
                                        </div>
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isInfoOpen ? 'max-h-96' : 'max-h-0'}`}>
                                        <ul className="ml-6 mt-2 space-y-1 border-l-2 border-slate-600 pl-4">
                                            {infoPagesLoading ? (
                                                <li>
                                                    <span className="block px-3 py-2 text-slate-400 text-sm">
                                                        Loading...
                                                    </span>
                                                </li>
                                            ) : infoPagesError ? (
                                                <li>
                                                    <span className="block px-3 py-2 text-red-400 text-sm">
                                                        Error loading pages
                                                    </span>
                                                </li>
                                            ) : infoPages.length > 0 ? (
                                                infoPages.map(page => (
                                                    <li key={page.id}>
                                                        <Link 
                                                            to={`/info/${page.id}`} 
                                                            className="block px-3 py-2 text-slate-300 hover:bg-slate-600 hover:text-white rounded-md transition-colors duration-200 text-sm" 
                                                            onClick={closeSidebar}
                                                        >
                                                            {page.title}
                                                        </Link>
                                                    </li>
                                                ))
                                            ) : (
                                                <li>
                                                    <span className="block px-3 py-2 text-slate-400 text-sm">
                                                        No information pages available
                                                    </span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </li>

                                {/* Projects Section */}
                                <li>
                                    <button 
                                        onClick={() => setIsProjectsOpen(!isProjectsOpen)} 
                                        className="w-full flex justify-between items-center text-left px-3 py-2.5 text-slate-200 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200 font-medium"
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                            Projects
                                        </div>
                                        <svg className={`w-4 h-4 transition-transform duration-200 ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isProjectsOpen ? 'max-h-96' : 'max-h-0'}`}>
                                        <ul className="ml-6 mt-2 space-y-1 border-l-2 border-slate-600 pl-4">
                                            <li>
                                                <Link 
                                                    to="/projects" 
                                                    className="block px-3 py-2 text-slate-300 hover:bg-slate-600 hover:text-white rounded-md transition-colors duration-200 text-sm" 
                                                    onClick={closeSidebar}
                                                >
                                                    Active Projects
                                                </Link>
                                            </li>
                                            <li>
                                                <Link 
                                                    to="/templates" 
                                                    className="block px-3 py-2 text-slate-300 hover:bg-slate-600 hover:text-white rounded-md transition-colors duration-200 text-sm" 
                                                    onClick={closeSidebar}
                                                >
                                                    Templates
                                                </Link>
                                            </li>
                                            <li>
                                                <Link 
                                                    to="/projects?tab=deactivated" 
                                                    className="block px-3 py-2 text-slate-300 hover:bg-slate-600 hover:text-white rounded-md transition-colors duration-200 text-sm" 
                                                    onClick={closeSidebar}
                                                >
                                                    Deactivated Projects
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </li>

                                {/* Divider */}
                                <li className="border-t border-slate-700 my-4"></li>

                                {/* Sign Out Section */}
                                <li>
                                    <button 
                                        onClick={handleSignOut} 
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors duration-200 font-medium"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign out
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;