import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiCaller from '../components/apiCall/ApiCaller';
import RichTextEditor from '../components/richText/RichTextEditor';
import { useAuth } from '../utils/AuthContext';

// --- Icons (re-used from other components for consistency) ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);


const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}


const InfoPageEdit = () => {
    const { pageId } = useParams();
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [title, setTitle] = useState('');
    const [page, setPage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const editorRef = useRef(null);
    
    const fetchPage = useCallback(async () => {
        if (!pageId) return;
        // Don't set loading to true on refetch, to avoid UI flicker
        try {
            const data = await ApiCaller(`/info-pages/${pageId}`);
            setPage(data);
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

            await ApiCaller(`/info-pages/${pageId}`, {
                method: 'PATCH',
                body: JSON.stringify({ title, content }),
            });
            navigate(`/info/${pageId}`);
        } catch (err) {
            setError('Failed to save changes.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await ApiCaller(`/upload/informational_pages/${pageId}/pageAttachments`, {
                method: 'POST',
                body: formData,
            });
            await fetchPage(); // Refetch the page to show the new attachment
        } catch (error) {
            console.error('File upload failed:', error);
            alert('File upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm('Are you sure you want to delete this attachment?')) {
            return;
        }
        try {
            await ApiCaller(`/delete-attachment/informational_pages/${pageId}/pageAttachments/${attachmentId}`, {
                method: 'DELETE',
            });
            await fetchPage(); // Refetch page data to remove the attachment from the list
        } catch (err) {
            alert('Failed to delete attachment.');
            console.error(err);
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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
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

                <div className="lg:col-span-1">
                    <section className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                         <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-semibold text-slate-700">Attachments</h2>
                            <label className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer">
                                <UploadIcon />
                                Upload
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </label>
                        </div>
                        <ul className="space-y-2">
                            {isUploading && (
                                <li className="flex items-center justify-center bg-slate-100 p-3 rounded-lg border border-slate-200 opacity-70">
                                    <div className="w-5 h-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent mr-3"></div>
                                    <span className="text-sm font-medium text-slate-500">Uploading...</span>
                                </li>
                            )}
                            {page?.attachment && page.attachment.length > 0 ? (
                                page.attachment.map(doc => (
                                    <li key={doc.id} className="flex items-center justify-between bg-white hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <DocumentIcon />
                                            <span className="text-sm font-medium text-blue-600 truncate" title={doc.filename}>
                                                {doc.filename}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{formatBytes(doc.size)}</span>
                                            <button 
                                                onClick={() => handleDeleteAttachment(doc.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                                aria-label="Delete attachment"
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                !isUploading && <p className="text-sm text-slate-500 text-center py-2">No attachments.</p>
                            )}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default InfoPageEdit;
