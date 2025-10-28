import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';

const Sidebar = () => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [infoPages, setInfoPages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInfoPages = async () => {
            try {
                const data = await ApiCaller('/info/pages');
                setInfoPages(data.records || []);
            } catch (error) {
                console.error("Error fetching info pages:", error);
            }
        };
        fetchInfoPages();
    }, []);

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
                    {isOpen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    )}
                </button>

                <div className={`fixed top-0 left-0 h-full bg-slate-800 text-white w-64 z-40 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
                    <div className="p-4 mt-16">
                        <nav>
                            <ul>
                                <li className="mb-4">
                                    <Link to="/dashboard" className="block font-semibold hover:bg-slate-700 p-2 rounded-md" onClick={closeSidebar}>
                                        Home
                                    </Link>
                                </li>
                                <li className="mb-4">
                                    <button onClick={() => setIsInfoOpen(!isInfoOpen)} className="w-full flex justify-between items-center text-left font-semibold hover:bg-slate-700 p-2 rounded-md">
                                        <span>Information</span>
                                        <svg className={`w-4 h-4 transition-transform ${isInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isInfoOpen ? 'max-h-96' : 'max-h-0'}`}>
                                        <ul className="pl-4 mt-2">
                                            {infoPages.map(page => (
                                                <li key={page.id} className="mb-2">
                                                    <Link to={`/info/${page.id}`} className="block hover:bg-slate-700 p-2 rounded-md" onClick={closeSidebar}>
                                                        {page.fields.Name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </li>
                                <li className="mb-4">
                                    <button onClick={() => setIsProjectsOpen(!isProjectsOpen)} className="w-full flex justify-between items-center text-left font-semibold hover:bg-slate-700 p-2 rounded-md">
                                        <span>Projects</span>
                                        <svg className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isProjectsOpen ? 'max-h-96' : 'max-h-0'}`}>
                                        <ul className="pl-4 mt-2">
                                            <li className="mb-2">
                                                <Link to="/projects" className="block hover:bg-slate-700 p-2 rounded-md" onClick={closeSidebar}>
                                                    Active Projects
                                                </Link>
                                            </li>
                                            <li className="mb-2">
                                                <Link to="/templates" className="block hover:bg-slate-700 p-2 rounded-md" onClick={closeSidebar}>
                                                    Templates
                                                </Link>
                                            </li>
                                            <li className="mb-2">
                                                <Link to="/projects?tab=deactivated" className="block hover:bg-slate-700 p-2 rounded-md" onClick={closeSidebar}>
                                                    Deactivated Projects
                                                </Link>
                                            </li>
                                        </ul>
                                    </div>
                                </li>
                                <li>
                                    <button onClick={handleSignOut} className="w-full text-left font-semibold text-red-500 hover:bg-slate-700 p-2 rounded-md">
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
