import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import InfoSidebar from '../components/layout/InfoSidebar';
import { loadContent } from '../utils/contentUtils';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ClientInfoPageView = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Get the project ID from sessionStorage to enable back navigation
    const projectId = sessionStorage.getItem('currentProjectId');

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
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="flex flex-1 overflow-hidden">
                    <InfoSidebar />
                    <div className="flex-1 overflow-y-auto">
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
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="flex flex-1 overflow-hidden">
                    <InfoSidebar />
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 text-center text-red-500 flex-grow">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="flex flex-1 overflow-hidden">
                    <InfoSidebar />
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-8 text-center text-slate-500 flex-grow">Page not found.</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="flex flex-1 overflow-hidden">
                <InfoSidebar />
                <div className="flex-1 overflow-y-auto">
                    <main className="p-8 flex-grow">
                        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
                            <header className="flex items-center justify-between mb-8 border-b border-slate-200 pb-6">
                                <h1 className="text-3xl font-bold text-slate-800">{page.title}</h1>
                                {projectId && (
                                    <button
                                        onClick={() => navigate(`/client/project/${projectId}`)}
                                        className="flex items-center gap-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 shadow-sm transition-all duration-200"
                                    >
                                        <BackIcon />
                                        <span>Back to Project</span>
                                    </button>
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
                </div>
            </div>
        </div>
    );
};

export default ClientInfoPageView;
