import React, { useState, useEffect } from 'react';
// Note: The following import path is based on your project structure.
// Ensure '../utils/AirtableAPI' is correct.
import { UPDATE_MULTIPLE_RECORDS, GET_FILTERED_RECORDS, CREATE_RECORDS } from '../utils/AirtableAPI';

// --- SVG Icons ---
// Using inline SVGs for better performance and no external dependencies.
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const ClipboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);


// --- Main Card Component ---
export default function Card ({ data, onClose}) {
    const [projectData, setProjectData] = useState(data);
    const [copied, setCopied] = useState(false);
    const [actions, setActions] = useState([]);
    const [isLoadingActions, setIsLoadingActions] = useState(true);
    const [isAddingAction, setIsAddingAction] = useState(false);
    const [newAction, setNewAction] = useState({ description: '', estCompletion: '' });
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setProjectData(data);
    }, [data]);

    useEffect(() => {
        const fetchActions = async () => {
            if (!projectData.fields['Project ID']) return;
            setIsLoadingActions(true);
            try {
                const actionRecords = await GET_FILTERED_RECORDS(projectData.fields['Project ID']);
                setActions(actionRecords.records || actionRecords);
            } catch (error) {
                console.error("Failed to fetch actions:", error);
                setActions([]);
            } finally {
                setIsLoadingActions(false);
            }
        };
        fetchActions();
    }, [projectData]); 

    const handleCopy = (textToCopy) => {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    };
    
    const StatusBadge = ({ status }) => {
        const baseStyle = "px-2.5 py-0.5 text-xs font-medium rounded-full inline-block";
        let colorStyle = "bg-slate-100 text-slate-700";
        if (status) {
            switch (status.toLowerCase()) {
                case 'completed': colorStyle = "bg-emerald-100 text-emerald-800"; break;
                case 'in progress': colorStyle = "bg-amber-100 text-amber-800"; break;
                case 'pending': colorStyle = "bg-rose-100 text-rose-800"; break;
                default: break;
            }
        }
        return <span className={`${baseStyle} ${colorStyle}`}>{status || 'N/A'}</span>;
    };

    const handleActionChange = async (action, field, value) => {
        const updates = {
            id: action.id,
            fields: { [field]: value }
          };
        try {
            await UPDATE_MULTIPLE_RECORDS([updates], 'actions');
            setActions(currentActions =>
                currentActions.map(act => 
                    act.id === action.id ? { ...act, fields: { ...act.fields, [field]: value } } : act
                )
            );
        } catch (error) {
            console.error("Failed to update action:", error);
        }
    };

    const handleNewActionInputChange = (field, value) => {
        setNewAction(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveNewAction = async () => {
        if (!newAction.description || !newAction.estCompletion) {
            alert("Please fill out all fields for the new action.");
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const recordToCreate = {
            fields: {
                'Project ID': [projectData.id],
                'action_description': newAction.description,
                'estimated_completion_date': newAction.estCompletion,
                'set_date': today,
                'completed': false,
            }
        };

        try {
            const response = await CREATE_RECORDS([recordToCreate], 'actions');
            const createdRecord = response.records[0];
            setActions(currentActions => [...currentActions, createdRecord]);
            setNewAction({ description: '', estCompletion: '' });
            setIsAddingAction(false);
        } catch (error) {
            console.error("Failed to create new action:", error);
            alert("There was an error saving the new action.");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        
        // NOTE: This is a SIMULATION.
        // A real-world scenario with Airtable requires a multi-step process:
        // 1. Get a temporary signed URL from Airtable.
        // 2. Upload the file to that URL.
        // 3. Use the returned URL to update the project record's attachment field.
        // Since we don't have a dedicated upload function, we'll simulate this.

        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create a fake attachment object, as Airtable would provide
        const fakeUploadedDoc = {
            id: 'att' + Math.random().toString(36).substring(2, 11),
            url: URL.createObjectURL(file), // Use a local URL for viewing
            filename: file.name,
            size: file.size,
            type: file.type
        };

        const existingDocs = projectData.fields.Documents || [];
        const updatedDocs = [...existingDocs, fakeUploadedDoc];

        try {
            // This would update the record in Airtable.
            // For the simulation, we'll just update the local state.
            // await UPDATE_MULTIPLE_RECORDS([{ id: projectData.id, fields: { Documents: updatedDocs } }], 'Projects');

            // Optimistically update the UI
            setProjectData(currentData => ({
                ...currentData,
                fields: {
                    ...currentData.fields,
                    Documents: updatedDocs
                }
            }));

        } catch (error) {
            console.error("Failed to upload document:", error);
            alert("Error uploading file. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes'
    
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    
        const i = Math.floor(Math.log(bytes) / Math.log(k))
    
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50">
            <div className="relative w-full h-full flex flex-col">
                
                <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
                    <button onClick={onClose} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 shadow-sm transition-all duration-200" aria-label="Back">
                        <BackIcon />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-800">{projectData.fields['Project Name']}</h1>
                        <p className="text-xs text-slate-500 font-mono">ID: {projectData.fields['Project ID']}</p>
                    </div>
                    <button className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-all duration-200" aria-label="Edit">
                         <EditIcon />
                         <span className="hidden sm:inline">Edit</span>
                    </button>
                </header>

                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">Project Details</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Assigned Consultant:</span> <span className="text-slate-800">{projectData.fields['Assigned Consultant']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">State:</span> <span className="text-slate-800">{projectData.fields['States']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Project Type:</span> <span className="text-slate-800">{projectData.fields['Project Type']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">IRS Identifier:</span> <span className="text-slate-800">{projectData.fields['IRS Identifier (ID/EIN)']}</span></div>
                                    <div className="flex justify-between items-center col-span-1 md:col-span-2">
                                        <span className="font-medium text-slate-500">Client Email:</span>
                                        <div className="flex items-center gap-2">
                                            <a href={`mailto:${projectData.fields['Client Email']}`} className="text-blue-600 hover:underline">{projectData.fields['Client Email']}</a>
                                            <button onClick={() => handleCopy(projectData.fields['Client Email'])} className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 transition" title="Copy Email">
                                                <ClipboardIcon />
                                            </button>
                                            {copied && <span className="text-emerald-500 text-xs transition-opacity duration-300">Copied!</span>}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-700 mb-2">📝 Notes</h2>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {projectData.fields['Notes'] || 'No notes available.'}
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-slate-700">📎 Documents</h2>
                                    <label className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer">
                                        <UploadIcon />
                                        Upload File
                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                    </label>
                                </div>
                                <ul className="space-y-2">
                                    {isUploading && (
                                        <li className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-200 opacity-70">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent"></div>
                                                <span className="text-sm font-medium text-slate-500">Uploading...</span>
                                            </div>
                                        </li>
                                    )}
                                    {projectData.fields.Documents && projectData.fields.Documents.length > 0 ? (
                                        projectData.fields.Documents.map(doc => (
                                            <li key={doc.id} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition">
                                                <div className="flex items-center gap-3">
                                                    <DocumentIcon />
                                                    <button onClick={() => setSelectedDocument(doc.url)} className="text-sm font-medium text-blue-600 hover:underline text-left">
                                                        {doc.filename}
                                                    </button>
                                                </div>
                                                <span className="text-xs text-slate-500">{formatBytes(doc.size)}</span>
                                            </li>
                                        ))
                                    ) : (
                                        !isUploading && <p className="text-sm text-slate-500 text-center py-2">No documents attached.</p>
                                    )}
                                </ul>
                            </section>

                            {/* Actions Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-slate-700">⚡️ Actions</h2>
                                    {!isAddingAction && (
                                        <button onClick={() => setIsAddingAction(true)} className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all">
                                            <AddIcon />
                                            Add Action
                                        </button>
                                    )}
                                </div>

                                {isAddingAction && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4 space-y-3">
                                        <input type="text" placeholder="Action description..." value={newAction.description} onChange={(e) => handleNewActionInputChange('description', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                                        <input type="date" placeholder="Estimated completion date" value={newAction.estCompletion} onChange={(e) => handleNewActionInputChange('estCompletion', e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm text-slate-500" />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsAddingAction(false)} className="text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md">Cancel</button>
                                            <button onClick={handleSaveNewAction} className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md">Save</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {isLoadingActions ? (
                                        <p className="text-sm text-slate-500 text-center py-4">Loading actions...</p>
                                    ) : actions && actions.length > 0 ? (
                                        actions.map((action) => (
                                            <div key={action.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <input type="checkbox" checked={action.fields.completed || false} onChange={(e) => handleActionChange(action, 'completed', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer" aria-label="Action completed" />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-800 font-medium">{action.fields.action_description}</p>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                            <span>Created: <span className="font-semibold text-slate-600">{action.fields.set_date}</span></span>
                                                            <span>Est. Completion: <span className="font-semibold text-slate-600">{action.fields.estimated_completion_date}</span></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500 text-center py-4">No actions found for this project.</p>
                                    )}
                                </div>
                            </section>

                            {/* Document Viewer Section */}
                            {selectedDocument && (
                                <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h2 className="text-lg font-semibold text-slate-700">📄 Document Viewer</h2>
                                        <button onClick={() => setSelectedDocument(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full transition-colors" aria-label="Close document viewer">
                                            <CloseIcon />
                                        </button>
                                    </div>
                                    <div className="w-full h-[80vh] rounded-lg border border-slate-300 overflow-hidden bg-slate-200">
                                        <iframe src={selectedDocument} title="Document Viewer" width="100%" height="100%" frameBorder="0" />
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">Project Status</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Current Status:</span><StatusBadge status={projectData.fields['Status']} /></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submitted:</span><span className="font-semibold text-slate-800">{projectData.fields['Submitted (Y/N)']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Balance:</span><span className="font-semibold text-slate-800">{projectData.fields['Balance']}</span></div>
                                </div>
                            </section>
                            
                            <section className="bg-amber-50 border-amber-200 p-5 rounded-xl border shadow-sm">
                                <h2 className="text-lg font-semibold text-amber-800 mb-2 text-center">⏳ Pending Action</h2>
                                <div className="bg-white rounded-md p-3 border border-amber-200 text-sm text-center text-amber-900">{projectData.fields['Pending Action (Client, Consulting or State)'] || 'All actions complete.'}</div>
                            </section>
                            
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">Key Dates</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Last Updated:</span><span className="font-semibold text-slate-800">{projectData.fields['Last Updated']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submission Date:</span><span className="font-semibold text-slate-800">{projectData.fields['Date of Submission']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Est. Completion:</span><span className="font-semibold text-slate-800">{projectData.fields['Estimated Completion']}</span></div>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
