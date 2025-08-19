import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TaskCard from './TaskCard';
import AddTaskToProjectForm from '../forms/AddTaskToProjectForm';
import AddCollaboratorForm from '../forms/AddCollaboratorForm';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parse, format, isValid } from 'date-fns';
import { dropdownFields, DEFAULT_ACTIVITIES, safeNewDate } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';


// Helper function to fetch from the backend API
const apiFetch = async (endpoint, options = {}) => {
    // Directly return the promise from ApiCaller, which resolves to the JSON data
    return ApiCaller(endpoint, options);
};


// --- SVG Icons ---
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

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
    </svg>
);

const CollaboratorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.226A3 3 0 0118 15.75M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);


// --- Main Card Component ---
export default function Card({ data, onClose, onProjectUpdate }) {
    const { userRole } = useAuth();
    const [projectData, setProjectData] = useState(data);
    const [copied, setCopied] = useState(false);
    const [actions, setActions] = useState([]);
    const [isLoadingActions, setIsLoadingActions] = useState(true);
    const [isAddingAction, setIsAddingAction] = useState(false);
    const [newAction, setNewAction] = useState({ description: '', estCompletion: '' });
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [activities, setActivities] = useState([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const [changedActivities, setChangedActivities] = useState({ toCreate: new Map(), toUpdate: new Map() });
    const [editingCell, setEditingCell] = useState(null);
    const [activeEditingDate, setActiveEditingDate] = useState(null); // New state for the date picker
    const [isUpdatingActivities, setIsUpdatingActivities] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesContent, setNotesContent] = useState('');
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [editedDetails, setEditedDetails] = useState({});
    const [isAddCollaboratorVisible, setIsAddCollaboratorVisible] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState(false);

    // Task-related states
    const [tasks, setTasks] = useState([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);
    const [isAddTaskFormVisible, setIsAddTaskFormVisible] = useState(false);

    const fetchTasksForProject = useCallback(async () => {
        console.log('fetching tasks for project');
        if (!projectData.fields['Project ID']) return;
        setIsLoadingTasks(true);
        try {
            const taskRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/tasks`);
            console.log('taskRecords1 ', taskRecords);
            if (!Array.isArray(taskRecords?.records)) {
                console.warn("Expected an array of task records but got:", taskRecords?.records);
            }
            setTasks(Array.isArray(taskRecords?.records) ? taskRecords.records : []);
        } catch (error) {
            console.error("Failed to fetch tasks for project:", error);
            setTasks([]);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [projectData]);

    useEffect(() => {
        fetchTasksForProject();
    }, [fetchTasksForProject]);


    useEffect(() => {
        setProjectData(data);
        setNotesContent(data.fields.Notes || '');
        setEditedDetails(data.fields);
    }, [data]);

    useEffect(() => {
        const fetchActions = async () => {
            if (!projectData.fields['Project ID']) return;
            setIsLoadingActions(true);
            try {
                const actionRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/actions`);
                if (!Array.isArray(actionRecords?.records) && !Array.isArray(actionRecords)) {
                    console.warn("Unexpected actions API shape:", actionRecords);
                }

                setActions(
                    Array.isArray(actionRecords?.records)
                        ? actionRecords.records
                        : Array.isArray(actionRecords)
                            ? actionRecords
                            : []
                );

            } catch (error) {
                console.error("Failed to fetch actions:", error);
                setActions([]);
            } finally {
                setIsLoadingActions(false);
            }
        };
        fetchActions();
    }, [projectData]);

    const fetchAndProcessActivities = React.useCallback(async () => {
        if (!projectData.fields['Project ID']) return;
        setIsLoadingActivities(true);
        setChangedActivities({ toCreate: new Map(), toUpdate: new Map() });
        try {
            const activityRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/activities`);
            const fetchedActivities = Array.isArray(activityRecords?.records)
                ? activityRecords.records
                : Array.isArray(activityRecords)
                    ? activityRecords
                    : [];

            const fetchedActivitiesMap = new Map();
            fetchedActivities.forEach(act => {
                const apiName = act.fields.name?.trim();
                if (apiName) {
                    fetchedActivitiesMap.set(apiName, act);
                }
            });

            const finalActivities = DEFAULT_ACTIVITIES.map((name, index) => {
                const existingActivity = fetchedActivitiesMap.get(name);
                if (existingActivity) {
                    return existingActivity;
                } else {
                    return {
                        id: `default-${index}`,
                        fields: {
                            name: name,
                            dueDate: 'Not set',
                            status: 'Not started',
                            completed: false,
                        }
                    };
                }
            });
            setActivities(finalActivities);

        } catch (error) {
            console.error("Failed to fetch or process activities:", error);
            const defaultList = DEFAULT_ACTIVITIES.map((name, index) => ({
                id: `default-error-${index}`,
                fields: {
                    name: name,
                    dueDate: 'Not set',
                    status: 'Not started',
                    completed: false,
                }
            }));
            setActivities(defaultList);
        } finally {
            setIsLoadingActivities(false);
        }
    }, [projectData]);

    useEffect(() => {
        fetchAndProcessActivities();
    }, [fetchAndProcessActivities]);

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
                case 'completed':
                case 'finalized':
                    colorStyle = "bg-emerald-100 text-emerald-800"; break;
                case 'in progress': colorStyle = "bg-amber-100 text-amber-800"; break;
                case 'not started': colorStyle = "bg-slate-100 text-slate-700"; break;
                case 'pending': colorStyle = "bg-rose-100 text-rose-800"; break;
                default: break;
            }
        }
        return <span className={`${baseStyle} ${colorStyle}`}>{status || 'N/A'}</span>;
    };

    const handleActivityChange = (activityId, field, value) => {
        const updatedActivities = activities.map(act => {
            if (act.id === activityId) {
                return { ...act, fields: { ...act.fields, [field]: value } };
            }
            return act;
        });
        setActivities(updatedActivities);

        const activity = updatedActivities.find(a => a.id === activityId);

        if (activity.id.startsWith('default-')) {
            setChangedActivities(prev => {
                const toCreate = new Map(prev.toCreate);
                const fields = { ...activity.fields, 'Project ID': [projectData.id] };
                if (fields.dueDate === 'Not set') {
                    delete fields.dueDate;
                }
                toCreate.set(activity.id, { fields });
                return { ...prev, toCreate };
            });
        } else {
            setChangedActivities(prev => {
                const toUpdate = new Map(prev.toUpdate);
                const existingUpdate = toUpdate.get(activity.id) || { id: activity.id, fields: {} };
                existingUpdate.fields[field] = value;
                toUpdate.set(activity.id, existingUpdate);
                return { ...prev, toUpdate };
            });
        }
    };

    const handleSaveActivities = async () => {
        setIsUpdatingActivities(true);

        const recordsToCreate = Array.from(changedActivities.toCreate.values());
        recordsToCreate.forEach(rec => {
            if (rec.fields.dueDate === 'Not set') {
                rec.fields.dueDate = null;
            }
        });

        const recordsToUpdate = Array.from(changedActivities.toUpdate.values());

        try {
            const promises = [];
            if (recordsToCreate.length > 0) {
                promises.push(apiFetch('/records', {
                    method: 'POST',
                    body: JSON.stringify({ recordsToCreate, tableName: 'activities' })
                }));
            }
            if (recordsToUpdate.length > 0) {
                promises.push(apiFetch('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({ recordsToUpdate, tableName: 'activities' })
                }));
            }

            await Promise.all(promises);
            await fetchAndProcessActivities();

        } catch (error) {
            console.error("Failed to save activities:", error);
            alert("There was an error saving the activities.");
        } finally {
            setIsUpdatingActivities(false);
        }
    };

    const handleActionChange = async (action, field, value) => {
        const updates = {
            id: action.id,
            fields: { [field]: value }
        };
        try {
            await apiFetch('/records', {
                method: 'PATCH',
                body: JSON.stringify({ recordsToUpdate: [updates], tableName: 'actions' })
            });
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
            const response = await apiFetch('/records', {
                method: 'POST',
                body: JSON.stringify({ recordsToCreate: [recordToCreate], tableName: 'actions' })
            });

            const createdRecord = response.records[0];
            setActions(currentActions => [...currentActions, createdRecord]);
            setNewAction({ description: '', estCompletion: '' });
            setIsAddingAction(false);
        } catch (error) {
            console.error("Failed to create new action:", error);
            alert("There was an error saving the new action.");
        }
    };

    const handleSaveNotes = async () => {
        const updates = {
            id: projectData.id,
            fields: { 'Notes': notesContent }
        };
        try {
            const updatedRecord = await apiFetch('/records', {
                method: 'PATCH',
                body: JSON.stringify({ recordsToUpdate: [updates], tableName: 'projects' })
            });

            const newProjectData = {
                ...projectData,
                fields: {
                    ...projectData.fields,
                    Notes: notesContent
                }
            };
            setProjectData(newProjectData);

            if (onProjectUpdate) {
                onProjectUpdate(newProjectData);
            }
            setIsEditingNotes(false);

        } catch (error) {
            console.error("Failed to update notes:", error);
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
            // The `apiFetch` function now returns a JavaScript object directly
            const updatedDocuments = await apiFetch(`/upload/projects/${projectData.id}/Documents`, {
                method: 'POST',
                body: formData,
            });

            // **THE FIX IS HERE:** No need to JSON.parse() the result
            const updatedProjectData = {
                ...projectData,
                fields: { ...projectData.fields, Documents: updatedDocuments }
            };

            setProjectData(updatedProjectData);
            if (onProjectUpdate) {
                onProjectUpdate(updatedProjectData);
            }

        } catch (error) {
            console.error('File upload failed:', error);
            alert('File upload failed. Please try again.');
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

    const parseChecklist = (checklistString) => {
        if (!checklistString || !checklistString.startsWith('Checklist:')) return [];
        return checklistString.replace('Checklist:', '').split(',').map(item => item.trim());
    };

    // When a user clicks on a date cell to start editing
    const handleDateCellClick = (activity) => {
        const dateString = activity.fields.dueDate;
        let initialDate = null;
        if (dateString && dateString !== 'Not set') {
            const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
            if (isValid(parsedDate)) {
                initialDate = parsedDate;
            }
        }
        setActiveEditingDate(initialDate);
        setEditingCell({ id: activity.id, field: 'dueDate' });
    };

    const assigneeOptions = useMemo(() => {
        if (!projectData?.fields) return [];
        const {
            'Assigned Consultant': assignedConsultant,
            'Supervising Consultant': supervisingConsultant,
            'collaborator_name': collaborators,
        } = projectData.fields;

        const options = new Set();

        if (assignedConsultant) options.add(assignedConsultant);
        if (supervisingConsultant) options.add(supervisingConsultant);
        if (collaborators && Array.isArray(collaborators)) {
            collaborators.forEach(c => options.add(c.trim()));
        }

        return Array.from(options).filter(Boolean);
    }, [projectData]);

    const handleDetailChange = (field, value) => {
        setEditedDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveDetails = async () => {
        const updatedFields = { ...editedDetails };
        try {
            await apiFetch(`/records/projects/${projectData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: updatedFields }),
            });
            const updatedProjectData = { ...projectData, fields: updatedFields };
            setProjectData(updatedProjectData);
            setIsEditingDetails(false);
            if (onProjectUpdate) {
                onProjectUpdate(updatedProjectData);
            }
        } catch (error) {
            console.error('Failed to save details:', error);
            alert('Failed to save project details.');
        }
    };

    const handleCollaboratorAdded = (newCollaborator) => {
        const updatedProjectData = {
            ...projectData,
            fields: {
                ...projectData.fields,
                'collaborator_name': [...(projectData.fields['collaborator_name'] || []), newCollaborator.name]
            }
        };
        setProjectData(updatedProjectData);
        if (onProjectUpdate) {
            onProjectUpdate(updatedProjectData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
            <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 bg-white">
                <button onClick={onClose} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 shadow-sm transition-all duration-200" aria-label="Back">
                    <BackIcon />
                    <span className="hidden sm:inline">Back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800">{projectData.fields['Project Name']}</h1>
                    <p className="text-xs text-slate-500 font-mono">ID: {projectData.fields['Project ID']}</p>
                </div>
                <div className="w-24 h-10"></div> {/* Placeholder for alignment */}
            </header>

            <main className="flex-grow p-6 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">

                    <div className="lg:col-span-3 space-y-6">
                        {/* Project Details Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-slate-700">Project Details</h2>
                                {isEditingDetails ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setIsEditingDetails(false); setEditedDetails(projectData.fields); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium">Cancel</button>
                                        <button onClick={handleSaveDetails} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium">Save</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingDetails(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                {/* Assigned Consultant */}
                                <div>
                                    <span className="font-medium text-slate-500">Assigned Consultant:</span>
                                    {isEditingDetails ? (
                                        <select value={editedDetails['Assigned Consultant'] || ''} onChange={(e) => handleDetailChange('Assigned Consultant', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            {dropdownFields['Assigned Consultant'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['Assigned Consultant']}</span>
                                    )}
                                </div>
                                {/* State */}
                                <div>
                                    <span className="font-medium text-slate-500">State:</span>
                                    {isEditingDetails ? (
                                        <select value={editedDetails['States'] || ''} onChange={(e) => handleDetailChange('States', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            {dropdownFields['States'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['States']}</span>
                                    )}
                                </div>
                                {/* Project Type */}
                                <div>
                                    <span className="font-medium text-slate-500">Project Type:</span>
                                    {isEditingDetails ? (
                                        <select value={editedDetails['Project Type'] || ''} onChange={(e) => handleDetailChange('Project Type', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            {dropdownFields['Project Type'].map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['Project Type']}</span>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <span className="font-medium text-slate-500">Status:</span>
                                    {isEditingDetails ? (
                                        <select value={editedDetails['Status'] || ''} onChange={(e) => handleDetailChange('Status', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            {dropdownFields['Status'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['Status']}</span>
                                    )}
                                </div>

                                {/* IRS Identifier */}
                                <div>
                                    <span className="font-medium text-slate-500">IRS Identifier:</span>
                                    {isEditingDetails ? (
                                        <input type="text" value={editedDetails['IRS Identifier (ID/EIN)'] || ''} onChange={(e) => handleDetailChange('IRS Identifier (ID/EIN)', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['IRS Identifier (ID/EIN)']}</span>
                                    )}
                                </div>
                                {/* Client Email */}
                                <div className="md:col-span-2">
                                    <span className="font-medium text-slate-500">Client Email:</span>
                                    {isEditingDetails ? (
                                        <input type="email" value={editedDetails['Client Email'] || ''} onChange={(e) => handleDetailChange('Client Email', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <a href={`mailto:${projectData.fields['Client Email']}`} className="text-blue-600 hover:underline ml-2">{projectData.fields['Client Email']}</a>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Date of Submission:</span>
                                    {isEditingDetails ? (
                                        <DatePicker
                                            selected={safeNewDate(editedDetails['Date of Submission'])}
                                            onChange={(date) => handleDetailChange('Date of Submission', date ? format(date, 'yyyy-MM-dd') : '')}
                                            dateFormat="yyyy-MM-dd"
                                            className="w-full mt-1 p-2 border rounded-md text-black"
                                            placeholderText="Pick a date"
                                        />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['Date of Submission']}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Estimated Completion:</span>
                                    {isEditingDetails ? (
                                        <DatePicker
                                            selected={safeNewDate(editedDetails['Estimated Completion'])}
                                            onChange={(date) => handleDetailChange('Estimated Completion', date ? format(date, 'yyyy-MM-dd') : '')}
                                            dateFormat="yyyy-MM-dd"
                                            className="w-full mt-1 p-2 border rounded-md text-black"
                                            placeholderText="Pick a date"
                                        />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData.fields['Estimated Completion']}</span>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Notes Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold text-slate-700">📝 Notes</h2>
                                {userRole !== 'client' && !isEditingNotes && (
                                    <button onClick={() => setIsEditingNotes(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            {isEditingNotes && userRole !== 'client' ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={notesContent}
                                        onChange={(e) => setNotesContent(e.target.value)}
                                        className="w-full h-48 p-3 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                                        placeholder="Enter project notes here..."
                                    ></textarea>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setIsEditingNotes(false); setNotesContent(projectData.fields.Notes || ''); }} className="text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-md">Cancel</button>
                                        <button onClick={handleSaveNotes} className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-md">Save Notes</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {projectData.fields['Notes'] || 'No notes available.'}
                                </div>
                            )}
                        </section>

                        {/* Documents Section */}
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

                        {/* Tasks Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Tasks</h3>
                                <button onClick={() => setIsAddTaskFormVisible(true)} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                                    <AddIcon /> Add Task
                                </button>
                            </div>
                            {isLoadingTasks ? (
                                <p className="text-slate-500">Loading tasks...</p>
                            ) : tasks.length > 0 ? (
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
                                                        <h4 className="text-sm font-medium text-slate-800">{task.fields.task_title}</h4>
                                                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.fields.task_status)}`}>{task.fields.task_status}</span>
                                                    </div>
                                                    <div className="flex gap-4 text-xs text-slate-500 mb-2">
                                                        <span><span className="font-medium">Start:</span> {formatDate(task.fields.start_date)}</span>
                                                        <span><span className="font-medium">Due:</span> {formatDate(task.fields.due_date)}</span>
                                                    </div>
                                                    {task.fields.checklist && (
                                                        <div className="mt-2">
                                                            <ul className="space-y-1">
                                                                {parseChecklist(task.fields.checklist).map((item, index) => (
                                                                    <li key={index} className="flex items-center text-xs text-slate-600">
                                                                        <svg className="w-3 h-3 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        {item}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
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
                            ) : (
                                <p className="text-slate-500">No tasks for this project yet.</p>
                            )}
                        </section>

                        {/* Activities Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon />
                                    <h2 className="text-lg font-semibold text-slate-700">Activities</h2>
                                </div>
                                {(changedActivities.toCreate.size > 0 || changedActivities.toUpdate.size > 0) && (
                                    <button
                                        onClick={handleSaveActivities}
                                        disabled={isUpdatingActivities}
                                        className="flex items-center gap-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                    >
                                        {isUpdatingActivities ? 'Updating...' : 'Update Activities'}
                                    </button>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left table-fixed">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 rounded-t-lg">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 w-1/2">Name</th>
                                            <th scope="col" className="px-6 py-3 w-40">Due Date</th>
                                            <th scope="col" className="px-6 py-3 w-36">Status</th>
                                            <th scope="col" className="px-6 py-3 text-center w-24">Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoadingActivities ? (
                                            <tr><td colSpan="4" className="text-center p-4 text-slate-500">Loading activities...</td></tr>
                                        ) : activities.map((activity, index) => (
                                            <tr key={activity.id} className={`border-b ${index === activities.length - 1 ? 'border-transparent' : 'border-slate-200'} hover:bg-slate-50 h-16 align-middle`}>
                                                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis" title={activity.fields.name}>
                                                    {activity.fields.name}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap" onClick={() => handleDateCellClick(activity)}>
                                                    {editingCell?.id === activity.id && editingCell?.field === 'dueDate' ? (
                                                        <DatePicker
                                                            selected={activeEditingDate}
                                                            onChange={(date) => {
                                                                // Update the local state for a responsive feel inside the picker
                                                                setActiveEditingDate(date);
                                                                // Update the master activities list
                                                                const formattedDate = date ? format(date, 'yyyy-MM-dd') : 'Not set';
                                                                handleActivityChange(activity.id, 'dueDate', formattedDate);
                                                            }}
                                                            onCalendarClose={() => {
                                                                // Hide the picker only after the calendar has closed
                                                                setEditingCell(null);
                                                            }}
                                                            dateFormat="yyyy-MM-dd"
                                                            className="w-full p-1 border border-slate-300 rounded-md text-sm"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span>{activity.fields.dueDate}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4" onClick={() => setEditingCell({ id: activity.id, field: 'status' })}>
                                                    {editingCell?.id === activity.id && editingCell?.field === 'status' ? (
                                                        <select
                                                            value={activity.fields.status}
                                                            onChange={(e) => {
                                                                handleActivityChange(activity.id, 'status', e.target.value);
                                                                setEditingCell(null);
                                                            }}
                                                            onBlur={() => setEditingCell(null)}
                                                            autoFocus
                                                            className="w-full bg-white p-1 border border-slate-300 rounded-md text-sm text-slate-800"
                                                        >
                                                            <option value="Not started">Not started</option>
                                                            <option value="In progress">In progress</option>
                                                            <option value="Finalized">Finalized</option>
                                                            <option value="Not Applicable">Not Applicable</option>
                                                        </select>
                                                    ) : (
                                                        <StatusBadge status={activity.fields.status} />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={activity.fields.completed || false}
                                                        onChange={(e) => handleActivityChange(activity.id, 'completed', e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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

                    <div className="lg:col-span-2 space-y-6">
                        {/* Project Status Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-slate-700 text-center">Project Status</h2>
                                {userRole === 'consultant' && !isEditingDetails && !isEditingStatus && (
                                    <button onClick={() => { setEditedDetails(projectData.fields); setIsEditingStatus(true); }} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            {isEditingStatus ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 items-center gap-x-4 gap-y-3">
                                        <span className="font-medium text-slate-500">Current Status:</span>
                                        <select
                                            value={editedDetails['Status'] || ''}
                                            onChange={(e) => handleDetailChange('Status', e.target.value)}
                                            className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                        >
                                            {dropdownFields['Status'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>

                                        <span className="font-medium text-slate-500">Submitted:</span>
                                        <select
                                            value={editedDetails['Submitted (Y/N)'] || ''}
                                            onChange={(e) => handleDetailChange('Submitted (Y/N)', e.target.value)}
                                            className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                        >
                                            {dropdownFields['Submitted (Y/N)'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>

                                        <span className="font-medium text-slate-500">Balance:</span>
                                        <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Balance']}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => { setIsEditingStatus(false); setEditedDetails(projectData.fields); }} className="text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-md">Cancel</button>
                                        <button onClick={() => { handleSaveDetails(); setIsEditingStatus(false); }} className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-md">Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Current Status:</span><StatusBadge status={projectData.fields['Status']} /></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submitted:</span><span className="font-semibold text-slate-800">{projectData.fields['Submitted (Y/N)']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Balance:</span><span className="font-semibold text-slate-800">{projectData.fields['Balance']}</span></div>
                                </div>
                            )}
                        </section>

                        {/* Pending Action Section */}
                        <section className="bg-amber-50 border-amber-200 p-5 rounded-xl border shadow-sm">
                            <h2 className="text-lg font-semibold text-amber-800 mb-2 text-center">⏳ Pending Action</h2>
                            <div className="bg-white rounded-md p-3 border border-amber-200 text-sm text-center text-amber-900">{projectData.fields['Pending Action (Client, Consulting or State)'] || 'All actions complete.'}</div>
                        </section>

                        {/* Key Dates Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                            <h2 className="text-lg font-semibold text-slate-700 mb-4 text-center">Key Dates</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Last Updated:</span><span className="font-semibold text-slate-800">{format(new Date(projectData.fields['Last Updated']), 'MM/dd/yyyy h:mm a')}</span></div>
                                <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submission Date:</span><span className="font-semibold text-slate-800">{projectData.fields['Date of Submission']}</span></div>
                                <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Est. Completion:</span><span className="font-semibold text-slate-800">{projectData.fields['Estimated Completion']}</span></div>
                            </div>
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
                                    <input type="text" placeholder="Action description..." value={newAction.description} onChange={(e) => handleNewActionInputChange('description', e.target.value)} className="w-full bg-white p-1 border border-slate-300 rounded-md text-sm text-slate-800" />
                                    <DatePicker
                                        selected={safeNewDate(newAction.estCompletion)}
                                        onChange={(date) => handleNewActionInputChange('estCompletion', date ? format(date, 'yyyy-MM-dd') : '')}
                                        dateFormat="MM-dd-yyyy"
                                        className="w-full p-2 border border-slate-300 rounded-md text-sm text-slate-500"
                                        placeholderText="Estimated completion date"
                                        withPortal
                                    />
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

                        {/* Collaborators Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <CollaboratorIcon />
                                    <h2 className="text-lg font-semibold text-slate-700">Collaborators</h2>
                                </div>
                                <button onClick={() => setIsAddCollaboratorVisible(true)} className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-all">
                                    <AddIcon />
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {projectData.fields['collaborator_name'] && projectData.fields['collaborator_name'].length > 0 ? (
                                    projectData.fields['collaborator_name'].map((name, index) => (
                                        <div key={index} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
                                            {name}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-2">No collaborators assigned.</p>
                                )}
                            </div>
                        </section>

                    </div>
                </div>
            </main>

            {isTaskCardVisible && (
                <TaskCard
                    task={selectedTask}
                    onClose={() => setIsTaskCardVisible(false)}
                    onTaskUpdate={() => { fetchTasksForProject(); setIsTaskCardVisible(false); }}
                    assigneeOptions={assigneeOptions}
                />
            )}

            {isAddTaskFormVisible && (
                <AddTaskToProjectForm
                    projectId={projectData.id}
                    projectName={projectData.fields['Project Name']}
                    onClose={() => setIsAddTaskFormVisible(false)}
                    onTaskAdded={() => { fetchTasksForProject(); setIsAddTaskFormVisible(false); }}
                    assigneeOptions={assigneeOptions}
                />
            )}

            {isAddCollaboratorVisible && (
                <AddCollaboratorForm
                    projectId={projectData.id}
                    onClose={() => setIsAddCollaboratorVisible(false)}
                    onCollaboratorAdded={handleCollaboratorAdded}
                />
            )}
        </div>
    );
};
