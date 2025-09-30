import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import TaskCard from './TaskCard';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parse, format, isValid } from 'date-fns';
import { dropdownFields, DEFAULT_ACTIVITIES, safeNewDate } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import RichTextEditor from '../richText/RichTextEditor';
import InfoSidebar from '../layout/InfoSidebar';
import { loadContent } from '../../utils/contentUtils';
import { InfoPageProvider } from '../../utils/InfoPageContext';
import { colorClasses } from '../../utils/colorUtils';
import io from 'socket.io-client';


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

// UploadIcon removed - clients can't upload project documents

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

const CompletedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const IncompleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const ReadReceipt = ({ isRead }) => (
    <div className={`relative w-5 h-5 ml-1 inline-block ${isRead ? 'text-blue-400' : 'text-slate-400'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute" style={{ right: '6px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 absolute" style={{ right: '0px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    </div>
);

// --- Main Card Component ---
export default function ClientCard() {
    const { projectId } = useParams();
    const isClientView = true;
    const { logout } = useAuth(); // Get the logout function from auth context

    const [projectData, setProjectData] = useState(null);
    const [pageIsLoading, setPageIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [actions, setActions] = useState([]);
    const [isLoadingActions, setIsLoadingActions] = useState(true);
    const [selectedDocument, setSelectedDocument] = useState(null);
    // isUploading removed - clients can't upload project documents
    const [activities, setActivities] = useState([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const notesEditorRef = useRef(null);
    const [notesContent, setNotesContent] = useState(null);
    const [projectMessages, setProjectMessages] = useState([]);
    const [newProjectMessage, setNewProjectMessage] = useState('');
    const projectSocketRef = useRef(null);
    const projectChatContainerRef = useRef(null);

    // Task-related states
    const [taskData, setTaskData] = useState({ groups: [], ungroupedTasks: [] });
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);

    const fetchProjectMessages = useCallback(async () => {
        if (!projectData?.fields['Project ID']) return;
        try {
            const { records } = await ApiCaller(`/messages/${projectData.fields['Project ID']}/project_messages`);
            const sortedMessages = records.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
            setProjectMessages(sortedMessages);
        } catch (err) {
            console.error('Failed to load project chat history:', err);
        }
    }, [projectData?.fields['Project ID']]);

    useEffect(() => {
        if (projectMessages.length > 0 && projectSocketRef.current && projectData) {
            const unreadMessageIds = projectMessages
                .filter(msg => !msg.fields.is_read && msg.fields.sender === 'Consultant')
                .map(msg => msg.id);

            if (unreadMessageIds.length > 0) {
                projectSocketRef.current.emit('markMessagesAsRead', {
                    messageIds: unreadMessageIds,
                    tableName: 'project_messages'
                });
                // Optimistic update
                setProjectMessages(prevMessages =>
                    prevMessages.map(msg =>
                        unreadMessageIds.includes(msg.id)
                            ? { ...msg, fields: { ...msg.fields, is_read: true } }
                            : msg
                    )
                );
            }
        }
    }, [projectMessages, projectData]);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            setPageIsLoading(true);
            try {
                const data = await apiFetch(`/records/projects/${projectId}`);
                setProjectData(data);
                
                // Store project ID in sessionStorage for back navigation from info pages
                sessionStorage.setItem('currentProjectId', projectId);
                
                // Load notes content from attachment with fallback to old Notes field
                if (data.id) {
                    const loadedContent = await loadContent('projects', data.id, 'Notes');
                    // Let RichTextEditor handle content type detection and parsing
                    setNotesContent(loadedContent || data.fields.Notes || '');
                } else {
                    setNotesContent(toLexical(data.fields.Notes || ''));
                }
            } catch (err) {
                setError('Failed to load project data.');
                console.error(err);
            } finally {
                setPageIsLoading(false);
            }
        };
            fetchProject();
    }, [projectId]);

    const fetchTasksForProject = useCallback(async () => {
        if (!projectData?.id) return;
        setIsLoadingTasks(true);
        try {
            const [groupsResponse, tasksResponse] = await Promise.all([
                ApiCaller(`/records/filter/${projectData.fields['Project ID']}/task_groups`),
                ApiCaller(`/records/filter/${projectData.fields['Project ID']}/tasks`)
            ]);

            const allGroups = Array.isArray(groupsResponse?.records) ? groupsResponse.records : [];
            const allTasks = Array.isArray(tasksResponse?.records) ? tasksResponse.records : [];

            const groupsMap = new Map();
            allGroups.forEach(group => {
                groupsMap.set(group.id, {
                    id: group.id,
                    name: group.fields.group_name || 'Unnamed Group',
                    order: group.fields.group_order || 0,
                    tasks: []
                });
            });

            const ungrouped = [];
            allTasks.forEach(task => {
                const groupId = task.fields.task_groups?.[0];
                if (groupId && groupsMap.has(groupId)) {
                    groupsMap.get(groupId).tasks.push(task);
                } else {
                    ungrouped.push(task);
                }
            });

            const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);
            sortedGroups.forEach(group => {
                group.tasks.sort((a, b) => (a.fields.order || 0) - (b.fields.order || 0));
            });
            const sortedUngrouped = ungrouped.sort((a, b) => (a.fields.order || 0) - (b.fields.order || 0));

            setTaskData({ groups: sortedGroups, ungroupedTasks: sortedUngrouped });

        } catch (error) {
            console.error("Failed to fetch and process tasks:", error);
            setTaskData({ groups: [], ungroupedTasks: [] });
        } finally {
            setIsLoadingTasks(false);
        }
    }, [projectData]);

    const fetchActions = useCallback(async () => {
        if (!projectData?.fields['Project ID']) return;
        setIsLoadingActions(true);
        try {
            const actionRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/actions`);
            setActions(actionRecords?.records ?? []);
        } catch (error) {
            console.error("Failed to fetch actions:", error);
            setActions([]);
        } finally {
            setIsLoadingActions(false);
        }
    }, [projectData]);

    const fetchAndProcessActivities = useCallback(async () => {
        if (!projectData?.fields['Project ID']) return;
        setIsLoadingActivities(true);
        try {
            const activityRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/activities`);
            const fetchedActivities = activityRecords?.records ?? [];

            const fetchedActivitiesMap = new Map();
            fetchedActivities.forEach(act => {
                const apiName = act.fields.name?.trim();
                if (apiName) {
                    fetchedActivitiesMap.set(apiName, act);
                }
            });

            const finalActivities = DEFAULT_ACTIVITIES.map((name, index) => {
                const existingActivity = fetchedActivitiesMap.get(name);
                return existingActivity || {
                    id: `default-${index}`,
                    fields: { name, dueDate: 'Not set', status: 'Not started', completed: false }
                };
            });
            setActivities(finalActivities);

        } catch (error) {
            console.error("Failed to fetch or process activities:", error);
            const defaultList = DEFAULT_ACTIVITIES.map((name, index) => ({
                id: `default-error-${index}`,
                fields: { name, dueDate: 'Not set', status: 'Not started', completed: false }
            }));
            setActivities(defaultList);
        } finally {
            setIsLoadingActivities(false);
        }
    }, [projectData]);

    useEffect(() => {
        if (projectData) {
            fetchTasksForProject();
            fetchActions();
            fetchAndProcessActivities();
            fetchProjectMessages();
        }
    }, [projectData, fetchTasksForProject, fetchActions, fetchAndProcessActivities, fetchProjectMessages]);

    useEffect(() => {
        // Project-level Socket.IO connection
        projectSocketRef.current = io("https://ats-backend-805977745256.us-central1.run.app");

        projectSocketRef.current.on('connect', () => {
            console.log('Connected to project socket server');
            if (projectData?.id) {
                projectSocketRef.current.emit('joinProjectRoom', projectData.id);
            }
        });

        projectSocketRef.current.on('receiveProjectMessage', (message) => {
            setProjectMessages(prevMessages => {
                const newMessages = [...prevMessages, message];
                // When a new message is received, check if it should be marked as read immediately
                if (message.fields.sender === 'Consultant') {
                    setTimeout(() => { // a small delay to ensure the user can see the message
                        projectSocketRef.current.emit('markMessagesAsRead', {
                            messageIds: [message.id],
                            tableName: 'project_messages'
                        });
                    }, 1000)
                }
                return newMessages.map(m =>
                    m.id === message.id && message.fields.sender === 'Consultant'
                        ? { ...m, fields: { ...m.fields, is_read: true } }
                        : m
                );
            });
        });

        projectSocketRef.current.on('sendProjectMessageError', (error) => {
            console.error("Error sending project message:", error);
        });

        return () => {
            if (projectData?.id) {
                projectSocketRef.current.emit('leaveProjectRoom', projectData.id);
            }
            projectSocketRef.current.disconnect();
        };
    }, [projectData?.id]);

    useEffect(() => {
        // Auto-scroll for project chat
        if (projectChatContainerRef.current) {
            projectChatContainerRef.current.scrollTop = projectChatContainerRef.current.scrollHeight;
        }
    }, [projectMessages]);

    const handleSendProjectMessage = () => {
        if (newProjectMessage.trim() && projectSocketRef.current) {
            const senderName = projectData.fields['Project Name']; // Client's name is the Project Name
            projectSocketRef.current.emit('sendProjectMessage', {
                projectId: projectData.id,
                message: newProjectMessage,
                sender: senderName,
            });
            setNewProjectMessage('');
        }
    };


    // handleFileUpload removed - clients can't upload project documents
    

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
    
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        if (Array.isArray(collaborators)) {
            collaborators.forEach(c => options.add(c.trim()));
        }
        return Array.from(options).filter(Boolean);
    }, [projectData]);


    if (pageIsLoading) return <div className="flex justify-center items-center h-screen"><p>Loading Project...</p></div>;
    if (error) return <div className="flex justify-center items-center h-screen"><p className="text-red-500">{error}</p></div>;
    if (!projectData) return <div className="flex justify-center items-center h-screen"><p>Project not found.</p></div>;


    return (
        <InfoPageProvider>
            
            <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
                <header className={`flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 ${colorClasses.nav.base}`}>
                    <Link
                        to="/"
                        onClick={logout} // Call logout when the link is clicked
                        className={`flex items-center gap-2 ${colorClasses.button.neutral} px-4 py-2 rounded-lg shadow-sm transition-all duration-200`}
                        aria-label="Back"
                    >
                        <BackIcon />
                        <span className="hidden sm:inline">Exit Portal</span>
                    </Link>
                    <div className="text-center">
                        <h1 className={`text-2xl font-bold ${colorClasses.text.inverse}`}>{projectData.fields['Project Name']}</h1>
                        <p className="text-xs text-slate-500 font-mono">ID: {projectData.fields['Project ID']}</p>
                    </div>
                    <div className="w-24 h-10"></div> {/* Placeholder for alignment */}
                </header>

                <div className="flex flex-1 overflow-hidden">
                    <InfoSidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <main className="flex-grow p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                            <div className="lg:col-span-3 space-y-6">
                                {/* Project Details Section */}
                                <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-semibold text-slate-700">Project Details</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                        <div>
                                            <span className="font-medium text-slate-500">Assigned Consultant:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Assigned Consultant']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">Project Manager:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Project Manager']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">State:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['States']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">Project Type:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Project Type']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">Status:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Status']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">IRS Identifier:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['IRS Identifier (ID/EIN)']}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="font-medium text-slate-500">Client Email:</span>
                                            <a href={`mailto:${projectData.fields['Client Email']}`} className="text-blue-600 hover:underline ml-2">{projectData.fields['Client Email']}</a>
                                    </div>
                                        <div>
                                            <span className="font-medium text-slate-500">Date of Submission:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Date of Submission']}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-500">Estimated Completion:</span>
                                            <span className="text-slate-800 ml-2">{projectData.fields['Estimated Completion']}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Notes Section */}
                                <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className="text-lg font-semibold text-slate-700">📝 Notes</h2>
                                    </div>
                                    <RichTextEditor
                                        isEditable={false}
                                        initialContent={notesContent}
                                        editorRef={notesEditorRef}
                                        sourceTable="projects"
                                        sourceRecordId={projectData.id}
                                    />
                                </section>


                                {/* Tasks Section */}
                                <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Tasks</h3>
                                    </div>
                                    {isLoadingTasks ? (
                                        <p className="text-slate-500">Loading tasks...</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {taskData.groups.map((group) => (
                                                <div key={group.id}>
                                                    <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                                                        <div className="flex justify-between items-center p-2">
                                                            <h4 className="font-bold text-slate-700">{group.name}</h4>
                                                        </div>
                                                        <ul className="space-y-2 p-2 min-h-[50px]">
                                                            {group.tasks.map((task) => (
                                                                <li
                                                                    key={task.id}
                                                                    onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                                    className="p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
                                                                        {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
                                                            </div>
                                                                    <div className="flex justify-end items-center mt-2">
                                                                        <span className="text-xs text-slate-500">Due: {formatDate(task.fields.due_date)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="mt-4">
                                            <h4 className="font-bold text-slate-700 mb-2 p-2">Ungrouped Tasks</h4>
                                            <ul className="space-y-2 p-2 min-h-[50px] bg-slate-50 rounded-lg border">
                                                {taskData.ungroupedTasks.map((task) => (
                                                    <li
                                                        key={task.id}
                                                        onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                        className="p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
                                                            {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
                                                        </div>
                                                        <div className="flex justify-end items-center mt-2">
                                                            <span className="text-xs text-slate-500">Due: {formatDate(task.fields.due_date)}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Documents Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-slate-700">📎 Documents</h2>
                                    {/* Upload removed for clients - they can only upload to assigned tasks */}
                                </div>
                                <ul className="space-y-2">
                                    {/* Upload indicator removed - clients can't upload project documents */}
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
                                        <p className="text-sm text-slate-500 text-center py-2">No documents attached.</p>
                                    )}
                                </ul>
                            </section>

                            {/* Activities Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon />
                                        <h2 className="text-lg font-semibold text-slate-700">Activities</h2>
                                    </div>
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
                                                <tr key={activity.id} className={`border-b ${index === activities.length - 1 ? 'border-transparent' : 'border-slate-200'} h-16 align-middle`}>
                                                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis" title={activity.fields.name}>
                                                        {activity.fields.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                        <span>{activity.fields.dueDate}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge status={activity.fields.status} />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={activity.fields.completed || false}
                                                            disabled={isClientView}
                                                            className="h-4 w-4 rounded border-gray-300 bg-black text-white focus:ring-0 disabled:bg-black disabled:text-white"
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
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Current Status:</span><StatusBadge status={projectData.fields['Status']} /></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submitted:</span><span className="font-semibold text-slate-800">{projectData.fields['Submitted (Y/N)']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Balance:</span><span className="font-semibold text-slate-800">{projectData.fields['Balance']}</span></div>
                                </div>
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

                            {/* General Discussion Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-700 mb-3">💬 General Discussion</h2>
                                <div ref={projectChatContainerRef} className="h-48 overflow-y-auto custom-scrollbar border rounded-md p-2 space-y-2 mb-2 bg-slate-50">
                                    {projectMessages.map((msg) => {
                                        const isConsultantMessage = msg.fields.sender === 'Consultant';
                                        // In Client view, "my" message is one NOT from the consultant
                                        const isMyMessage = !isConsultantMessage;
                                        return (
                                            <div key={msg.id} className={`flex ${isConsultantMessage ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`p-2 rounded-lg max-w-xs ${isConsultantMessage ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                                    <p className="text-xs font-bold">{msg.fields.sender}</p>
                                                    <p className="text-sm">{msg.fields.message_text}</p>
                                                    <div className="text-xs text-right opacity-75 mt-1 flex items-center justify-end">
                                                        <span>{new Date(msg.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMyMessage && <ReadReceipt isRead={msg.fields.is_read} />}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex">
                                    <input 
                                        type="text" 
                                        value={newProjectMessage} 
                                        onChange={(e) => setNewProjectMessage(e.target.value)} 
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendProjectMessage()} 
                                        className="w-full px-3 py-2 border rounded-l-md bg-white text-black text-sm" 
                                        placeholder="Type a message..." 
                                    />
                                    <button onClick={handleSendProjectMessage} type="button" className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">Send</button>
                                </div>
                            </section>

                            {/* Actions Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-slate-700">⚡️ Actions</h2>
                                </div>
                                {isLoadingActions ? (
                                    <p className="text-sm text-slate-500 text-center py-4">Loading actions...</p>
                                ) : (
                                    <div className="space-y-6">
                                        {/* --- Pending Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-slate-700 mb-2 pb-1 border-b-2 border-slate-200">Pending Actions</h3>
                                            <div className="space-y-3 p-3 rounded-lg min-h-[60px] bg-slate-50">
                                                {actions.filter(a => a.fields.pending_action && !a.fields.completed).map((action) => (
                                                    <div key={action.id} className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
                                                        <div className="flex items-start gap-4">
                                                            <input type="checkbox" checked={action.fields.completed || false} disabled={isClientView} className="mt-1 h-4 w-4 rounded border-gray-300 bg-black text-white focus:ring-0 disabled:bg-black disabled:text-white" aria-label="Action completed" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-slate-800 font-medium">{action.fields.action_description}</p>
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                                    <span>Created: <span className="font-semibold text-slate-600">{action.fields.set_date}</span></span>
                                                                    <span>Est. Completion: <span className="font-semibold text-slate-600">{action.fields.estimated_completion_date}</span></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {actions.filter(a => a.fields.pending_action && !a.fields.completed).length === 0 && (
                                                    <p className="text-sm text-slate-500 text-center py-2">No pending actions.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* --- Active Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-slate-700 mb-2 pb-1 border-b-2 border-slate-200">Actions</h3>
                                            <div className="space-y-3 p-3 rounded-lg min-h-[60px] bg-slate-50">
                                                {actions.filter(a => !a.fields.pending_action && !a.fields.completed).map((action) => (
                                                    <div key={action.id} className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
                                                        <div className="flex items-start gap-4">
                                                            <input type="checkbox" checked={action.fields.completed || false} disabled={isClientView} className="mt-1 h-4 w-4 rounded border-gray-300 bg-black text-white focus:ring-0 disabled:bg-black disabled:text-white" aria-label="Action completed" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-slate-800 font-medium">{action.fields.action_description}</p>
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                                    <span>Created: <span className="font-semibold text-slate-600">{action.fields.set_date}</span></span>
                                                                    <span>Est. Completion: <span className="font-semibold text-slate-600">{action.fields.estimated_completion_date}</span></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {actions.filter(a => !a.fields.pending_action && !a.fields.completed).length === 0 && (
                                                    <p className="text-sm text-slate-500 text-center py-2">No active actions.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* --- Completed Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-slate-700 mb-2 pb-1 border-b-2 border-slate-200">Completed Actions</h3>
                                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                                {actions.filter(a => a.fields.completed).map((action) => (
                                                    <div key={action.id} className="p-3 bg-white rounded-lg border border-slate-200 opacity-70">
                                                        <div className="flex items-start gap-4">
                                                            <input type="checkbox" checked={action.fields.completed || false} disabled={isClientView} className="mt-1 h-4 w-4 rounded border-gray-300 bg-black text-white focus:ring-0 disabled:bg-black disabled:text-white" aria-label="Action completed" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-slate-600 font-medium line-through">{action.fields.action_description}</p>
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                                    <span>Created: <span className="font-semibold">{action.fields.set_date}</span></span>
                                                                    <span>Est. Completion: <span className="font-semibold">{action.fields.estimated_completion_date}</span></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {actions.filter(a => a.fields.completed).length === 0 && (
                                                    <p className="text-sm text-slate-500 text-center py-2">No completed actions.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Collaborators Section */}
                            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <CollaboratorIcon />
                                        <h2 className="text-lg font-semibold text-slate-700">Collaborators</h2>
                                    </div>
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
                    </div>
                </div>
            </div>

            {isTaskCardVisible && (
                <TaskCard
                    task={selectedTask}
                    onClose={() => setIsTaskCardVisible(false)}
                    onTaskUpdate={() => { fetchTasksForProject(); setIsTaskCardVisible(false); }}
                    assigneeOptions={assigneeOptions}
                    isClientView={true}
                    isEditable={selectedTask?.fields?.assigned_to === projectData?.fields['Project Name']}
                />
            )}
        </InfoPageProvider>
    );
}; 