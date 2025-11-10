import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import TaskCard from './TaskCard';
import { AboutUsSection } from '../AboutUs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parse, format, isValid } from 'date-fns';
import { dropdownFields, DEFAULT_ACTIVITIES, safeNewDate } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import { $getRoot, $createParagraphNode } from 'lexical';
import RichTextEditor from '../richText/RichTextEditor';
import InfoSidebar from '../layout/InfoSidebar';
import Sidebar from '../layout/Sidebar';
import { loadContent } from '../../utils/contentUtils';
import { InfoPageProvider } from '../../utils/InfoPageContext';
import { colorClasses } from '../../utils/colorUtils';
import io from 'socket.io-client';
import { 
    isConsultantMessage, 
    isClientMessage, 
    getMessageStyling
} from '../../utils/aiUtils';
import { useProjectContext } from '../../hooks/useScreenContext';
import { sendQuickPrompt } from '../../utils/quickPromptHandler';
import { useAIAssistant } from '../../utils/AIAssistantContext';
import ClientOnboardingTour from '../tour/ClientOnboardingTour';
import WelcomeTourModal from '../tour/WelcomeTourModal';


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
    const [isActivitiesModalVisible, setIsActivitiesModalVisible] = useState(false);
    const notesEditorRef = useRef(null);
    const [notesContent, setNotesContent] = useState(null);
    const [projectMessages, setProjectMessages] = useState([]);
    const [newProjectMessage, setNewProjectMessage] = useState('');
    const [projectChatAttachment, setProjectChatAttachment] = useState(null);
    const [isUploadingProjectChatFile, setIsUploadingProjectChatFile] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const projectSocketRef = useRef(null);
    const projectChatContainerRef = useRef(null);
    const projectChatFileInputRef = useRef(null);
    
    // Plain text state for project chat (already have newProjectMessage above)

    // Task-related states
    const [taskData, setTaskData] = useState({ groups: [], ungroupedTasks: [] });
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);

    // Tour-related states
    const [isTourRunning, setIsTourRunning] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [tourStepIndex, setTourStepIndex] = useState(0);
    const [hasCheckedTourStatus, setHasCheckedTourStatus] = useState(false);

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
    
    // Register project context for AI assistant (after projectData is loaded)
    useProjectContext(projectId, projectData);

    // Get AI assistant context and auth for quick prompts
    const aiAssistantContext = useAIAssistant();
    const { userRole } = useAuth();

    // State to store quick prompt responses
    const [quickPromptResponses, setQuickPromptResponses] = useState({});
    const [loadingPrompts, setLoadingPrompts] = useState({});

    // Handler for quick prompt buttons
    const handleQuickPrompt = async (promptText) => {
        // Set loading state for this specific prompt
        setLoadingPrompts(prev => ({ ...prev, [promptText]: true }));
        
        try {
            const response = await sendQuickPrompt(promptText, projectId, null, aiAssistantContext, userRole);
            
            // Store the response for inline display
            setQuickPromptResponses(prev => ({ ...prev, [promptText]: response }));
        } catch (error) {
            setQuickPromptResponses(prev => ({ 
                ...prev, 
                [promptText]: `Error: ${error.message}. Please try again.` 
            }));
        } finally {
            setLoadingPrompts(prev => ({ ...prev, [promptText]: false }));
        }
        
        // Don't automatically open the AI chat modal - let the user open it manually if they want
        // The response is already displayed inline where they asked the question
    };

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
            
            // Check tour completion status on first load
            if (!hasCheckedTourStatus) {
                const tourCompleted = projectData.fields?.onboarding_tour_completed || false;
                if (!tourCompleted) {
                    // Wait a bit for page to load, then show welcome modal
                    setTimeout(() => {
                        setShowWelcomeModal(true);
                    }, 500);
                }
                setHasCheckedTourStatus(true);
            }
        }
    }, [projectData, fetchTasksForProject, fetchActions, fetchAndProcessActivities, fetchProjectMessages, hasCheckedTourStatus]);

    useEffect(() => {
        // Project-level Socket.IO connection
        projectSocketRef.current = io("https://ats-backend-805977745256.us-central1.run.app");

        projectSocketRef.current.on('connect', () => {
            console.log('Connected to project socket server');
            if (projectData?.id) {
                console.log(`Joining project room: ${projectData.id}`);
                projectSocketRef.current.emit('joinProjectRoom', projectData.id);
            }
        });

        // Always try to join the room when component mounts or project data changes
        const joinRoom = () => {
            if (projectData?.id && projectSocketRef.current) {
                console.log(`Joining project room: ${projectData.id}`);
                projectSocketRef.current.emit('joinProjectRoom', projectData.id);
            }
        };

        // Join room immediately if already connected
        if (projectSocketRef.current.connected) {
            joinRoom();
        }

        // Also join room when project data changes
        joinRoom();

        // Set up a retry mechanism for room joining
        const retryJoinRoom = () => {
            if (projectData?.id && projectSocketRef.current?.connected) {
                joinRoom();
            }
        };

        // Retry joining room every 2 seconds until successful
        const joinRoomInterval = setInterval(retryJoinRoom, 2000);

        // Clear interval after 10 seconds (should be enough time)
        setTimeout(() => {
            clearInterval(joinRoomInterval);
        }, 10000);

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

        // ===================================
        // REAL-TIME UPDATE LISTENERS
        // ===================================

        // Project Details Update Listener
        projectSocketRef.current.on('projectUpdated', (data) => {
            console.log('Project updated received:', data);
            console.log('Current project ID:', projectData.id);
            if (data.projectId === projectData.id) {
                console.log('Updating local project data with:', data.data);
                // Update local project data
                setProjectData(prevData => ({
                    ...prevData,
                    fields: { ...prevData.fields, ...data.data }
                }));
            } else {
                console.log('Project ID mismatch - ignoring update');
            }
        });

        // Task Update Listener
        projectSocketRef.current.on('taskUpdated', (data) => {
            console.log('Task updated:', data);
            if (data.projectId === projectData.id) {
                // Refresh tasks to get updated data
                fetchTasksForProject();
                
                // If a specific task is being viewed, refresh its data
                if (data.taskId && selectedTask && selectedTask.id === data.taskId) {
                    console.log('Refreshing selected task data due to real-time update');
                    // Update the selected task with the new data
                    setSelectedTask(prevTask => ({
                        ...prevTask,
                        fields: { ...prevTask.fields, ...data.data }
                    }));
                }
            }
        });

        // Activity Update Listener
        projectSocketRef.current.on('activityUpdated', (data) => {
            console.log('Activity updated received:', data);
            console.log('Current project ID:', projectData.id);
            if (data.projectId === projectData.id) {
                console.log('Refreshing activities due to real-time update');
                // Refresh activities to get updated data
                fetchAndProcessActivities();
            } else {
                console.log('Project ID mismatch - ignoring activity update');
            }
        });

        // Document Upload Listener
        projectSocketRef.current.on('documentAdded', (data) => {
            console.log('Document added:', data);
            if (data.projectId === projectData.id) {
                // Update local documents list
                setProjectData(prevData => ({
                    ...prevData,
                    fields: {
                        ...prevData.fields,
                        Documents: [...(prevData.fields.Documents || []), data.document]
                    }
                }));
            }
        });

        // Collaborator Change Listener
        projectSocketRef.current.on('collaboratorUpdated', (data) => {
            console.log('Collaborator updated:', data);
            if (data.projectId === projectData.id) {
                // Refresh project data to get updated collaborators
                const refreshProjectData = async () => {
                    try {
                        const refreshedData = await apiFetch(`/records/projects/${projectData.id}`);
                        setProjectData(refreshedData);
                    } catch (error) {
                        console.error('Failed to refresh project data:', error);
                    }
                };
                refreshProjectData();
            }
        });

        // Notes Update Listener
        projectSocketRef.current.on('notesUpdated', (data) => {
            console.log('Notes updated:', data);
            if (data.projectId === projectData.id) {
                // Update local notes content
                setNotesContent(data.content);
                
                // Update project data
                setProjectData(prevData => ({
                    ...prevData,
                    fields: { ...prevData.fields, Notes: data.content }
                }));
            }
        });

        // Test real-time connection
        projectSocketRef.current.on('testRealtimeResponse', (data) => {
            console.log('Real-time test response:', data);
            alert('Real-time connection is working!');
        });

        projectSocketRef.current.on('joinedProjectRoom', (data) => {
            console.log('Successfully joined project room:', data);
        });

        return () => {
            // Clear the retry interval
            clearInterval(joinRoomInterval);
            
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

    const handleSendProjectMessage = async () => {
        // Get message content from plain text input
        const messageContent = newProjectMessage.trim();
        
        // Allow sending if either there's a message or an attachment
        if (!projectSocketRef.current || (!messageContent && !projectChatAttachment)) return;
        
        const senderName = projectData.fields['Project Name']; // Client's name is the Project Name
        
        try {
            setIsUploadingProjectChatFile(true);
            
            let attachmentUrl = null;
            
            // If there's a file attachment, upload it first
            if (projectChatAttachment) {
                const formData = new FormData();
                formData.append('file', projectChatAttachment);
                formData.append('sourceTable', 'project_messages');
                formData.append('sourceRecordId', projectData.id);
                
                const response = await ApiCaller('/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                
                console.log('Upload response:', response);
                
                // Try different ways to access the URL
                if (response && typeof response === 'object') {
                    if (response.url) {
                        attachmentUrl = response.url;
                    } else if (response.data && response.data.url) {
                        attachmentUrl = response.data.url;
                    } else if (typeof response === 'string' && response.includes('http')) {
                        attachmentUrl = response;
                    } else {
                        // Try to find any URL-like string in the response
                        const responseStr = JSON.stringify(response);
                        const urlMatch = responseStr.match(/(https?:\/\/[^\s"]+)/);
                        if (urlMatch) {
                            attachmentUrl = urlMatch[0];
                        }
                    }
                }
            }
            
            // Send the message with optional attachment
            const messageData = {
                projectId: projectData.id,
                message: messageContent || (projectChatAttachment ? projectChatAttachment.name : ''),
                sender: senderName,
                // Ensure these fields are properly named to match what the backend expects
                attachmentUrl: attachmentUrl || null,
                attachmentName: projectChatAttachment ? projectChatAttachment.name : null,
                attachmentType: projectChatAttachment ? projectChatAttachment.type : null,
                // Add these fields as well to cover different possible field names
                attachment_url: attachmentUrl || null,
                attachment_name: projectChatAttachment ? projectChatAttachment.name : null,
                attachment_type: projectChatAttachment ? projectChatAttachment.type : null,
            };
            
            console.log('Sending project message with data:', messageData);
            projectSocketRef.current.emit('sendProjectMessage', messageData);
            
            // Clear the input
            setNewProjectMessage('');
            setProjectChatAttachment(null);
        } catch (error) {
            console.error('Failed to send message with attachment:', error);
            alert('Failed to upload attachment. Please try again.');
        } finally {
            setIsUploadingProjectChatFile(false);
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

    // Generate colors for task group titles
    const getGroupTitleColor = (index) => {
        const colors = [
            'text-blue-600',      // Blue
            'text-green-600',     // Green
            'text-purple-600',    // Purple
            'text-orange-600',    // Orange
            'text-pink-600',      // Pink
            'text-indigo-600',    // Indigo
            'text-yellow-600',    // Yellow
            'text-red-600',       // Red
        ];
        return colors[index % colors.length];
    };



    // Get section background color
    const getSectionColor = (sectionName) => {
        const sectionColors = {
            'Project Details': 'bg-blue-100',
            'Notes': 'bg-yellow-100',
            'Tasks': 'bg-green-100',
            'Documents': 'bg-purple-100',
            'Activities': 'bg-orange-100',
            'Project Status': 'bg-indigo-100',
            'Key Dates': 'bg-pink-100',
            'General Discussion': 'bg-cyan-100',
            'Actions': 'bg-amber-100',
            'Collaborators': 'bg-slate-100',
            'About Us': 'bg-teal-100'
        };
        return sectionColors[sectionName] || 'bg-white';
    };

    // Get initials from assignee name
    const getAssigneeInitials = (assigneeName) => {
        if (!assigneeName) return '?';
        const names = assigneeName.trim().split(' ');
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
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

    // Tour handlers
    const handleStartTour = () => {
        setShowWelcomeModal(false);
        setTourStepIndex(0);
        setIsTourRunning(true);
    };

    const handleSkipTour = async () => {
        setShowWelcomeModal(false);
        // Mark tour as completed when skipped
        await markTourAsCompleted();
    };

    const handleTourComplete = async () => {
        setIsTourRunning(false);
        await markTourAsCompleted();
    };

    const handleTourSkip = async () => {
        setIsTourRunning(false);
        await markTourAsCompleted();
    };

    const handleRestartTour = () => {
        setTourStepIndex(0);
        setIsTourRunning(true);
    };

    const markTourAsCompleted = async () => {
        if (!projectData?.id) return;
        try {
            await ApiCaller(`/records/projects/${projectData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    fields: {
                        onboarding_tour_completed: true
                    }
                })
            });
            // Update local state
            setProjectData(prev => ({
                ...prev,
                fields: {
                    ...prev.fields,
                    onboarding_tour_completed: true
                }
            }));
        } catch (error) {
            console.error('Failed to mark tour as completed:', error);
        }
    };

    // Check if there's a "Get Started" task or onboarding tasks
    const hasGetStartedTask = useMemo(() => {
        if (!taskData || !taskData.groups || !taskData.ungroupedTasks) return false;
        try {
            const allTasks = [...(taskData.groups || []).flatMap(g => g.tasks || []), ...(taskData.ungroupedTasks || [])];
            return allTasks.some(task => 
                task?.fields?.task_title?.toLowerCase().includes('get started') ||
                task?.fields?.task_title?.toLowerCase().includes('get-started')
            );
        } catch (error) {
            console.error('Error checking for Get Started task:', error);
            return false;
        }
    }, [taskData]);

    const hasOnboardingTasks = useMemo(() => {
        if (!taskData || !taskData.groups || !taskData.ungroupedTasks) return false;
        try {
            const allTasks = [...(taskData.groups || []).flatMap(g => g.tasks || []), ...(taskData.ungroupedTasks || [])];
            return allTasks.some(task => 
                task?.fields?.task_title?.toLowerCase().includes('onboarding') ||
                task?.fields?.group_name?.toLowerCase().includes('onboarding')
            );
        } catch (error) {
            console.error('Error checking for onboarding tasks:', error);
            return false;
        }
    }, [taskData]);


    if (pageIsLoading) return <div className="flex justify-center items-center h-screen"><p>Loading Project...</p></div>;
    if (error) return <div className="flex justify-center items-center h-screen"><p className="text-red-500">{error}</p></div>;
    if (!projectData) return <div className="flex justify-center items-center h-screen"><p>Project not found.</p></div>;


    return (
        <InfoPageProvider>
            <Sidebar />
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
                        <h1 className={`text-base md:text-2xl font-bold ${colorClasses.text.inverse} break-words leading-tight`} title={projectData.fields['Project Name']}>{projectData.fields['Project Name']}</h1>
                        <p className="text-xs text-slate-500 font-mono">ID: {projectData.fields['Project ID']}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {projectData.fields?.onboarding_tour_completed && (
                            <button
                                onClick={handleRestartTour}
                                className="px-3 py-1.5 text-xs md:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                                title="Take Tour"
                            >
                                Take Tour
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden">
                    <div className="hidden md:block">
                        <InfoSidebar />
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <main className="flex-grow p-3 md:p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">

                            <div className="lg:col-span-3 space-y-4 md:space-y-6">
                                {/* Project Details Section */}
                                <section data-tour="project-details" className={`${getSectionColor('Project Details')} p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Project Details')}`}>Project Details</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm">
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

                                {/* Quick Help Section - Only visible in client view */}
                                <section data-tour="quick-help" className="p-3 md:p-5 rounded-xl border border-blue-200 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                                    <div className="mb-3">
                                        <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-2">💡 Need Help Getting Started?</h3>
                                        <p className="text-sm text-blue-700 mb-3">Click any question below to get instant guidance from our AI assistant:</p>
                                    </div>
                                    <div className="space-y-3">
                                        {/* Question 1 */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleQuickPrompt('How do I start?')}
                                                disabled={loadingPrompts['How do I start?']}
                                                className="px-4 py-2.5 text-sm font-medium bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm text-blue-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingPrompts['How do I start?'] ? 'Loading...' : 'How do I start?'}
                                            </button>
                                            {quickPromptResponses['How do I start?'] && (
                                                <div className="ml-0 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                                                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{quickPromptResponses['How do I start?']}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Question 2 */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleQuickPrompt('Why should I complete these tasks?')}
                                                disabled={loadingPrompts['Why should I complete these tasks?']}
                                                className="px-4 py-2.5 text-sm font-medium bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm text-blue-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingPrompts['Why should I complete these tasks?'] ? 'Loading...' : 'Why should I complete these tasks?'}
                                            </button>
                                            {quickPromptResponses['Why should I complete these tasks?'] && (
                                                <div className="ml-0 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                                                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{quickPromptResponses['Why should I complete these tasks?']}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Question 3 */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleQuickPrompt('How does this get me closer to completing my application packet?')}
                                                disabled={loadingPrompts['How does this get me closer to completing my application packet?']}
                                                className="px-4 py-2.5 text-sm font-medium bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm text-blue-900 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loadingPrompts['How does this get me closer to completing my application packet?'] ? 'Loading...' : 'How does this help my application packet?'}
                                            </button>
                                            {quickPromptResponses['How does this get me closer to completing my application packet?'] && (
                                                <div className="ml-0 p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
                                                    <div className="text-sm text-blue-900 whitespace-pre-wrap">{quickPromptResponses['How does this get me closer to completing my application packet?']}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Notes Section */}
                                <section className={`${getSectionColor('Notes')} p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h2 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Notes')}`}>📝 Notes</h2>
                                    </div>
                                    <RichTextEditor
                                        isEditable={false}
                                        initialContent={notesContent}
                                        editorRef={notesEditorRef}
                                        sourceTable="projects"
                                        sourceRecordId={projectData.id}
                                    />
                                </section>

                                {/* About Us Section */}
                                <AboutUsSection getSectionColor={getSectionColor} />

                                {/* Tasks Section */}
                                <section data-tour="tasks-section" className={`${getSectionColor('Tasks')} p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Tasks')}`}>Tasks</h3>
                                    </div>
                                    {isLoadingTasks ? (
                                        <p className="text-slate-500">Loading tasks...</p>
                                    ) : (
                                        <div className="space-y-6">
                                            {taskData.groups.map((group, index) => (
                                                <div key={group.id}>
                                                    <div className={`p-3 md:p-3 rounded-xl ${getSectionColor('Tasks')} border-2 border-slate-300 shadow-md`}>
                                                        <div className="flex justify-between items-center p-3 border-b border-slate-200 mb-3">
                                                            <h4 className={`font-bold text-base md:text-lg ${getGroupTitleColor(index)}`}>{group.name}</h4>
                                                        </div>
                                                        <ul className="space-y-3 p-3 min-h-[60px]">
                                                            {group.tasks.map((task, taskIndex) => (
                                                                <li
                                                                    key={task.id}
                                                                    data-tour={taskIndex === 0 ? "task-example" : undefined}
                                                                    onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                                    className={`p-3 ${getSectionColor('Tasks')} rounded-lg shadow-md border-2 border-slate-400 hover:border-slate-500 transition-all duration-200 cursor-pointer min-h-[60px] flex items-center`}
                                                                >
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <h5 className="font-medium text-sm text-slate-800 flex-1 pr-2">{task.fields.task_title}</h5>
                                                                        <div className="flex-shrink-0">
                                                                            {task.fields.task_status === 'Completed' ? (
                                                                                <CompletedIcon />
                                                                            ) : (
                                                                                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                                                                    <span className="text-xs font-medium text-slate-600">
                                                                                        {getAssigneeInitials(task.fields.assigned_to)}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-end items-center mt-2">
                                                                        
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="mt-4">
                                            <h4 className={`font-bold text-base md:text-lg text-slate-700 mb-3 p-3 ${getSectionColor('Tasks')} rounded-lg border border-slate-200`}>Ungrouped Tasks</h4>
                                            <ul className={`space-y-3 p-4 min-h-[60px] ${getSectionColor('Tasks')} rounded-xl border-2 border-slate-300 shadow-sm`}>
                                                {taskData.ungroupedTasks.map((task, index) => (
                                                    <li
                                                        key={task.id}
                                                        onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                        className={`p-3 ${getSectionColor('Tasks')} rounded-lg shadow-md border-2 border-slate-400 hover:border-slate-500 transition-all duration-200 cursor-pointer min-h-[60px] flex items-center`}
                                                    >
                                                        <div className="flex justify-between items-center w-full">
                                                            <h5 className="font-medium text-sm text-slate-800 flex-1 pr-2">{task.fields.task_title}</h5>
                                                            <div className="flex-shrink-0">
                                                                {task.fields.task_status === 'Completed' ? (
                                                                    <CompletedIcon />
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                                                        <span className="text-xs font-medium text-slate-600">
                                                                            {getAssigneeInitials(task.fields.assigned_to)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
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
                            <section className={`${getSectionColor('Documents')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Documents')}`}>📎 Documents</h2>
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

                            {/* Activities Section - Desktop Table View */}
                            <section className={`${getSectionColor('Activities')} p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm hidden md:block`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon />
                                        <h2 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Activities')}`}>Activities</h2>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left table-fixed">
                                        <thead className={`text-xs text-slate-700 uppercase ${getSectionColor('Activities')} rounded-t-lg`}>
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
                                                <tr key={activity.id} className={`border-b ${index === activities.length - 1 ? 'border-transparent' : 'border-slate-200'} min-h-16 align-top`}>
                                                    <td className="px-6 py-4 font-medium text-slate-800 break-words" title={activity.fields.name}>
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

                            {/* Activities Section - Mobile Summary View */}
                            <section className={`${getSectionColor('Activities')} p-3 md:p-5 rounded-xl border border-slate-200 shadow-sm block md:hidden`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <CalendarIcon />
                                        <h2 className={`text-base md:text-lg font-semibold text-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg ${getSectionColor('Activities')}`}>Activities</h2>
                                    </div>
                                </div>
                                {isLoadingActivities ? (
                                    <div className="text-center p-4 text-slate-500">Loading activities...</div>
                                ) : (
                                    <div
                                        onClick={() => setIsActivitiesModalVisible(true)}
                                        className="cursor-pointer p-4 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-slate-800">View All Activities</h3>
                                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            <div className="flex justify-between mb-1">
                                                <span>Total Activities:</span>
                                                <span className="font-medium">{activities.length}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                                <span>Completed:</span>
                                                <span className="font-medium text-green-600">{activities.filter(a => a.fields.completed).length}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>In Progress:</span>
                                                <span className="font-medium text-blue-600">{activities.filter(a => a.fields.status === 'In progress').length}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
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

                        <div className="lg:col-span-2 space-y-4 md:space-y-6">
                            {/* Project Status Section */}
                            <section className={`${getSectionColor('Project Status')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm text-sm`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className={`text-lg font-semibold text-slate-700 text-center px-3 py-2 rounded-lg ${getSectionColor('Project Status')}`}>Project Status</h2>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Current Status:</span><StatusBadge status={projectData.fields['Status']} /></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submitted:</span><span className="font-semibold text-slate-800">{projectData.fields['Submitted (Y/N)']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Balance:</span><span className="font-semibold text-slate-800">{projectData.fields['Balance']}</span></div>
                                </div>
                            </section>

                            {/* Key Dates Section */}
                            <section className={`${getSectionColor('Key Dates')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm text-sm`}>
                                <h2 className={`text-lg font-semibold text-slate-700 mb-4 text-center px-3 py-2 rounded-lg ${getSectionColor('Key Dates')}`}>Key Dates</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Last Updated:</span><span className="font-semibold text-slate-800">{format(new Date(projectData.fields['Last Updated']), 'MM/dd/yyyy h:mm a')}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submission Date:</span><span className="font-semibold text-slate-800">{projectData.fields['Date of Submission']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Est. Completion:</span><span className="font-semibold text-slate-800">{projectData.fields['Estimated Completion']}</span></div>
                                </div>
                            </section>

                            {/* General Discussion Section */}
                            <section data-tour="general-discussion" className={`${getSectionColor('General Discussion')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                                    <h2 className={`text-lg font-semibold text-slate-700 px-3 py-2 rounded-lg ${getSectionColor('General Discussion')}`}>💬 General Discussion</h2>
                                </div>
                                <div ref={projectChatContainerRef} className="h-96 overflow-y-auto custom-scrollbar border-2 border-slate-200 rounded-xl p-4 space-y-4 mb-4 bg-gradient-to-b from-slate-50 to-white shadow-inner">
                                    {projectMessages.map((msg) => {
                                        const isConsultant = isConsultantMessage(msg);
                                        const isClient = isClientMessage(msg, projectData.fields['Project Name']);
                                        
                                        const styling = getMessageStyling(msg, 'client', projectData.fields['Project Name']);
                                        return (
                                            <div key={msg.id} className={`flex ${styling.alignment}`}>
                                                <div className="relative max-w-md">
                                                    <div className={`p-4 rounded-2xl shadow-sm border ${styling.bgColor} ${styling.borderColor}`}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                                styling.label === 'Client' ? 'bg-blue-500' : 'bg-slate-500'
                                                            }`}>
                                                                <span className="text-white text-xs font-bold">
                                                                    {styling.label === 'Client' ? 'U' : 'C'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-semibold">{styling.label}</span>
                                                            </div>
                                                        </div>
                                                        {msg.fields.message_text && (
                                                            <div className="text-sm leading-relaxed mb-2">
                                                                {msg.fields.message_text}
                                                            </div>
                                                        )}
                                                    
                                                    {(msg.fields.attachmentUrl || msg.fields.attachment_url) && (
                                                            <div className="mb-2">
                                                            {(msg.fields.attachmentType?.startsWith('image/') || msg.fields.attachment_type?.startsWith('image/')) ? (
                                                                    <div className="rounded-lg overflow-hidden border border-slate-200">
                                                                    <img 
                                                                        src={msg.fields.attachmentUrl || msg.fields.attachment_url} 
                                                                        alt={msg.fields.attachmentName || msg.fields.attachment_name || "Attachment"} 
                                                                            className="max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                                                        onClick={() => setPreviewImage(msg.fields.attachmentUrl || msg.fields.attachment_url)}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <a 
                                                                    href={msg.fields.attachmentUrl || msg.fields.attachment_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                        className={`flex items-center gap-2 text-xs py-2 px-3 rounded-lg transition-colors ${
                                                                            isClient 
                                                                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                        }`}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                    </svg>
                                                                    <span className="truncate max-w-[150px]">{msg.fields.attachmentName || msg.fields.attachment_name || "Download"}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                        <div className="text-xs text-right opacity-75 flex items-center justify-end gap-2">
                                                        <span>{new Date(msg.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            {isClient && <ReadReceipt isRead={msg.fields.is_read} />}
                                                    </div>
                                                </div>
                                                    <div className={`absolute -bottom-1 ${isClient ? 'right-4' : 'left-4'} w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                                                        isClient ? 'border-t-blue-500' : 'border-t-slate-200'
                                                    }`}></div>
                                            </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="space-y-3">
                                {projectChatAttachment && (
                                        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-sm text-blue-700 truncate">
                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                                </div>
                                                <span className="truncate max-w-[200px] font-medium">{projectChatAttachment.name}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setProjectChatAttachment(null)} 
                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <textarea
                                        value={newProjectMessage} 
                                        onChange={(e) => setNewProjectMessage(e.target.value)} 
                                                placeholder="Type a message..."
                                                className="w-full p-3 border-2 rounded-xl bg-white text-black transition-all duration-200 resize-none border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                rows={3}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendProjectMessage();
                                                    }
                                                }}
                                            />
                                        </div>
                                    <input 
                                        type="file" 
                                        ref={projectChatFileInputRef} 
                                        onChange={(e) => {
                                            if (e.target.files[0]) {
                                                setProjectChatAttachment(e.target.files[0]);
                                            }
                                            e.target.value = '';
                                        }}
                                        className="hidden" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => projectChatFileInputRef.current?.click()} 
                                            className={`p-3 rounded-xl transition-all duration-200 ${
                                                isUploadingProjectChatFile || !!projectChatAttachment
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                                            }`}
                                        disabled={isUploadingProjectChatFile || !!projectChatAttachment}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={handleSendProjectMessage} 
                                        type="button" 
                                            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                                                isUploadingProjectChatFile
                                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                                            }`}
                                            disabled={isUploadingProjectChatFile}
                                        >
                                            {isUploadingProjectChatFile ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Sending...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span>Send</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                </div>
                                            )}
                                    </button>
                                    </div>
                                </div>
                            </section>

                            {/* Actions Section */}
                            <section className={`${getSectionColor('Actions')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className={`text-lg font-semibold text-slate-700 px-3 py-2 rounded-lg ${getSectionColor('Actions')}`}>⚡️ Actions</h2>
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
                            <section className={`${getSectionColor('Collaborators')} p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm`}>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        <CollaboratorIcon />
                                        <h2 className={`text-lg font-semibold text-slate-700 px-3 py-2 rounded-lg ${getSectionColor('Collaborators')}`}>Collaborators</h2>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {projectData.fields['collaborator_name'] && projectData.fields['collaborator_name'].length > 0 ? (
                                        projectData.fields['collaborator_name'].map((name, index) => (
                                            <div key={index} className="p-2.5 bg-slate-200 rounded-lg border border-slate-300 text-sm font-medium text-slate-800">
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

            {/* Welcome Tour Modal */}
            {showWelcomeModal && (
                <WelcomeTourModal
                    onStartTour={handleStartTour}
                    onSkipTour={handleSkipTour}
                    isFirstTime={!projectData.fields?.onboarding_tour_completed}
                />
            )}

            {/* Onboarding Tour */}
            <ClientOnboardingTour
                isRunning={isTourRunning}
                onComplete={handleTourComplete}
                onSkip={handleTourSkip}
                hasGetStartedTask={hasGetStartedTask}
                hasOnboardingTasks={hasOnboardingTasks}
                currentStepIndex={tourStepIndex}
                onStepChange={setTourStepIndex}
            />
            
            {/* Activities Modal */}
            {isActivitiesModalVisible && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="relative max-w-4xl max-h-[90vh] w-full bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-xl font-semibold text-slate-800">Activities</h2>
                            <button
                                onClick={() => setIsActivitiesModalVisible(false)}
                                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                                aria-label="Close activities modal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            {isLoadingActivities ? (
                                <div className="text-center p-8 text-slate-500">Loading activities...</div>
                            ) : (
                                <div className="space-y-4">
                                    {activities.map((activity) => (
                                        <div key={activity.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-semibold text-slate-800 text-lg">{activity.fields.name}</h3>
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge status={activity.fields.status} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="font-medium text-slate-600 block mb-1">Due Date:</span>
                                                    <span className="text-slate-800">{activity.fields.dueDate}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-slate-600">Completed:</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={activity.fields.completed || false}
                                                            disabled={true}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-not-allowed"
                                                        />
                                                        <span className="text-slate-600 text-sm">
                                                            {activity.fields.completed ? 'Yes' : 'No'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && (
                                        <div className="text-center p-8 text-slate-500">
                                            <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <p>No activities found</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {previewImage && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
                    <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
                        <button 
                            onClick={() => setPreviewImage(null)} 
                            className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-lg hover:bg-gray-200"
                            aria-label="Close image preview"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Preview" 
                            className="max-w-full max-h-[85vh] object-contain"
                            onClick={(e) => e.stopPropagation()} 
                        />
                    </div>
                </div>
            )}
        </InfoPageProvider>
    );
}; 