import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import { useAuth } from '../utils/AuthContext';
import { loadContent } from '../utils/contentUtils';
import { useInfoPages } from '../utils/InfoPageContext';
import { IconRenderer } from '../components/forms/IconPicker';

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);


const InfoPageView = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { userRole } = useAuth();
    const { fetchInfoPages } = useInfoPages();
    
    useEffect(() => {
        const fetchPage = async () => {
            if (!pageId) return;
            setIsLoading(true);
            setError(null);
            try {
                const data = await ApiCaller(`/info-pages/${pageId}`);
                const content = await loadContent('informational_pages', pageId, 'pageContent');
                setPage({ ...data, content });
            } catch (err) {
                setError('Failed to load the page content.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPage();
    }, [pageId]);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
            try {
                await ApiCaller(`/info-pages/${pageId}`, { method: 'DELETE' });
                await fetchInfoPages(); // Refetch pages to update sidebar
                navigate('/info'); // Navigate to a neutral page after deletion
            } catch (err) {
                setError('Failed to delete the page. Please try again.');
                console.error(err);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 flex-grow">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <div className="h-10 bg-slate-200 rounded animate-pulse w-3/4 mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-center text-red-500 flex-grow">{error}</div>;
    }

    if (!page) {
        return <div className="p-8 text-center flex-grow">Page not found.</div>;
    }

    return (
        <main className="flex-grow p-6">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <header className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center">
                        <IconRenderer icon={page.icon} className="w-8 h-8 mr-4 text-slate-600" />
                        {page.title}
                    </h1>
                    {userRole === 'consultant' && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                                <DeleteIcon />
                                Delete
                            </button>
                            <Link
                                to={`/info/edit/${pageId}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            >
                                <EditIcon />
                                Edit Page
                            </Link>
                        </div>
                    )}
                </header>

                <div className="prose max-w-none">
                    <RichTextEditor
                        isEditable={false}
                        initialContent={page.content}
                    />
                </div>
            </div>
        </main>
    );
};

export default InfoPageView;
