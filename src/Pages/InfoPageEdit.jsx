import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import { useAuth } from '../utils/AuthContext';
import { loadContent, saveContent } from '../utils/contentUtils';
import { useInfoPages } from '../utils/InfoPageContext';
import IconPicker from '../components/forms/IconPicker';

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const InfoPageEdit = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const { fetchInfoPages } = useInfoPages();

    const [title, setTitle] = useState('');
    const [icon, setIcon] = useState('');
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const editorRef = useRef(null);
    
    const fetchPage = useCallback(async () => {
        if (!pageId) return;
        try {
            const data = await ApiCaller(`/info-pages/${pageId}`);
            const content = await loadContent('informational_pages', pageId, 'pageContent');
            // Let RichTextEditor handle content type detection and parsing
            setPage({  content: content || '' });
            setTitle(data.title);
            setIcon(data.icon || '');
        } catch (err) {
            setError('Failed to load the page content.');
            console.error(err);
        } finally {
            setIsLoading(false);
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
            await saveContent('informational_pages', pageId, 'pageContent', content);
            
            if (title !== page?.title || icon !== (page?.icon || '')) {
                await ApiCaller(`/info-pages/${pageId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ title, icon }),
                });
            }
            
            await fetchInfoPages(); // Refetch pages to update sidebar
            navigate(`/info/${pageId}`);
        } catch (err) {
            setError('Failed to save changes.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

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
                <div className="flex items-center w-full gap-4">
                    <div className="w-48">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                        <IconPicker
                            selectedIcon={icon}
                            onIconChange={setIcon}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="w-full">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-2xl font-bold text-slate-800 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter Page Title"
                        />
                    </div>
                </div>
                <div className="flex gap-3 ml-4">
                    <button
                        onClick={() => navigate(`/info/${pageId}`)}
                        className="px-6 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                        <DeleteIcon />
                        Delete
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
                    onChange={(content) => {
                        // Update the local content state as the user types
                        // This is optional since we're using editorRef for saving
                        console.log('Content changed:', content);
                    }}
                    editorRef={editorRef}
                    sourceTable="image_assets" 
                    sourceRecordId={pageId}
                />
            </div>
        </div>
    );
};

export default InfoPageEdit;
