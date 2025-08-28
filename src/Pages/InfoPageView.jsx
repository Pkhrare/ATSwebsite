import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import { useAuth } from '../utils/AuthContext';
import { loadContent } from '../utils/contentUtils';

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const InfoPageView = () => {
    const { pageId } = useParams();
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { userRole } = useAuth();
    
    // Debug logging
    console.log('InfoPageView: userRole from useAuth():', userRole);
    console.log('InfoPageView: localStorage userRole:', localStorage.getItem('userRole'));

    useEffect(() => {
        const fetchPage = async () => {
            if (!pageId) return;
            setIsLoading(true);
            setError(null);
            try {
                const data = await ApiCaller(`/info-pages/${pageId}`);
                
                // Load content from attachment with fallback to old content field
                const content = await loadContent('informational_pages', pageId, 'pageContent');
                
                setPage({
                    ...data,
                    content: content // This will be the content from attachment or fallback
                });
            } catch (err) {
                setError('Failed to load the page content.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPage();
    }, [pageId]);

    if (isLoading) {
        return (
            <div className="p-8 flex-grow">
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
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
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
                <header className="flex justify-between items-center mb-6 border-b pb-4">
                    <h1 className="text-3xl font-bold text-slate-800">{page.title}</h1>
                    {userRole === 'consultant' && (
                        <Link
                            to={`/info/edit/${pageId}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            <EditIcon />
                            Edit Page
                        </Link>
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
