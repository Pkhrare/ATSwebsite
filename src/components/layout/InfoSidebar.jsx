import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ApiCaller from '../apiCall/ApiCaller';
import { useAuth } from '../../utils/AuthContext';
import AddInfoPageForm from '../forms/AddInfoPageForm';
import { colorClasses } from '../../utils/colorUtils';

const InfoSidebar = () => {
    const [pages, setPages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { userRole } = useAuth();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const navigate = useNavigate();
    


    const fetchInfoPages = async () => {
        try {
            const data = await ApiCaller('/info-pages');
            setPages(data || []);
        } catch (err) {
            setError('Failed to load informational pages.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInfoPages();
    }, []);

    const handlePageAdded = (newPage) => {
        setIsAddModalOpen(false);
        fetchInfoPages(); // Refetch the list to show the new page in the sidebar

        // Defensive check: only navigate if we received a valid page object with an ID
        const pageToNavigate = Array.isArray(newPage) ? newPage[0] : newPage;

        if (pageToNavigate && pageToNavigate.id) {
            navigate(`/info/${pageToNavigate.id}`);
        } else {
            // If navigation fails, the user still sees the updated list. This is a graceful failure.
            console.error("Failed to navigate automatically, the API response might be malformed:", newPage);
        }
    };

    const linkStyle = `block px-4 py-2 text-sm ${colorClasses.sidebar.text} rounded-md ${colorClasses.sidebar.hover} transition-colors`;
    const activeLinkStyle = `bg-[#fef3c7] text-[#d97706] font-semibold`; // Yellow-100 bg, Yellow-600 text

    if (isLoading) {
        return (
            <div className={`w-64 p-4 ${colorClasses.sidebar.base} flex-shrink-0`}>
                <h3 className={`text-xs font-semibold ${colorClasses.sidebar.textSecondary} uppercase tracking-wider mb-3`}>Information</h3>
                <div className="space-y-2">
                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded`}></div>
                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded`}></div>
                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded`}></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`w-64 p-4 ${colorClasses.sidebar.base} flex-shrink-0`}>
                <p className={`text-sm ${colorClasses.status.error}`}>{error}</p>
            </div>
        );
    }

    return (
        <aside className={`w-64 p-4 ${colorClasses.sidebar.base} flex-shrink-0`}>
            <h3 className={`text-xs font-semibold ${colorClasses.sidebar.textSecondary} uppercase tracking-wider mb-3`}>Information</h3>
            <nav className="space-y-1">
                {pages.map(page => (
                    <NavLink
                        key={page.id}
                        to={userRole === 'client' ? `/client/info/${page.id}` : `/info/${page.id}`}
                        className={({ isActive }) => `${linkStyle} ${isActive ? activeLinkStyle : ''}`}
                    >
                        {page.title}
                    </NavLink>
                ))}
            </nav>

            {userRole === 'consultant' && (
                <div className={`mt-6 pt-4 border-t ${colorClasses.sidebar.border}`}>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className={`w-full px-4 py-2 text-sm font-medium ${colorClasses.button.secondary} rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#d97706] transition-all`}>
                        + Add New Page
                    </button>
                </div>
            )}
            {isAddModalOpen && (
                <AddInfoPageForm
                    onClose={() => setIsAddModalOpen(false)}
                    onPageAdded={handlePageAdded}
                />
            )}
        </aside>
    );
};

export default InfoSidebar;
