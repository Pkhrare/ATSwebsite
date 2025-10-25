import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TaskCard from './TaskCard';
import AddTaskToProjectForm from '../forms/AddTaskToProjectForm';
import AddCollaboratorForm from '../forms/AddCollaboratorForm';
import AddGroupForm from '../forms/AddGroupForm';
import InternalNotesSection from './InternalNotesSection';
import { AboutUsSection } from '../AboutUs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parse, format, isValid } from 'date-fns';
import { dropdownFields, DEFAULT_ACTIVITIES, safeNewDate, assignedConsultants_record_ids } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import { $getRoot, $createParagraphNode } from 'lexical';
import RichTextEditor from '../richText/RichTextEditor';
import { loadContent, saveContent } from '../../utils/contentUtils';
import InfoSidebar from '../layout/InfoSidebar';
import { colorClasses } from '../../utils/colorUtils';
import io from 'socket.io-client';
import AIDropdown from '../ai/AIDropdown';
import AITypingIndicator from '../ai/AITypingIndicator';
import AIMessage from '../ai/AIMessage';
import { 
    isAIMessage, 
    isConsultantMessage, 
    isClientMessage, 
    getMessageStyling, 
    shouldTriggerAI, 
    validateAIRequest, 
    createAIRequestPayload,
    debounce 
} from '../../utils/aiUtils';


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

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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
export default function Card({ data, onClose, onProjectUpdate, onProjectDelete, onProjectOperationChange }) {
    const { userRole, currentUser } = useAuth();
    const [projectData, setProjectData] = useState(data);
    const [copied, setCopied] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const [activeActions, setActiveActions] = useState([]);
    const [completedActions, setCompletedActions] = useState([]);
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
    const [originalNotes, setOriginalNotes] = useState(null);
    const notesEditorRef = useRef(null); // For the editor INSTANCE
    const [notesContent, setNotesContent] = useState(null); // For the editor CONTENT
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const isDeactivated = projectData.fields['Operation'] === 'Deactivated';

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

    // Get initials from assignee name
    const getAssigneeInitials = (assigneeName) => {
        if (!assigneeName) return '?';
        const names = assigneeName.trim().split(' ');
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };
    const [editedDetails, setEditedDetails] = useState({});
    const [isAddCollaboratorVisible, setIsAddCollaboratorVisible] = useState(false);
    const [isEditingStatus, setIsEditingStatus] = useState(false);
    const [isEditingKeyDates, setIsEditingKeyDates] = useState(false);
    const [isContentLoading, setIsContentLoading] = useState(true);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [editingGroupName, setEditingGroupName] = useState('');
    const [projectMessages, setProjectMessages] = useState([]);
    const [newProjectMessage, setNewProjectMessage] = useState('');
    const [projectChatAttachment, setProjectChatAttachment] = useState(null);
    const projectChatFileInputRef = useRef(null);
    const [isUploadingProjectChatFile, setIsUploadingProjectChatFile] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const projectSocketRef = useRef(null);
    const projectChatContainerRef = useRef(null);

    // AI-related states
    const [isAIMode, setIsAIMode] = useState(false);
    const [isAITyping, setIsAITyping] = useState(false);
    const [aiRequestInProgress, setAiRequestInProgress] = useState(false);

    // Task-related states
    const [taskData, setTaskData] = useState({ groups: [], ungroupedTasks: [] });
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);
    const [isAddTaskFormVisible, setIsAddTaskFormVisible] = useState(false);
    const [isAddGroupFormVisible, setIsAddGroupFormVisible] = useState(false);

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
                .filter(msg => !msg.fields.is_read && msg.fields.sender !== 'Consultant')
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

    const fetchTasksForProject = useCallback(async () => {
        if (!projectData?.id) return;
        setIsLoadingTasks(true);
        try {
            // Step 1: Fetch all groups and all tasks for the project in parallel, using the project's record ID for both.
            const [groupsResponse, tasksResponse] = await Promise.all([
                ApiCaller(`/records/filter/${projectData.fields['Project ID']}/task_groups`),
                ApiCaller(`/records/filter/${projectData.fields['Project ID']}/tasks`)
            ]);

            const allGroups = Array.isArray(groupsResponse?.records) ? groupsResponse.records : [];
            const allTasks = Array.isArray(tasksResponse?.records) ? tasksResponse.records : [];

            // Step 2: Initialize the groupsMap with ALL groups, ensuring empty ones are included.
            const groupsMap = new Map();
            allGroups.forEach(group => {
                groupsMap.set(group.id, {
                    id: group.id,
                    name: group.fields.group_name || 'Unnamed Group',
                    order: group.fields.group_order || 0,
                    tasks: [] // Start with an empty tasks array for every group.
                });
            });

            const ungrouped = [];

            // Step 3: Process all tasks and place them into the correct group or the ungrouped list.
            allTasks.forEach(task => {
                const groupId = task.fields.task_groups?.[0];
                if (groupId && groupsMap.has(groupId)) {
                    groupsMap.get(groupId).tasks.push(task);
                } else {
                    ungrouped.push(task);
                }
            });

            // Step 4: Convert map to array and sort groups by their order.
            const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);

            // Step 5: Sort tasks within each group by their individual order.
            sortedGroups.forEach(group => {
                group.tasks.sort((a, b) => (a.fields.order || 0) - (b.fields.order || 0));
            });

            // Step 6: Sort the remaining ungrouped tasks.
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
        if (!projectData.fields['Project ID']) return;
        setIsLoadingActions(true);
        try {
            const actionRecords = await ApiCaller(`/records/filter/${projectData.fields['Project ID']}/actions`);
            if (!Array.isArray(actionRecords?.records) && !Array.isArray(actionRecords)) {
                console.warn("Unexpected actions API shape:", actionRecords);
            }

            const allActions = Array.isArray(actionRecords?.records)
                ? actionRecords.records
                : Array.isArray(actionRecords)
                    ? actionRecords
                    : [];

            setPendingActions(allActions.filter(a => a.fields.pending_action && !a.fields.completed));
            setActiveActions(allActions.filter(a => !a.fields.pending_action && !a.fields.completed));
            setCompletedActions(allActions.filter(a => a.fields.completed));

        } catch (error) {
            console.error("Failed to fetch actions:", error);
        } finally {
            setIsLoadingActions(false);
        }
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
        const initializeNotes = async () => {
            setIsContentLoading(true);
            setProjectData(data);
            setEditedDetails(data.fields);
            
            // Load notes content from attachment and set it in state
            if (data.id) {
                const loadedContent = await loadContent('projects', data.id, 'Notes');
                // Let RichTextEditor handle content type detection and parsing
                setNotesContent(loadedContent || data.fields.Notes || '');
            } else {
                setNotesContent(toLexical(data.fields.Notes || ''));
            }
            
            // Wait a bit to ensure content is properly initialized before showing
            setTimeout(() => {
                setIsContentLoading(false);
            }, 300);
        };
        
        initializeNotes();
    }, [data]);

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
            console.log('Received project message:', message);
            console.log('Message fields:', message.fields);
            console.log('Has attachment URL?', !!message.fields.attachmentUrl);
            console.log('Attachment URL:', message.fields.attachmentUrl);
            console.log('Attachment name:', message.fields.attachmentName);
            console.log('Attachment type:', message.fields.attachmentType);
            
            setProjectMessages(prevMessages => {
                const newMessages = [...prevMessages, message];
                // When a new message is received, check if it should be marked as read immediately
                if (userRole === 'consultant' && message.fields.sender !== 'Consultant') {
                    setTimeout(() => {
                        projectSocketRef.current.emit('markMessagesAsRead', {
                            messageIds: [message.id],
                            tableName: 'project_messages'
                        });
                    }, 1000);
                }

                return newMessages.map(m =>
                    m.id === message.id && userRole === 'consultant' && message.fields.sender !== 'Consultant'
                        ? { ...m, fields: { ...m.fields, is_read: true } }
                        : m
                );
            });
        });

        projectSocketRef.current.on('sendProjectMessageError', (error) => {
            console.error("Error sending project message:", error);
        });

        // AI-related socket events
        projectSocketRef.current.on('waiverlyn:typing', (data) => {
            setIsAITyping(data.isTyping);
        });

        projectSocketRef.current.on('waiverlyn:response', (data) => {
            console.log('Received Waiverlyn response:', data);
            setAiRequestInProgress(false);
            setIsAITyping(false);
            
            // Sanitize AI response to ensure raw Lexical JSON (strip code fences, etc.)
            if (data?.message?.fields?.message_text && typeof data.message.fields.message_text === 'string') {
                try {
                    const { sanitizeLexicalJsonString } = require('../../utils/aiUtils');
                    data.message.fields.message_text = sanitizeLexicalJsonString(data.message.fields.message_text);
                } catch (e) {
                    console.warn('Failed to sanitize AI response, using as-is', e);
                }
            }

            // Add the AI response to the messages
            if (data.message) {
                setProjectMessages(prevMessages => [...prevMessages, data.message]);
            }
        });

        projectSocketRef.current.on('waiverlyn:error', (data) => {
            console.error('Waiverlyn error:', data);
            setAiRequestInProgress(false);
            setIsAITyping(false);
            
            // Show error message to user
            alert(`AI Error: ${data.error}`);
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
    
        // If a pending action is completed, it's no longer pending.
        if (field === 'completed' && value && action.fields.pending_action) {
            updates.fields.pending_action = false;
        }
    
        try {
            await apiFetch('/records', {
                method: 'PATCH',
                body: JSON.stringify({ recordsToUpdate: [updates], tableName: 'actions' })
            });
            // Refetch actions to ensure UI is in sync with the database
            fetchActions();
        } catch (error) {
            console.error("Failed to update action:", error);
            // Optionally, revert state here on failure
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
            await apiFetch('/records', {
                method: 'POST',
                body: JSON.stringify({ recordsToCreate: [recordToCreate], tableName: 'actions' })
            });
            fetchActions(); // Refetch actions to include the new one
            setNewAction({ description: '', estCompletion: '' });
            setIsAddingAction(false);
        } catch (error) {
            console.error("Failed to create new action:", error);
            alert("There was an error saving the new action.");
        }
    };

    const handleSaveNotes = async () => {
        try {
            let contentString;
            
            // Check if we're dealing with code content or rich text content
            if (notesContent && typeof notesContent === 'string' && notesContent.includes('code-content')) {
                // This is code content, use it directly
                contentString = notesContent;
                console.log('Saving code content:', contentString);
            } else {
                // This is rich text content, get it from the editor
                if (!notesEditorRef.current) {
                    console.error("Notes editor reference is null");
                    alert("Cannot save notes: Editor not initialized. Please try again.");
                    return;
                }
                
                // Extract the current content from the editor
                const currentContent = notesEditorRef.current.getEditorState().toJSON();
                contentString = JSON.stringify(currentContent);
                console.log('Saving rich text content:', contentString);
            }
            
            // Save notes content as attachment
            await saveContent('projects', projectData.id, 'Notes', contentString);

            // Update the local state with the new content
            setNotesContent(contentString);
            
            // Update the local state (no need to update Airtable directly since it's now an attachment)
            const newProjectData = {
                ...projectData,
                fields: {
                    ...projectData.fields,
                    Notes: contentString // Keep for display purposes
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
            const updatedDocuments = await apiFetch(`/upload/projects/${projectData.id}/Documents`, {
                method: 'POST',
                body: formData,
            });
            
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
        let processedValue = value;
        
        // Ensure that cost and paid values are stored as numbers
        if (field === 'Full Cost' || field === 'Paid') {
            processedValue = value === '' ? null : parseFloat(value);
        }

        // Create a temporary state to calculate the new balance from
        const newState = { ...editedDetails, [field]: processedValue };
        const fullCost = parseFloat(newState['Full Cost']) || 0;
        const paid = parseFloat(newState['Paid']) || 0;
        const newBalance = fullCost - paid;

        setEditedDetails(prev => ({ 
            ...prev, 
            [field]: processedValue,
            'Balance': newBalance 
        }));
    };

    const handleSaveDetails = async () => {
        const updatedFields = { ...editedDetails };
        
        // Check if Assigned Consultant changed and update collaborators accordingly
        const oldConsultant = projectData.fields['Assigned Consultant'];
        const newConsultant = updatedFields['Assigned Consultant'];

        if (oldConsultant !== newConsultant) {
            const oldConsultantId = oldConsultant ? assignedConsultants_record_ids[oldConsultant] : null;
            const newConsultantId = newConsultant ? assignedConsultants_record_ids[newConsultant] : null;

            let currentCollaboratorIds = projectData.fields.collaborators || [];

            // Remove old consultant if they existed
            if (oldConsultantId) {
                currentCollaboratorIds = currentCollaboratorIds.filter(id => id !== oldConsultantId);
            }

            // Add new consultant if they exist and are not already in the list
            if (newConsultantId && !currentCollaboratorIds.includes(newConsultantId)) {
                currentCollaboratorIds.push(newConsultantId);
            }
            
            updatedFields.collaborators = currentCollaboratorIds;
        }

        // Do not attempt to update computed fields like 'Last Updated'
        delete updatedFields['Last Updated'];
        
        delete updatedFields['collaborator_name'];

        try {
            await apiFetch(`/records/projects/${projectData.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: updatedFields }),
            });

            // After successful save, refetch the project data to get updated lookup fields
            const refreshedProjectData = await apiFetch(`/records/projects/${projectData.id}`);

            setProjectData(refreshedProjectData);
            setIsEditingDetails(false);
            if (onProjectUpdate) {
                onProjectUpdate(refreshedProjectData);
            }
        } catch (error) {
            console.error('Failed to save details:', error);
            alert('Failed to save project details.');
        }
    };

    const handleTaskDragEnd = async (result) => {
        const { destination, source, type } = result;
    
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }
    
        const taskDataCopy = {
            groups: JSON.parse(JSON.stringify(taskData.groups)),
            ungroupedTasks: JSON.parse(JSON.stringify(taskData.ungroupedTasks)),
        };
    
        if (type === 'GROUP') {
            const [reorderedGroup] = taskDataCopy.groups.splice(source.index, 1);
            taskDataCopy.groups.splice(destination.index, 0, reorderedGroup);
            setTaskData(taskDataCopy);
    
            const groupUpdates = taskDataCopy.groups.map((group, index) => ({
                id: group.id,
                fields: { group_order: index }
            }));
    
            try {
                await apiFetch('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({ recordsToUpdate: groupUpdates, tableName: 'task_groups' })
                });
            } catch (error) {
                console.error("Failed to update group order:", error);
                setTaskData(taskData); // Revert on failure
            }
            return;
        }
    
        if (type === 'TASK') {
            let movedTask;
            const sourceList = source.droppableId === 'ungrouped-tasks' 
                ? taskDataCopy.ungroupedTasks 
                : taskDataCopy.groups.find(g => g.id === source.droppableId)?.tasks;
            
            const destList = destination.droppableId === 'ungrouped-tasks'
                ? taskDataCopy.ungroupedTasks
                : taskDataCopy.groups.find(g => g.id === destination.droppableId)?.tasks;

            if (!sourceList || !destList) return;

            [movedTask] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, movedTask);
            setTaskData(taskDataCopy);

            const updates = new Map();

            // Handle the moved task's group change
            const movedTaskUpdate = { id: movedTask.id, fields: {} };
            const isMovingToGroup = destination.droppableId !== 'ungrouped-tasks';
            movedTaskUpdate.fields.task_groups = isMovingToGroup ? [destination.droppableId] : [];
            updates.set(movedTask.id, movedTaskUpdate);

            // Consolidate order updates for all affected lists
            const allLists = [sourceList, destList];
            allLists.forEach(list => {
                list.forEach((task, index) => {
                    const existingUpdate = updates.get(task.id) || { id: task.id, fields: {} };
                    existingUpdate.fields.order = index;
                    updates.set(task.id, existingUpdate);
                });
            });

            try {
                const recordsToUpdate = Array.from(updates.values());
                if (recordsToUpdate.length > 0) {
                    await apiFetch('/records', {
                        method: 'PATCH',
                        body: JSON.stringify({ recordsToUpdate, tableName: 'tasks' })
                    });
                }
            } catch (error) {
                console.error("Failed to update task order/group:", error);
                fetchTasksForProject(); // Revert by re-fetching on error
            }
        }
    };

    const handleActionDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
    
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;
    
        // Prevent dropping into the 'completed' list
        if (destination.droppableId === 'completedActions') return;
    
        const isMovingToPending = destination.droppableId === 'pendingActions';
        
        let sourceList, destList, movedAction;
        
        // Create copies for optimistic update
        const currentPending = [...pendingActions];
        const currentActive = [...activeActions];

        if (source.droppableId === 'pendingActions') {
            sourceList = currentPending;
            [movedAction] = sourceList.splice(source.index, 1);
        } else {
            sourceList = currentActive;
            [movedAction] = sourceList.splice(source.index, 1);
        }

        if (destination.droppableId === 'pendingActions') {
            destList = currentPending;
            destList.splice(destination.index, 0, movedAction);
        } else {
            destList = currentActive;
            destList.splice(destination.index, 0, movedAction);
        }
        
        // Optimistically update the UI
        setPendingActions(currentPending);
        setActiveActions(currentActive);
    
        // Update the backend
        try {
            await apiFetch('/records', {
                method: 'PATCH',
                body: JSON.stringify({
                    recordsToUpdate: [{ id: draggableId, fields: { pending_action: isMovingToPending } }],
                    tableName: 'actions'
                })
            });
        } catch (error) {
            console.error("Failed to update action's pending status:", error);
            // Revert UI changes on failure by refetching
            fetchActions();
        }
    };

    const onDragEnd = (result) => {
        const { type } = result;
        if (type === 'GROUP' || type === 'TASK') {
            handleTaskDragEnd(result);
        } else if (type === 'ACTION') {
            handleActionDragEnd(result);
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

    const handleGroupAdded = (newGroup) => {
        // Refresh the tasks to show the new group
        fetchTasksForProject();
    };

    const handleDeleteAction = async (actionId) => {
        if (window.confirm('Are you sure you want to delete this action? This cannot be undone.')) {
            try {
                await apiFetch('/records/actions', {
                    method: 'DELETE',
                    body: JSON.stringify({ recordIds: [actionId] })
                });
                fetchActions(); // Re-fetch to update the UI
            } catch (error) {
                console.error("Failed to delete action:", error);
                alert("There was an error deleting the action.");
            }
        }
    };

    const handleUpdateGroupName = async (groupId) => {
        if (!editingGroupName.trim()) {
            setEditingGroupId(null);
            return;
        }

        const originalName = taskData.groups.find(g => g.id === groupId)?.name;

        const updatedGroups = taskData.groups.map(g => g.id === groupId ? { ...g, name: editingGroupName } : g);
        setTaskData(prev => ({ ...prev, groups: updatedGroups }));
        setEditingGroupId(null);

        try {
            await apiFetch('/records', {
                method: 'PATCH',
                body: JSON.stringify({
                    recordsToUpdate: [{ id: groupId, fields: { group_name: editingGroupName } }],
                    tableName: 'task_groups'
                })
            });
        } catch (error) {
            console.error("Failed to update group name:", error);
            alert("There was an error updating the group name.");
            const revertedGroups = taskData.groups.map(g => g.id === groupId ? { ...g, name: originalName } : g);
            setTaskData(prev => ({ ...prev, groups: revertedGroups }));
        }
    };

    const handleDeleteGroup = async (groupId, tasksInGroup) => {
        if (window.confirm('Are you sure you want to delete this group? Tasks within the group will be moved to Ungrouped Tasks.')) {
            try {
                if (tasksInGroup && tasksInGroup.length > 0) {
                    const taskUpdates = tasksInGroup.map(task => ({
                        id: task.id,
                        fields: { task_groups: [] }
                    }));
                    await apiFetch('/records', {
                        method: 'PATCH',
                        body: JSON.stringify({ recordsToUpdate: taskUpdates, tableName: 'tasks' })
                    });
                }

                await apiFetch('/records/task_groups', {
                    method: 'DELETE',
                    body: JSON.stringify({ recordIds: [groupId] })
                });

                fetchTasksForProject();
            } catch (error) {
                console.error("Failed to delete group:", error);
                alert("There was an error deleting the group.");
            }
        }
    };

    const handleDeleteDocument = async (docIdToDelete) => {
        if (window.confirm('Are you sure you want to delete this document? This cannot be undone.')) {
            const currentDocuments = projectData.fields.Documents || [];
            const updatedDocuments = currentDocuments.filter(doc => doc.id !== docIdToDelete);

            try {
                const updatedProject = await apiFetch(`/records/projects/${projectData.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        fields: { 'Documents': updatedDocuments }
                    }),
                });

                setProjectData(prevData => ({
                    ...prevData,
                    fields: {
                        ...prevData.fields,
                        Documents: updatedDocuments
                    }
                }));

                if (onProjectUpdate) {
                    onProjectUpdate(updatedProject);
                }

            } catch (error) {
                console.error("Failed to delete document:", error);
                alert("There was an error deleting the document.");
            }
        }
    };

    const handleDeleteCollaborator = async (collaboratorNameToDelete) => {
        if (window.confirm(`Are you sure you want to remove ${collaboratorNameToDelete} as a collaborator?`)) {
            const currentCollaborators = projectData.fields['collaborator_name'] || [];
            const currentCollaborators_index = projectData.fields['collaborators'] || [];
            const updatedCollaborators = currentCollaborators.filter(collaborator => collaborator !== collaboratorNameToDelete);
            const collaboratorIndexToRemove = currentCollaborators_index[currentCollaborators.indexOf(collaboratorNameToDelete)];
            const collaboratorsToUpdate = currentCollaborators_index.filter(index => index !== collaboratorIndexToRemove);
            try {
                const updatedProject = await apiFetch(`/records/projects/${projectData.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        fields: { 'collaborators': collaboratorsToUpdate }
                    }),
                });

                setProjectData(prevData => ({
                    ...prevData,
                    fields: {
                        ...prevData.fields,
                        'collaborator_name': updatedCollaborators
                    }
                }));

                if (onProjectUpdate) {
                    onProjectUpdate(updatedProject);
                }

            } catch (error) {
                console.error("Failed to delete collaborator:", error);
                alert("There was an error deleting the collaborator.");
            }
        }
    };

    const handleDeleteProject = async () => {
        const projectName = projectData.fields['Project Name'];
        const projectId = projectData.fields['Project ID'];
        
        if (window.confirm(`Are you sure you want to delete the project "${projectName}" (${projectId})? This action cannot be undone.`)) {
            try {
                await apiFetch('/records/projects', {
                    method: 'DELETE',
                    body: JSON.stringify({ recordIds: [projectData.id] })
                });
                
                // Notify parent component about the deletion
                if (onProjectDelete) {
                    onProjectDelete(projectData.id);
                }
                
                // Close the project card and navigate back to projects page
                onClose();
                
                // Show success message
                alert(`Project "${projectName}" has been successfully deleted.`);
                
            } catch (error) {
                console.error("Failed to delete project:", error);
                alert("There was an error deleting the project. Please try again.");
            }
        }
    };

    const handleOperationChange = async (newOperation) => {
        const projectName = projectData.fields['Project Name'];
        const projectId = projectData.fields['Project ID'];
        const action = newOperation === 'Deactivated' ? 'deactivate' : 'reactivate';
        
        if (window.confirm(`Are you sure you want to ${action} the project "${projectName}" (${projectId})?`)) {
            try {
                await apiFetch('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        recordsToUpdate: [{ 
                            id: projectData.id, 
                            fields: { 'Operation': newOperation } 
                        }],
                        tableName: 'projects'
                    })
                });
                
                // Update local state
                setProjectData(prev => ({
                    ...prev,
                    fields: { ...prev.fields, 'Operation': newOperation }
                }));
                
                // Notify parent component about the operation change
                if (onProjectOperationChange) {
                    onProjectOperationChange(projectData.id, newOperation);
                }
                
                // Close the project card and navigate back to projects page
                onClose();
                
                // Show success message
                alert(`Project "${projectName}" has been successfully ${action}d.`);
                
            } catch (error) {
                console.error(`Failed to ${action} project:`, error);
                alert(`There was an error ${action}ing the project. Please try again.`);
            }
        }
    };

    // Debounced AI request handler
    const debouncedAIRequest = useCallback(
        debounce(async (projectId, message, sender) => {
            if (!projectSocketRef.current) return;
            
            const validation = validateAIRequest(projectId, message, sender);
            if (!validation.isValid) {
                alert(`AI Request Error: ${validation.error}`);
                return;
            }

            setAiRequestInProgress(true);
            const payload = createAIRequestPayload(projectId, message, sender);
            
            console.log('Sending AI request:', payload);
            projectSocketRef.current.emit('waiverlyn:request', payload);
        }, 2000), // 2 second debounce
        [projectSocketRef]
    );

    const handleSendProjectMessage = async () => {
        // Get message content from plain text input
        const messageContent = newProjectMessage.trim();
        
        // Allow sending if either there's a message or an attachment
        if (!projectSocketRef.current || (!messageContent && !projectChatAttachment)) return;
        
        const senderName = userRole === 'consultant' ? 'Consultant' : projectData.fields['Project Name'];
        
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
                console.log('Response type:', typeof response);
                
                // Try different ways to access the URL
                if (response && typeof response === 'object') {
                    if (response.url) {
                        attachmentUrl = response.url;
                        console.log('Found URL directly in response:', attachmentUrl);
                    } else if (response.data && response.data.url) {
                        attachmentUrl = response.data.url;
                        console.log('Found URL in response.data:', attachmentUrl);
                    } else if (typeof response === 'string' && response.includes('http')) {
                        attachmentUrl = response;
                        console.log('Response is a URL string:', attachmentUrl);
                    } else {
                        // Try to find any URL-like string in the response
                        const responseStr = JSON.stringify(response);
                        const urlMatch = responseStr.match(/(https?:\/\/[^\s"]+)/);
                        if (urlMatch) {
                            attachmentUrl = urlMatch[0];
                            console.log('Extracted URL from response string:', attachmentUrl);
                        } else {
                            console.log('Could not find URL in response:', response);
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
            
            // Trigger AI response if in AI mode and conditions are met
            if (isAIMode && shouldTriggerAI(messageContent, true) && !aiRequestInProgress) {
                debouncedAIRequest(projectData.id, messageContent, senderName);
            }
            
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

    // Loading screen component
    if (isContentLoading) {
        return (
            <div className={`fixed inset-0 z-50 ${colorClasses.bg.secondary} flex flex-col`}>
                <header className={`flex items-center justify-between p-4 border-b ${colorClasses.sidebar.border} flex-shrink-0 ${colorClasses.nav.base}`}>
                    <button onClick={onClose} className={`flex items-center gap-2 ${colorClasses.button.neutral} px-4 py-2 rounded-lg shadow-sm transition-all duration-200`} aria-label="Back">
                        <BackIcon />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <div className="text-center">
                        <h1 className={`text-2xl font-bold ${colorClasses.text.inverse}`}>{data.fields['Project Name']}</h1>
                        <p className={`text-xs ${colorClasses.text.secondary} font-mono`}>ID: {data.fields['Project ID']}</p>
                    </div>
                    <div className="w-24 h-10"></div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <div className={`w-64 p-4 border-r ${colorClasses.sidebar.border} ${colorClasses.sidebar.base} flex-shrink-0`}>
                        <div className="animate-pulse space-y-4">
                            <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-20`}></div>
                            <div className="space-y-2">
                                <div className={`h-3 ${colorClasses.loading.skeleton} rounded w-32`}></div>
                                <div className={`h-3 ${colorClasses.loading.skeleton} rounded w-28`}></div>
                                <div className={`h-3 ${colorClasses.loading.skeleton} rounded w-36`}></div>
                            </div>
                        </div>
                    </div>
                    <main className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3 space-y-6">
                                {/* Project Details Skeleton */}
                                <div className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded w-1/3 mb-4`}></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-3/4`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-5/6`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded`}></div>
                                    </div>
                                </div>
                                
                                {/* Notes Skeleton */}
                                <div className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded w-1/4 mb-4`}></div>
                                    <div className="space-y-3">
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-5/6`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-3/4`}></div>
                                    </div>
                                </div>
                                
                                {/* Tasks Skeleton */}
                                <div className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded w-1/4 mb-4`}></div>
                                    <div className="space-y-4">
                                        <div className={`h-16 ${colorClasses.loading.skeletonAlt} rounded`}></div>
                                        <div className={`h-12 ${colorClasses.loading.skeletonAlt} rounded`}></div>
                                        <div className={`h-12 ${colorClasses.loading.skeletonAlt} rounded`}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="lg:col-span-2 space-y-6">
                                {/* Project Status Skeleton */}
                                <div className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded w-1/2 mb-4`}></div>
                                    <div className="space-y-3">
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-3/4`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-1/2`}></div>
                                        <div className={`h-4 ${colorClasses.loading.skeleton} rounded w-2/3`}></div>
                                    </div>
                                </div>
                                
                                {/* Additional sections skeleton */}
                                <div className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                    <div className={`h-6 ${colorClasses.loading.skeleton} rounded w-1/3 mb-4`}></div>
                                    <div className={`h-16 ${colorClasses.loading.skeletonAlt} rounded`}></div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 z-50 ${colorClasses.bg.secondary} flex flex-col`}>
            <header className={`flex items-center justify-between p-4 border-b ${colorClasses.sidebar.border} flex-shrink-0 ${colorClasses.nav.base}`}>
                <button onClick={onClose} className={`flex items-center gap-2 ${colorClasses.button.neutral} px-4 py-2 rounded-lg shadow-sm transition-all duration-200`} aria-label="Back">
                    <BackIcon />
                    <span className="hidden sm:inline">Back</span>
                </button>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3">
                    <h1 className={`text-2xl font-bold ${colorClasses.text.inverse}`}>{projectData.fields['Project Name']}</h1>
                        {isDeactivated && (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-500 text-white rounded-full">
                                DEACTIVATED
                            </span>
                        )}
                    </div>
                    <p className={`text-xs ${colorClasses.text.secondary} font-mono`}>ID: {projectData.fields['Project ID']}</p>
                </div>
                <div className="flex items-center gap-2">
                    {userRole === 'consultant' && (
                        <>
                            {projectData.fields['Operation'] === 'Active' || !projectData.fields['Operation'] ? (
                                <button 
                                    onClick={() => handleOperationChange('Deactivated')} 
                                    className={`flex items-center gap-2 ${colorClasses.button.accent} px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:bg-gray-600`} 
                                    aria-label="Deactivate Project"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                    </svg>
                                    <span className="hidden sm:inline">Deactivate</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleOperationChange('Active')} 
                                    className={`flex items-center gap-2 ${colorClasses.button.success} px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:bg-emerald-600`} 
                                    aria-label="Reactivate Project"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                    <span className="hidden sm:inline">Reactivate</span>
                                </button>
                            )}
                            <button 
                                onClick={handleDeleteProject} 
                                className={`flex items-center gap-2 ${colorClasses.button.danger} px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:bg-red-600`} 
                                aria-label="Delete Project"
                            >
                                <DeleteIcon />
                                <span className="hidden sm:inline">Delete</span>
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <InfoSidebar />
                <main className="flex-1 p-6 overflow-y-auto">
                <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    <div className="lg:col-span-3 space-y-6">
                        {/* Project Details Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>Project Details</h2>
                                {isEditingDetails ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setIsEditingDetails(false); setEditedDetails(projectData.fields); }} className={`px-4 py-2 ${colorClasses.button.neutral} rounded-md text-sm font-medium`}>Cancel</button>
                                        <button onClick={handleSaveDetails} className={`px-4 py-2 ${colorClasses.button.success} rounded-md text-sm font-medium`}>Save</button>
                                    </div>
                                ) : (
                                    !isDeactivated && (
                                    <button onClick={() => setIsEditingDetails(true)} className={`flex items-center gap-2 text-sm ${colorClasses.text.link} font-medium`}>
                                        <EditIcon />
                                    </button>
                                    )
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                {/* Assigned Consultant */}
                                <div>
                                    <span className={`font-medium ${colorClasses.form.label}`}>Assigned Consultant:</span>
                                    {isEditingDetails && !isDeactivated ? (
                                        <select value={editedDetails['Assigned Consultant'] || ''} onChange={(e) => handleDetailChange('Assigned Consultant', e.target.value)} className={`w-full mt-1 p-2 ${colorClasses.form.input} rounded-md`}>
                                            {dropdownFields['Assigned Consultant'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`${colorClasses.text.primary} ml-2`}>{projectData.fields['Assigned Consultant']}</span>
                                    )}
                                </div>
                                {/* Project Manager */}
                                <div>
                                    <span className={`font-medium ${colorClasses.form.label}`}>Project Manager:</span>
                                    {isEditingDetails && !isDeactivated ? (
                                        <select value={editedDetails['Project Manager'] || ''} onChange={(e) => handleDetailChange('Project Manager', e.target.value)} className={`w-full mt-1 p-2 ${colorClasses.form.input} rounded-md`}>
                                            {dropdownFields['Project Manager'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`${colorClasses.text.primary} ml-2`}>{projectData.fields['Project Manager']}</span>
                                    )}
                                </div>
                                {/* State */}
                                <div>
                                    <span className={`font-medium ${colorClasses.form.label}`}>State:</span>
                                    {isEditingDetails ? (
                                        <select value={editedDetails['States'] || ''} onChange={(e) => handleDetailChange('States', e.target.value)} className={`w-full mt-1 p-2 ${colorClasses.form.input} rounded-md`}>
                                            {dropdownFields['States'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className={`${colorClasses.text.primary} ml-2`}>{projectData.fields['States']}</span>
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
                                    <span className="font-medium text-slate-500">IRS Identifier (ID/EIN):</span>
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
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-2">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>📝 Notes</h2>
                                {userRole !== 'client' && !isEditingNotes && !isDeactivated && (
                                    <button onClick={() => {
                                        // Save the current state before entering edit mode
                                        if (notesEditorRef.current) {
                                            setOriginalNotes(notesEditorRef.current.getEditorState().toJSON());
                                        }
                                        setIsEditingNotes(true);
                                    }} className={`flex items-center gap-2 text-sm ${colorClasses.text.link} font-medium`}>
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            {isEditingNotes && userRole !== 'client' && !isDeactivated ? (
                                <div className="space-y-3">
                                    <RichTextEditor
                                        isEditable={true}
                                        initialContent={notesContent}
                                        onChange={(content) => {
                                            // Track content changes and update the state
                                            console.log('Content changed:', content);
                                            setNotesContent(content);
                                        }}
                                        editorRef={notesEditorRef}
                                        sourceTable="projects"
                                        sourceRecordId={projectData.id}
                                        showCodeEditButton={true}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { 
                                            // Restore the original state on cancel
                                            if (notesEditorRef.current && originalNotes) {
                                                const originalState = notesEditorRef.current.parseEditorState(originalNotes);
                                                notesEditorRef.current.setEditorState(originalState);
                                            }
                                            setIsEditingNotes(false);
                                        }} className={`text-sm ${colorClasses.button.accent} px-4 py-2 rounded-md`}>Cancel</button>
                                        <button onClick={handleSaveNotes} className={`text-sm ${colorClasses.button.success} px-4 py-2 rounded-md`}>Save Notes</button>
                                    </div>
                                </div>
                            ) : (
                                <RichTextEditor
                                    isEditable={false}
                                    initialContent={notesContent}
                                    editorRef={notesEditorRef}
                                    sourceTable="projects"
                                    sourceRecordId={projectData.id}
                                    showCodeEditButton={false}
                                />
                            )}
                        </section>

                        {/* About Us Section */}
                        <AboutUsSection />

                        {/* Tasks Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-semibold ${colorClasses.card.header}`}>Tasks</h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsAddGroupFormVisible(true)} className={`flex items-center gap-2 px-3 py-1 ${colorClasses.button.secondary} rounded-md text-sm`}>
                                        <AddIcon /> Add Group
                                    </button>
                                <button onClick={() => setIsAddTaskFormVisible(true)} className={`flex items-center gap-2 px-3 py-1 ${colorClasses.button.secondary} rounded-md text-sm`}>
                                    <AddIcon /> Add Task
                                </button>
                                </div>
                            </div>
                            {isLoadingTasks ? (
                                <p className="text-slate-500">Loading tasks...</p>
                            ) : (
                                <div>
                                    <Droppable droppableId="all-groups" type="GROUP">
                                        {(provided) => (
                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                                {taskData.groups.map((group, index) => (
                                                    <Draggable key={group.id} draggableId={group.id} index={index}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps}>
                                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 group relative">
                                                                    <div {...provided.dragHandleProps} className="flex justify-between items-center p-2 cursor-grab">
                                                                        {editingGroupId === group.id ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editingGroupName}
                                                                                onChange={(e) => setEditingGroupName(e.target.value)}
                                                                                onBlur={() => handleUpdateGroupName(group.id)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') handleUpdateGroupName(group.id);
                                                                                    if (e.key === 'Escape') setEditingGroupId(null);
                                                                                }}
                                                                                className="font-bold text-slate-700 bg-white border border-blue-400 rounded px-1"
                                                                                autoFocus
                                                                                onClick={(e) => e.stopPropagation()} // Prevent drag handle from firing
                                                                            />
                                                                        ) : (
                                                                            <h4
                                                                                className={`font-bold ${getGroupTitleColor(index)}`}
                                                                                onClick={() => {
                                                                                    setEditingGroupId(group.id);
                                                                                    setEditingGroupName(group.name);
                                                                                }}
                                                                            >
                                                                                {group.name}
                                                                            </h4>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDeleteGroup(group.id, group.tasks)}
                                                                            className="p-1 rounded-full text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            aria-label="Delete group"
                                                                        >
                                                                            <TrashIcon />
                                                                        </button>
                                                                    </div>
                                                                    <Droppable droppableId={group.id} type="TASK">
                                                                        {(provided) => (
                                                                            <ul className="space-y-2 p-2 min-h-[50px]" {...provided.droppableProps} ref={provided.innerRef}>
                                                                                {group.tasks.map((task, index) => (
                                                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                                        {(provided) => (
                                                                                            <li
                                                                                                ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                                                onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                                                                className="p-3 bg-white rounded-md shadow-sm border border-slate-200"
                                                                                            >
                                                                                                <div className="flex justify-between items-center">
                                                                                                    <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
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
                                                                                                <div className="flex justify-end items-center mt-2">
                                                                                                    <span className="text-xs text-slate-500">Due: {formatDate(task.fields.due_date)}</span>
                                                                                                </div>
                                                                                            </li>
                                                                                        )}
                                                                                    </Draggable>
                                                                                ))}
                                                                                {provided.placeholder}
                                                                            </ul>
                                                                        )}
                                                                    </Droppable>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>

                                    <div className="mt-4">
                                        <h4 className="font-bold text-slate-700 mb-2 p-2">Ungrouped Tasks</h4>
                                        <Droppable droppableId="ungrouped-tasks" type="TASK">
                                            {(provided) => (
                                                <ul className="space-y-2 p-2 min-h-[50px] bg-slate-50 rounded-lg border" {...provided.droppableProps} ref={provided.innerRef}>
                                                    {taskData.ungroupedTasks.map((task, index) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                                            {(provided) => (
                                                                <li
                                                                    ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                    onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }}
                                                                    className="p-3 bg-white rounded-md shadow-sm border border-slate-200"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
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
                                                                    <div className="flex justify-end items-center mt-2">
                                                                        <span className="text-xs text-slate-500">Due: {formatDate(task.fields.due_date)}</span>
                                                                    </div>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </ul>
                                            )}
                                        </Droppable>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Documents Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>📎 Documents</h2>
                                <label className={`flex items-center gap-2 text-sm ${colorClasses.button.secondary} px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer`}>
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
                                        <li key={doc.id} className="group relative flex items-center justify-between bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <DocumentIcon />
                                                <button onClick={() => setSelectedDocument(doc.url)} className="text-sm font-medium text-blue-600 hover:underline text-left truncate" title={doc.filename}>
                                                    {doc.filename}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-slate-500">{formatBytes(doc.size)}</span>
                                                <button
                                                    onClick={() => handleDeleteDocument(doc.id)}
                                                    className="p-1 rounded-full text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label="Delete document"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    !isUploading && <p className="text-sm text-slate-500 text-center py-2">No documents attached.</p>
                                )}
                            </ul>
                        </section>

                        {/* Activities Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-3">
                                    <CalendarIcon />
                                    <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>Activities</h2>
                                </div>
                                {(changedActivities.toCreate.size > 0 || changedActivities.toUpdate.size > 0) && (
                                    <button
                                        onClick={handleSaveActivities}
                                        disabled={isUpdatingActivities}
                                        className={`flex items-center gap-2 text-sm ${colorClasses.button.success} disabled:opacity-50 px-3 py-1.5 rounded-lg shadow-sm transition-all`}
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
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm text-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header} text-center`}>Project Status</h2>
                                {userRole === 'consultant' && !isEditingDetails && !isEditingStatus && (
                                    <button onClick={() => { setEditedDetails(projectData.fields); setIsEditingStatus(true); }} className={`flex items-center gap-2 text-sm ${colorClasses.text.link} font-medium`}>
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

                                        <span className="font-medium text-slate-500">Full Cost:</span>
                                        <input
                                            type="number"
                                            value={editedDetails['Full Cost'] || ''}
                                            onChange={(e) => handleDetailChange('Full Cost', e.target.value)}
                                            className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                        />

                                        <span className="font-medium text-slate-500">Paid:</span>
                                        <input
                                            type="number"
                                            value={editedDetails['Paid'] || ''}
                                            onChange={(e) => handleDetailChange('Paid', e.target.value)}
                                            className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                        />

                                        <span className="font-medium text-slate-500">Balance:</span>
                                        <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Balance']}</span>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => { setIsEditingStatus(false); setEditedDetails(projectData.fields); }} className={`text-sm ${colorClasses.button.accent} px-4 py-2 rounded-md`}>Cancel</button>
                                        <button onClick={() => { handleSaveDetails(); setIsEditingStatus(false); }} className={`text-sm ${colorClasses.button.success} px-4 py-2 rounded-md`}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Current Status:</span><StatusBadge status={projectData.fields['Status']} /></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Submitted:</span><span className="font-semibold text-slate-800">{projectData.fields['Submitted (Y/N)']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Full Cost:</span><span className="font-semibold text-slate-800">{projectData.fields['Full Cost']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Paid:</span><span className="font-semibold text-slate-800">{projectData.fields['Paid']}</span></div>
                                    <div className="flex justify-between items-center"><span className="font-medium text-slate-500">Balance:</span><span className="font-semibold text-slate-800">{projectData.fields['Balance']}</span></div>
                                </div>
                            )}
                        </section>

                        {/* Key Dates Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm text-sm`}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>Key Dates</h2>
                                {userRole === 'consultant' && !isEditingDetails && !isEditingKeyDates && (
                                    <button onClick={() => { setEditedDetails(projectData.fields); setIsEditingKeyDates(true); }} className={`flex items-center gap-2 text-sm ${colorClasses.text.link} font-medium`}>
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            {isEditingKeyDates ? (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 items-center">
                                            <span className="font-medium text-slate-500">Last Updated:</span>
                                            <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Last Updated'] ? format(new Date(projectData.fields['Last Updated']), 'MM/dd/yyyy h:mm a') : 'N/A'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 items-center">
                                            <label htmlFor="submissionDate" className="font-medium text-slate-500">Submission Date:</label>
                                            <DatePicker
                                                id="submissionDate"
                                                selected={safeNewDate(editedDetails['Date of Submission'])}
                                                onChange={(date) => handleDetailChange('Date of Submission', date ? format(date, 'yyyy-MM-dd') : '')}
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                                placeholderText="Pick a date"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 items-center">
                                            <label htmlFor="estCompletion" className="font-medium text-slate-500">Est. Completion:</label>
                                            <input
                                                id="estCompletion"
                                                type="text"
                                                value={editedDetails['Estimated Completion'] || ''}
                                                onChange={(e) => handleDetailChange('Estimated Completion', e.target.value)}
                                                className="w-full p-1 border border-slate-300 rounded-md text-sm text-black"
                                                placeholder="e.g., Q4 2025"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => { setIsEditingKeyDates(false); setEditedDetails(projectData.fields); }} className={`text-sm ${colorClasses.button.accent} px-4 py-2 rounded-md`}>Cancel</button>
                                        <button onClick={() => { handleSaveDetails(); setIsEditingKeyDates(false); }} className={`text-sm ${colorClasses.button.success} px-4 py-2 rounded-md`}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 items-center gap-y-3">
                                    <span className="font-medium text-slate-500">Last Updated:</span>
                                    <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Last Updated'] ? format(new Date(projectData.fields['Last Updated']), 'MM/dd/yyyy h:mm a') : 'N/A'}</span>
                                    <span className="font-medium text-slate-500">Submission Date:</span>
                                    <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Date of Submission']}</span>
                                    <span className="font-medium text-slate-500">Est. Completion:</span>
                                    <span className="font-semibold text-slate-800 justify-self-end">{projectData.fields['Estimated Completion']}</span>
                                </div>
                            )}
                        </section>

                        {/* General Discussion Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-3">
                                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>💬 General Discussion</h2>
                                <AIDropdown 
                                    isAIMode={isAIMode}
                                    onToggle={setIsAIMode}
                                    disabled={isUploadingProjectChatFile || aiRequestInProgress}
                                />
                            </div>
                            <div ref={projectChatContainerRef} className="h-96 overflow-y-auto custom-scrollbar border-2 border-slate-200 rounded-xl p-4 space-y-4 mb-4 bg-gradient-to-b from-slate-50 to-white shadow-inner">
                                {isAIMode && (
                                    <div className="flex items-center justify-center py-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                                            <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-xs font-medium text-purple-700">AI responses use redacted project context</span>
                                        </div>
                                    </div>
                                )}
                                {projectMessages.map((msg) => {
                                    const isAI = isAIMessage(msg);
                                    const isConsultant = isConsultantMessage(msg);
                                    const isClient = isClientMessage(msg, projectData.fields['Project Name']);
                                    
                                    if (isAI) {
                                        return <AIMessage key={msg.id} message={msg} />;
                                    }
                                    
                                        const styling = getMessageStyling(msg, userRole, projectData.fields['Project Name']);
                                    return (
                                            <div key={msg.id} className={`flex ${styling.alignment}`}>
                                                <div className="relative max-w-md">
                                                    <div className={`p-4 rounded-2xl shadow-sm border ${styling.bgColor} ${styling.borderColor}`}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                                styling.label === 'Consultant' ? 'bg-blue-500' : 'bg-slate-500'
                                                            }`}>
                                                                <span className="text-white text-xs font-bold">
                                                                    {styling.label === 'Consultant' ? 'C' : 'U'}
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
                                                        {msg.fields.attachmentType?.startsWith('image/') ? (
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
                                                                            isConsultant 
                                                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
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
                                                            {isConsultant && <ReadReceipt isRead={msg.fields.is_read} />}
                                                </div>
                                            </div>
                                                    <div className={`absolute -bottom-1 ${isConsultant ? 'right-4' : 'left-4'} w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent ${
                                                        isConsultant ? 'border-t-blue-500' : 'border-t-slate-200'
                                                    }`}></div>
                                        </div>
                                            </div>
                                    );
                                })}
                                
                                {/* AI Typing Indicator */}
                                <AITypingIndicator isTyping={isAITyping} />
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
                                            placeholder={isAIMode ? "Ask Waiverlyn about your project..." : "Type a message..."}
                                            className={`w-full p-3 border-2 rounded-xl bg-white text-black transition-all duration-200 resize-none ${
                                                isAIMode ? 'border-purple-200' : 'border-slate-200'
                                            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                            rows={3}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendProjectMessage();
                                                }
                                            }}
                                        />
                                        {isAIMode && (
                                            <div className="absolute right-3 top-3">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
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
                                            isUploadingProjectChatFile || aiRequestInProgress
                                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                : isAIMode
                                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                                        }`}
                                        disabled={isUploadingProjectChatFile || aiRequestInProgress}
                                    >
                                        {isUploadingProjectChatFile ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Sending...</span>
                                            </div>
                                        ) : aiRequestInProgress ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>AI Processing...</span>
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
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>⚡️ Actions</h2>
                                    {!isAddingAction && (
                                        <button onClick={() => setIsAddingAction(true)} className={`flex items-center gap-2 text-sm ${colorClasses.button.secondary} px-3 py-1.5 rounded-lg shadow-sm transition-all`}>
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
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsAddingAction(false)} className="text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md">Cancel</button>
                                            <button onClick={handleSaveNewAction} className="text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-md">Save</button>
                                        </div>
                                    </div>
                                )}
                                {isLoadingActions ? (
                                    <p className="text-sm text-slate-500 text-center py-4">Loading actions...</p>
                                ) : (
                                    <div className="space-y-6">
                                        {/* --- Pending Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-amber-800 mb-2 pb-1 border-b-2 border-amber-200">Pending Actions</h3>
                                            <Droppable droppableId="pendingActions" type="ACTION">
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`space-y-3 p-3 rounded-lg min-h-[60px] transition-colors ${snapshot.isDraggingOver ? 'bg-amber-100' : 'bg-amber-50'}`}
                                                    >
                                                        {pendingActions.map((action, index) => (
                                                            <Draggable key={action.id} draggableId={action.id} index={index}>
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-sm group relative"
                                                                    >
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
                                                                        <button
                                                                            onClick={() => handleDeleteAction(action.id)}
                                                                            className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            aria-label="Delete action"
                                                                        >
                                                                            <TrashIcon />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>

                                        {/* --- Active Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-slate-700 mb-2 pb-1 border-b-2 border-slate-200">Actions</h3>
                                            <Droppable droppableId="activeActions" type="ACTION">
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`space-y-3 p-3 rounded-lg min-h-[60px] transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-slate-50'}`}
                                                    >
                                                        {activeActions.map((action, index) => (
                                                            <Draggable key={action.id} draggableId={action.id} index={index}>
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors shadow-sm group relative"
                                                                    >
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
                                                                        <button
                                                                            onClick={() => handleDeleteAction(action.id)}
                                                                            className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            aria-label="Delete action"
                                                                        >
                                                                            <TrashIcon />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>

                                        {/* --- Completed Actions --- */}
                                        <div>
                                            <h3 className="text-md font-semibold text-slate-700 mb-2 pb-1 border-b-2 border-slate-200">Completed Actions</h3>
                                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                                {completedActions.map((action) => (
                                                    <div key={action.id} className="p-3 bg-white rounded-lg border border-slate-200 opacity-70 group relative">
                                                        <div className="flex items-start gap-4">
                                                            <input type="checkbox" checked={action.fields.completed || false} onChange={(e) => handleActionChange(action, 'completed', e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer" aria-label="Action completed" />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-slate-600 font-medium line-through">{action.fields.action_description}</p>
                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                                    <span>Created: <span className="font-semibold">{action.fields.set_date}</span></span>
                                                                    <span>Est. Completion: <span className="font-semibold">{action.fields.estimated_completion_date}</span></span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteAction(action.id)}
                                                            className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                            aria-label="Delete action"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </section>

                        {/* Internal Notes Section */}
                        <InternalNotesSection 
                            projectId={projectData.id} 
                            currentUser={currentUser}
                            userRole={userRole}
                            projectIDReadable={projectData.fields['Project ID']}
                        />

                        {/* Collaborators Section */}
                        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <CollaboratorIcon />
                                    <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>Collaborators</h2>
                                </div>
                                <button onClick={() => setIsAddCollaboratorVisible(true)} className={`flex items-center gap-2 text-sm ${colorClasses.button.secondary} px-3 py-1.5 rounded-lg shadow-sm transition-all`}>
                                    <AddIcon />
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {projectData.fields['collaborator_name'] && projectData.fields['collaborator_name'].length > 0 ? (
                                    projectData.fields['collaborator_name'].map((name, index) => (
                                        <div key={index} className="group relative flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-800">
                                            <span>{name}</span>
                                            <button
                                                onClick={() => handleDeleteCollaborator(name)}
                                                className="p-1 rounded-full text-slate-400 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                aria-label={`Remove ${name}`}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-2">No collaborators assigned.</p>
                                )}
                            </div>
                        </section>

                    </div>
                </div>
                </DragDropContext>
                </main>
            </div>

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
                    nextTaskOrder={taskData.ungroupedTasks.length}
                />
            )}

            {isAddGroupFormVisible && (
                <AddGroupForm
                    projectData={projectData}
                    taskData={taskData}
                    onClose={() => setIsAddGroupFormVisible(false)}
                    onGroupAdded={handleGroupAdded}
                />
            )}

            {isAddCollaboratorVisible && (
                <AddCollaboratorForm
                    projectId={projectData.id}
                    onClose={() => setIsAddCollaboratorVisible(false)}
                    onCollaboratorAdded={handleCollaboratorAdded}
                />
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
        </div>
    );
};