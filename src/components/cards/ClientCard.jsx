import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import RichTextEditor from '../richText/RichTextEditor';
import TaskCard from './TaskCard';
import ApiCaller from '../apiCall/ApiCaller';

const apiFetch = async (endpoint, options = {}) => {
        return await ApiCaller(endpoint, options);
};

const toLexical = (text) => {
    if (!text) return null;
    try {
        JSON.parse(text);
        return text;
    } catch (e) {
        return JSON.stringify({
            root: { children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] }
        });
    }
};

const fromLexical = (lexicalJSON) => {
    try {
        const parsed = JSON.parse(lexicalJSON);
        return parsed.root.children.map(p => p.children.map(c => c.text).join('')).join('\n');
    } catch (e) {
        return lexicalJSON;
    }
};

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
);
const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
);
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
);

export default function ClientCard() {
    const { state } = useLocation();
    const { projectId } = useParams();
    const [projectData, setProjectData] = useState(state?.project || null);
    const [isLoading, setIsLoading] = useState(!state?.project);
    const [error, setError] = useState(null);

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editedDetails, setEditedDetails] = useState({});
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const notesRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const data = await apiFetch(`/records/projects/${projectId}`);
                setProjectData(data);
                setEditedDetails(data.fields);
                notesRef.current = toLexical(data.fields.Notes);
            } catch (err) {
                setError('Failed to load project data.');
            } finally {
                setIsLoading(false);
            }
        };

        if (!projectData) {
            fetchProject();
        } else {
            setEditedDetails(projectData.fields);
            notesRef.current = toLexical(projectData.fields.Notes);
        }
    }, [projectId, projectData]);

    const fetchTasksForProject = useCallback(async () => {
        if (!projectData?.fields['Project ID']) return;
        setIsLoadingTasks(true);
        try {
            const taskRecords = await apiFetch(`/records/filter/${projectData.fields['Project ID']}/tasks`);
            setTasks(taskRecords.records || []);
        } catch (error) {
            console.error("Failed to fetch tasks for project:", error);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [projectData]);

    useEffect(() => {
        if(projectData) fetchTasksForProject();
    }, [projectData, fetchTasksForProject]);

    const handleDetailChange = (field, value) => {
        setEditedDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDetails = async () => {
        const fieldsToUpdate = {
            'Client Email': editedDetails['Client Email'],
            'IRS Identifier (ID/EIN)': editedDetails['IRS Identifier (ID/EIN)'],
        };
        try {
            await apiFetch(`/records/projects/${projectData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: fieldsToUpdate }),
            });
            setProjectData(prev => ({ ...prev, fields: { ...prev.fields, ...fieldsToUpdate }}));
            setIsEditingDetails(false);
        } catch (err) {
            alert('Failed to save details.');
        }
    };

    const handleSaveNotes = async () => {
        try {
            const notesToSave = fromLexical(notesRef.current);
            await apiFetch(`/records/projects/${projectData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: { 'Notes': notesToSave } }),
            });
            setProjectData(prev => ({ ...prev, fields: { ...prev.fields, Notes: notesToSave } }));
            setIsEditingNotes(false);
        } catch (error) {
            alert("There was an error saving the notes.");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const updatedDocuments = await apiFetch(`/upload/projects/${projectData.id}`, {
                method: 'POST', body: formData, headers: {},
            });
            setProjectData(prev => ({...prev, fields: { ...prev.fields, Documents: updatedDocuments }}));
        } catch (error) {
            alert('File upload failed.');
        } finally {
            setIsUploading(false);
        }
    };
    
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    // Helper functions for tasks
    const getStatusColor = (status) => {
        switch (status) {
            case 'Not Started': return 'bg-gray-200 text-gray-800';
            case 'In Progress': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (isLoading) return <div className="text-center p-8">Loading project...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!projectData) return <div className="text-center p-8">Project not found.</div>;

    const { fields } = projectData;

    return (
        <>
            <div className="min-h-screen bg-slate-100 p-8">
                <div className="max-w-5xl mx-auto">
                    <header className="bg-white shadow-md rounded-lg p-6 mb-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800">{fields['Project Name']}</h1>
                                <p className="text-sm text-slate-500 font-mono">ID: {fields['Project ID']}</p>
                            </div>
                            <Link to="/" className="text-sm text-blue-600 hover:underline">Exit Portal</Link>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-slate-700 text-black">Your Information</h2>
                                    {isEditingDetails ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditingDetails(false)} className="text-sm font-medium text-slate-600">Cancel</button>
                                            <button onClick={handleSaveDetails} className="text-sm font-medium text-emerald-600">Save</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setIsEditingDetails(true)} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2 text-black"><EditIcon /> Edit</button>
                                    )}
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <label className="font-medium text-slate-500">Client Email</label>
                                        {isEditingDetails ? <input type="email" value={editedDetails['Client Email'] || ''} onChange={e => handleDetailChange('Client Email', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" /> : <p className="text-slate-800">{fields['Client Email']}</p>}
                                    </div>
                                    <div>
                                        <label className="font-medium text-slate-500">IRS Identifier (ID/EIN)</label>
                                        {isEditingDetails ? <input type="text" value={editedDetails['IRS Identifier (ID/EIN)'] || ''} onChange={e => handleDetailChange('IRS Identifier (ID/EIN)', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" /> : <p className="text-slate-800">{fields['IRS Identifier (ID/EIN)']}</p>}
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-xl font-semibold text-slate-700 text-black">Project Notes</h2>
                                </div>
                                <div className="bg-slate-50 p-4 rounded border whitespace-pre-wrap text-sm text-black">
                                    {fromLexical(notesRef.current) || 'No notes yet.'}
                                </div>
                            </section>

                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-xl font-semibold text-slate-700 text-black">Documents</h2>
                                    <label className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg cursor-pointer"><UploadIcon /> Upload File <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} /></label>
                                </div>
                                <ul className="space-y-2">
                                    {isUploading && <li>Uploading...</li>}
                                    {fields.Documents?.map(doc => <li key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"><a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2"><DocumentIcon />{doc.filename}</a><span className="text-xs text-slate-500">{formatBytes(doc.size)}</span></li>)}
                                </ul>
                            </section>

                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold text-slate-700 mb-4 text-black">Tasks</h2>
                                {isLoadingTasks ? <p>Loading tasks...</p> : (
                                    <ul className="divide-y divide-slate-200">
                                        {tasks.map(task => (
                                            <li key={task.id} onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }} className="p-4 hover:bg-slate-50 cursor-pointer">
                                                <div className="flex items-start gap-4">
                                                    <div className="relative w-12 h-12 flex-shrink-0">
                                                        <svg className="w-full h-full" viewBox="0 0 36 36">
                                                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-blue-500" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - ((task.fields.progress_bar || 0) * 100)} strokeLinecap="round" transform="rotate(-90 18 18)" />
                                                            <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="text-xs font-medium fill-slate-700">{Math.round((task.fields.progress_bar || 0) * 100)}%</text>
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-sm font-medium text-slate-800">{fromLexical(task.fields.task_title)}</h4>
                                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.fields.task_status)}`}>{task.fields.task_status}</span>
                                                        </div>
                                                        <div className="flex gap-4 text-xs text-slate-500 mb-2">
                                                            <span><span className="font-medium">Start:</span> {formatDate(task.fields.start_date)}</span>
                                                            <span><span className="font-medium">Due:</span> {formatDate(task.fields.due_date)}</span>
                                                        </div>
                                                        {task.fields.tags && (
                                                            <div className="mt-2 flex flex-wrap gap-1">
                                                                {task.fields.tags.split(',').map((tag, index) => (
                                                                    <span key={index} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">{tag.trim()}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>

                        <div className="space-y-6">
                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold text-slate-700 mb-4 text-black">Project Status</h2>
                                <p className="text-lg font-medium text-blue-600">{fields.Status}</p>
                            </section>
                            <section className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold text-slate-700 mb-4 text-black">Project Team</h2>
                                <ul className="space-y-2">
                                    <li className="text-sm text-slate-600 text-black">{fields['Assigned Consultant']} (Assigned)</li>
                                    {fields['collaborator_name']?.map((name, i) => <li key={i} className="text-sm text-slate-600 text-black">{name}</li>)}
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            {isTaskCardVisible && <TaskCard task={selectedTask} onClose={() => setIsTaskCardVisible(false)} onTaskUpdate={fetchTasksForProject} assigneeOptions={fields['collaborator_name'] || []} isClientView={true} />}
        </>
    );
} 