import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import { useAuth } from '../utils/AuthContext';
import { loadContent, saveContent } from '../utils/contentUtils';




const InfoPageEdit = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [title, setTitle] = useState('');
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [error, setError] = useState(null);

    const editorRef = useRef(null);
    
    const fetchPage = useCallback(async () => {
        if (!pageId) return;
        // Don't set loading to true on refetch, to avoid UI flicker
        try {
            const data = await ApiCaller(`/info-pages/${pageId}`);
            
            // Load content from attachment with fallback to old content field
            const content = await loadContent('informational_pages', pageId, 'pageContent');
            
            setPage({
                ...data,
                content: content // This will be the content from attachment or fallback
            });
            setTitle(data.title);
        } catch (err) {
            setError('Failed to load the page content.');
            console.error(err);
        } finally {
            setIsLoading(false); // Only set loading false once on initial load
        }
    }, [pageId]);

    useEffect(() => {
        setIsLoading(true);
        fetchPage();
    }, [fetchPage]);


    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            const editorState = editorRef.current.getEditorState();
            const content = JSON.stringify(editorState.toJSON());

            // Save content as attachment
            await saveContent('informational_pages', pageId, 'pageContent', content);
            
            // Only update title if it has changed
            if (title !== page?.title) {
                await ApiCaller(`/info-pages/${pageId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ title }),
                });
            }
            
            navigate(`/info/${pageId}`);
        } catch (err) {
            setError('Failed to save changes.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };




    if (userRole !== 'consultant') {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p className="text-slate-600">You do not have permission to edit this page.</p>
            </div>
        );
    }
    
    if (isLoading) return <div className="p-8"><p>Loading page for editing...</p></div>;
    if (error) return <div className="p-8"><p className="text-red-500">{error}</p></div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-3xl font-bold text-slate-800 w-full p-2 -ml-2 rounded-md hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="Enter Page Title"
                />
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/info/${pageId}`)}
                        className="px-6 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
            
            <div className="max-w-none">
                <label className="block text-lg font-semibold text-slate-700 mb-2">
                    Content
                </label>
                <RichTextEditor
                    isEditable={true}
                    initialContent={page?.content}
                    editorRef={editorRef}
                    sourceTable="image_assets" 
                    sourceRecordId={pageId}
                />
            </div>
        </div>
    );
};

export default InfoPageEdit;
