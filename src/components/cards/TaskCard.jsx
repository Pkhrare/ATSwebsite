import React, { useState, useEffect, useRef, useCallback } from 'react'; // Import useCallback
import { parse, format, isValid } from 'date-fns';
import io from 'socket.io-client';
import RichTextEditor from '../richText/RichTextEditor';
import { dropdownFields, safeNewDate } from '../../utils/validations';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import AttachFilesForm from '../forms/taskActionForms/AttachFilesForm';
import AttachChecklistsForm from '../forms/taskActionForms/AttachChecklistsForm';
import AttachTaskformsForm from '../forms/taskActionForms/AttachTaskformsForm';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import ApiCaller from '../apiCall/ApiCaller';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4
import { useAuth } from '../../utils/AuthContext';
import { TrashIcon } from '@heroicons/react/24/outline';


const apiFetch = async (endpoint, options = {}) => {
    return await ApiCaller(endpoint, options);
};


export default function TaskCard({ task, onClose, onTaskUpdate, assigneeOptions, isClientView = false, isEditable = false }) {
    const { userRole } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [editedTask, setEditedTask] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const descriptionRef = useRef(null);
    const [attachments, setAttachments] = useState([]);
    const [isAttachFilesFormOpen, setAttachFilesFormOpen] = useState(false);
    const [isAttachChecklistsFormOpen, setAttachChecklistsFormOpen] = useState(false);
    const [isAttachTaskformsFormOpen, setAttachTaskformsFormOpen] = useState(false);
    const [isAttachmentsLoading, setIsAttachmentsLoading] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [initialChecklistItems, setInitialChecklistItems] = useState([]); // For locking
    const [isChecklistLoading, setIsChecklistLoading] = useState(true);
    const [formSubmissions, setFormSubmissions] = useState([]);
    const [initialFormSubmissions, setInitialFormSubmissions] = useState([]); // To track changes
    const [isFormSubmissionsLoading, setIsFormSubmissionsLoading] = useState(true);
    const [isEditingForm, setIsEditingForm] = useState(false);
    const fileInputRefs = useRef({});
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const socketRef = useRef();
    const chatContainerRef = useRef(null);
    // --- Add this ref for the modal content ---
    const modalContentRef = useRef(null);
    const [refetchCounter, setRefetchCounter] = useState(0);
    const forceRefetch = useCallback(() => setRefetchCounter(c => c + 1), []);

    const readOnlyFields = ["id", "project_id", "start_date", "Project Name (from project_id)", "Project ID (from Project ID)"];

    // Determine if the user has permission to edit fields in this card
    const canEdit = !isClientView || isEditable;


    useEffect(() => {
        // Socket.IO connection
        socketRef.current = io("https://ats-backend-805977745256.us-central1.run.app");

        socketRef.current.on('connect', () => {
            console.log('Connected to socket server');
            if (task?.id) {
                socketRef.current.emit('joinTaskRoom', task.id);
            }
        });

        socketRef.current.on('receiveMessage', (message) => {
            setMessages(prevMessages => [...prevMessages, message]);
        });

        socketRef.current.on('sendMessageError', (error) => {
            console.error("Error sending message:", error);
            // You could set an error state here to show in the UI
        });

        return () => {
            if (task?.id) {
                socketRef.current.emit('leaveTaskRoom', task.id);
            }
            socketRef.current.disconnect();
        };
    }, [task?.id]);

    useEffect(() => {
        // Scroll to the bottom of the chat container when new messages arrive
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const fetchChatMessages = async () => {
            if (!task?.id) return;
            try {
                // Use the custom field ID for filtering, not the record ID
                const { records } = await ApiCaller(`/records/filter/${task.fields.id}/task_chat`);
                const sortedMessages = records.sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime));
                setMessages(sortedMessages);
            } catch (err) {
                setError('Failed to load chat history.');
            }
        };

        const fetchAttachments = async () => {
            if (!task?.id) return;
            setIsAttachmentsLoading(true);
            try {
                // Use the custom field ID for filtering
                const data = await ApiCaller(`/records/filter/${task.fields.id}/task_attachments`);
                setAttachments(data.records || []);
            } catch (error) {
                console.error(error);
                setError('Could not load attachments.');
            } finally {
                setIsAttachmentsLoading(false);
            }
        };

        const fetchSubmissions = async () => {
            if (!task?.id) {
                setIsFormSubmissionsLoading(false);
                return;
            }
            try {
                // Use the custom field ID for filtering
                const { records } = await ApiCaller(`/records/filter/${task.fields.id}/task_forms_submissions`);
                setFormSubmissions(records);
                setInitialFormSubmissions(JSON.parse(JSON.stringify(records)));
            } catch (err) {
                setError('Failed to load form submissions.');
            } finally {
                setIsFormSubmissionsLoading(false);
            }
        };

        const fetchChecklists = async () => {
            if (!task?.id) {
                setIsChecklistLoading(false);
                return;
            }
            setIsChecklistLoading(true);
            try {
                // Use the custom field ID for filtering
                const { records } = await ApiCaller(`/records/filter/${task.fields.id}/task_checklists`);
                const sortedRecords = records.sort((a, b) => a.fields.order_number - b.fields.order_number);
                const items = sortedRecords.map(r => ({ ...r.fields, id: r.id }));
                setChecklistItems(items);
                setInitialChecklistItems(JSON.parse(JSON.stringify(items)));
            } catch (err) {
                setError('Failed to load checklists.');
            } finally {
                setIsChecklistLoading(false);
            }
        };

        if (task) {
            setEditedTask(task.fields);
            descriptionRef.current = toLexical(task.fields.description);
            fetchAttachments();
            fetchChecklists();
            fetchSubmissions();
            fetchChatMessages();
        }
    }, [task?.id, refetchCounter]);


    // --- Implement the click outside logic ---
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If the click is outside the modal content and not on the "edit description" button
            // The "edit description" button toggles `isEditingDescription`, and its click
            // might happen *before* the document listener, leading to closure.
            // We ensure that if the editor is active, clicks inside the editor or its toolbar
            // do not close the card.

            // Get the element that triggered the event
            const target = event.target;

            // Check if the click occurred outside the modal content (the task card itself)
            // AND the click was not on the "edit description" button
            // AND the click was not inside the Lexical editor's content or toolbar
            if (modalContentRef.current && !modalContentRef.current.contains(target)) {
                // Lexical handles its own focus, so we need to be careful not to close
                // the modal if the click originated from within the editor's interactive
                // elements (like the toolbar buttons).
                // However, since the toolbar is *inside* modalContentRef, the check above
                // `!modalContentRef.current.contains(target)` should prevent closing
                // when clicking the toolbar.
                // This `handleClickOutside` will only fire if the click is truly outside the
                // entire task card's `div`.

                // We add a small timeout to allow Lexical's internal events to settle,
                // which can sometimes prevent race conditions where the modal closes
                // before Lexical finishes processing a click on its buttons.
                // This is a common pattern for "click outside" handlers with complex
                // interactive children.
                setTimeout(() => {
                    onClose();
                }, 0);
            }
        };

        // Attach the event listener when the component mounts
        document.addEventListener('mousedown', handleClickOutside);
        // Clean up the event listener when the component unmounts
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, modalContentRef]); // Depend on onClose and modalContentRef

    // Prevent propagation from the overlay itself, so clicks directly on the dim background
    // don't immediately trigger the document listener and close the modal.
    const handleOverlayClick = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    const handleInputChange = (field, value) => {
        setEditedTask(prev => ({ ...prev, [field]: field === 'progress_bar' ? parseFloat(value) : value }));
    };

    const handleDescriptionChange = (newDescriptionState) => {
        descriptionRef.current = newDescriptionState;
    };

    const handleAttachmentsAdded = (newAttachments) => {
        setAttachments(prev => [...prev, ...newAttachments]);
        // After adding, we don't need to re-fetch, just update the UI state
        // and the parent task will be updated on submit.
        onTaskUpdate(prevTask => {
            const newAttachmentIds = newAttachments.map(att => att.id);
            const existingAttachmentIds = prevTask.fields.task_attachments || [];
            return {
                ...prevTask,
                fields: {
                    ...prevTask.fields,
                    task_attachments: [...existingAttachmentIds, ...newAttachmentIds]
                }
            };
        });
    };

    const handleUploadClick = (attachment) => {
        // For consultants, if a file exists, ask for confirmation before replacing.
        if (!isClientView && attachment.fields.Attachments && attachment.fields.Attachments.length > 0) {
            const isConfirmed = window.confirm(`Are you sure you want to replace "${attachment.fields.Attachments[0].filename}"? This action cannot be undone.`);
            if (!isConfirmed) {
                return;
            }
        }
        // For clients, or for consultants on first upload/confirmed replace, trigger file input.
        fileInputRefs.current[attachment.id]?.click();
    };

    const handleFileChange = async (e, attachment) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploadingAttachment(true);

        const hasExisting = !!attachment.fields.Attachments?.length;
        // For clients, always upload (append). For consultants, replace if file exists.
        const endpoint = (hasExisting && !isClientView)
            ? `/replace/task_attachments/${attachment.id}/Attachments`
            : `/upload/task_attachments/${attachment.id}/Attachments`;

        try {
            await ApiCaller(endpoint, {
                method: 'POST',
                body: formData,
            });

            forceRefetch();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploadingAttachment(false);
        }
    };

    const handleDeleteTask = async () => {
        // Step 1: Confirm the user's intent to delete.
        if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            return;
        }

        try {
            // Step 2: Call the correct endpoint with the record ID in the body.
            await ApiCaller(`/records/tasks`, {
                method: 'DELETE',
                body: JSON.stringify({
                    recordIds: [task.id] // The backend expects an array of IDs.
                })
            });

            // Step 3: Handle success *only* if the API call succeeds.
            // alert('Task deleted successfully!'); // Using alert since the component will close.
            onTaskUpdate(); // This will re-fetch the task list and close the card.

        } catch (err) {
            setError(err.message || 'Failed to delete task');
            alert(`Error: ${err.message || 'Failed to delete task'}`); // Inform the user of the failure.
        }
    };

    const handleChecklistItemChange = (itemId, completed) => {
        if (!canEdit) return; // <-- Prevent changes if not editable
        setChecklistItems(prev =>
            prev.map(item => (item.id === itemId ? { ...item, completed } : item))
        );
    };

    const handleFormAttached = async (form) => {
        if (!form || !task || !task.id) return;

        const fieldIds = form.fields.task_forms_fields;
        if (!Array.isArray(fieldIds) || fieldIds.length === 0) {
            setError("This form has no fields linked to it and cannot be attached. Please update the form configuration.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Fetch the full field records to get their details.
            const formFieldsResponse = await ApiCaller('/records/by-ids', {
                method: 'POST',
                body: JSON.stringify({
                    recordIds: fieldIds,
                    tableName: 'task_forms_fields'
                }),
            });
            const formFields = formFieldsResponse.records;

            if (!formFields || formFields.length === 0) {
                throw new Error("Could not fetch the details for the form fields.");
            }

            // Step 2: Create a unique submission ID for this batch.
            const submissionId = uuidv4();

            // Step 3: Create a submission record for each field in the form.
            const recordsToCreate = formFields.map(field => ({
                fields: {
                    submission_id: submissionId,
                    form: [form.id],
                    field: [field.id], // Correct field name is 'field'
                    task_id: [task.id], // Correct field name is 'task_id'
                    value: '--EMPTY--',
                }
            }));

            const submissionResult = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate,
                    tableName: 'task_forms_submissions'
                })
            });
            const newSubmissions = submissionResult.records;

            // Step 4: Link the new submissions back to the parent task.
            if (newSubmissions && newSubmissions.length > 0) {
                await ApiCaller(`/records/tasks/${task.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        fields: {
                            task_forms_submissions: newSubmissions.map(s => s.id)
                        }
                    })
                });
            }

            // Step 5: Refresh the UI.
            forceRefetch();

        } catch (error) {
            console.error("Failed to create form submissions:", error);
            setError("Failed to attach the form. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmissionChange = (submissionId, value) => {
        if (!canEdit) return; // <-- Prevent changes if not editable
        setFormSubmissions(prev =>
            prev.map(submission =>
                submission.id === submissionId ? { ...submission, fields: { ...submission.fields, value } } : submission
            )
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Update checklist items
            const checklistUpdates = checklistItems.map(item => ({
                id: item.id,
                fields: {
                    completed: item.completed
                }
            }));

            if (checklistUpdates.length > 0) {
                await ApiCaller('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        recordsToUpdate: checklistUpdates,
                        tableName: 'task_checklists'
                    })
                });
            }

            // Update form submissions
            const submissionUpdates = formSubmissions.map(submission => ({
                id: submission.id,
                fields: {
                    value: submission.fields.value
                }
            }));

            const formWasModified = JSON.stringify(formSubmissions) !== JSON.stringify(initialFormSubmissions);

            if (formWasModified && submissionUpdates.length > 0) {
                const currentStatus = formSubmissions[0].fields.submission;
                let nextStatus = currentStatus;

                if (currentStatus === 'Incomplete') {
                    nextStatus = 'Completed';
                } else if (currentStatus === 'Completed') {
                    nextStatus = 'Updated';
                }
                // If 'Updated', it remains 'Updated'

                submissionUpdates.forEach(sub => {
                    sub.fields.submission = nextStatus;
                });
            }

            // Whitelist approach: only construct an object with fields that are meant to be editable.
            // This prevents sending back read-only fields like lookups or formulas which can cause API errors.
            const updatableFields = {
                'assigned_to': editedTask.assigned_to,
                'task_status': editedTask.task_status,
                'due_date': editedTask.due_date,
                'Action_type': editedTask.Action_type,
                'description': descriptionRef.current,
                'progress_bar': editedTask.progress_bar,
                'tags': editedTask.tags,
            };

            // apiFetch returns the parsed JSON directly
            const updatedTask = await ApiCaller(`/records/tasks/${task.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ fields: updatableFields }),
            });


            if (submissionUpdates.length > 0) {
                await ApiCaller('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        recordsToUpdate: submissionUpdates,
                        tableName: 'task_forms_submissions'
                    })
                });
            }

            setSuccessMessage('Task updated successfully!');
            if (onTaskUpdate) onTaskUpdate(updatedTask);
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (newMessage.trim() && socketRef.current) {
            const senderName = isClientView ? task.fields['Project Name (from project_id)'][0] : 'Consultant';
            const idToSend = task.id || task.fields.id;
            socketRef.current.emit('sendMessage', {
                taskId: idToSend,
                message: newMessage,
                sender: senderName,
            });
            setNewMessage('');
        }
    };

    if (!task) return null;

    const calculateDaysRemaining = () => {
        if (!editedTask.due_date) return 'No due date';
        if (editedTask.task_status === 'Completed') return 'Completed';
        const dueDate = new Date(editedTask.due_date);
        const today = new Date();
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return 'Due today';
        return `${diffDays} days remaining`;
    };

    const isChecklistLockedForClient = isClientView && initialChecklistItems.some(item => item.completed);
    const isFormLockedForClient = isClientView && formSubmissions.length > 0 && (formSubmissions[0].fields.submission === 'Completed' || formSubmissions[0].fields.submission === 'Updated');


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
            <div ref={modalContentRef} className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h2 className="text-xl font-bold text-gray-800 truncate flex items-center gap-2">
                                {`TASK #${editedTask.id}: ${editedTask.task_title}`}
                            </h2>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex overflow-hidden">
                    <form onSubmit={handleSubmit} className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
                        <div className="space-y-6">
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-full">
                                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                                                        {editedTask.assigned_to ? editedTask.assigned_to.substring(0, 2).toUpperCase() : '?'}
                                                    </span>
                                                </div>
                                                <select value={editedTask.assigned_to || ''} onChange={(e) => handleInputChange('assigned_to', e.target.value)} className="w-full pl-11 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm" disabled={!canEdit}>
                                                    <option value="">Unassigned</option>
                                                    {assigneeOptions.map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Status</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <select
                                                value={editedTask.task_status || ''}
                                                onChange={(e) => handleInputChange('task_status', e.target.value)}
                                                className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm ${isClientView ? 'bg-gray-100' : ''}`}
                                                disabled={isClientView}
                                            >
                                                <option>Not Started</option>
                                                <option>In Progress</option>
                                                <option>Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                        <DatePicker
                                            selected={safeNewDate(editedTask.due_date)}
                                            onChange={(date) => handleInputChange('due_date', date ? format(date, 'yyyy-MM-dd') : null)}
                                            dateFormat="yyyy-MM-dd"
                                            className={`w-full px-3 py-2 border rounded-md text-black text-sm ${isClientView ? 'bg-gray-100' : ''}`}
                                            placeholderText="Pick a date"
                                            disabled={isClientView}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Call to action for the assignee</label>
                                        <select
                                            value={editedTask.Action_type || ''}
                                            onChange={(e) => handleInputChange('Action_type', e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-md text-black text-sm ${isClientView ? 'bg-gray-100' : ''}`}
                                            disabled={isClientView}
                                        >
                                            {dropdownFields.Action_type.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    {!isClientView && (
                                        <button type="button" onClick={() => setIsEditingDescription(!isEditingDescription)} className="text-gray-400 hover:text-gray-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.5 4.5z" /></svg>
                                        </button>
                                    )}
                                </div>
                                <RichTextEditor
                                    key={task.id}
                                    isEditable={isEditingDescription && !isClientView}
                                    initialContent={descriptionRef.current}
                                    onChange={handleDescriptionChange}
                                />
                            </div>

                            {(isChecklistLoading || checklistItems.length > 0) && (
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Checklist</h3>
                                    {isChecklistLoading ? (
                                        <p className="text-sm text-gray-500">Loading checklist...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {checklistItems.map(item => (
                                                <div key={item.id} className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.completed || false}
                                                        onChange={(e) => handleChecklistItemChange(item.id, e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        disabled={!canEdit}
                                                    />
                                                    <label className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                        {item.checklist_description}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(isFormSubmissionsLoading || formSubmissions.length > 0) && (
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-medium text-gray-700">{formSubmissions[0]?.fields['form_name (from form)']?.[0] || 'Form'}</h3>
                                            {(() => {
                                                const firstSubmission = formSubmissions[0];
                                                const submissionStatus = firstSubmission?.fields.submission;
                                                const lastUpdated = firstSubmission?.fields.last_updated;
                                                if (lastUpdated && (submissionStatus === 'Completed' || submissionStatus === 'Updated')) {
                                                    const formattedDate = format(new Date(lastUpdated), 'MMM d, yyyy h:mm a');
                                                    return <span className="text-xs text-gray-500 italic">({`${submissionStatus} on ${formattedDate}`})</span>;
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        {(!isClientView || !isFormLockedForClient) && canEdit &&
                                            <button type="button" onClick={() => setIsEditingForm(!isEditingForm)} className="text-sm text-blue-600 hover:underline">
                                                {isEditingForm ? 'Cancel' : 'Edit'}
                                            </button>
                                        }
                                    </div>
                                    {isFormSubmissionsLoading ? (
                                        <p className="text-sm text-gray-500">Loading form...</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {formSubmissions.map(submission => (
                                                <div key={submission.id}>
                                                    <label className="block text-sm font-medium text-gray-700">{submission.fields['field_label (from Notes)']?.[0]}</label>
                                                    <input
                                                        type="text"
                                                        value={submission.fields.value === '--EMPTY--' ? '' : submission.fields.value || ''}
                                                        onChange={(e) => handleFormSubmissionChange(submission.id, e.target.value)}
                                                        disabled={!canEdit || isFormLockedForClient}
                                                        className={`w-full px-3 py-2 border rounded-md text-black text-sm ${!canEdit || isFormLockedForClient ? 'bg-gray-100' : ''}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(isAttachmentsLoading || attachments.length > 0) && (
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                                    {isAttachmentsLoading ? (
                                        <div className="space-y-4">
                                            <div className="animate-pulse flex items-center justify-between"><div className="h-4 bg-gray-200 rounded w-3/5"></div><div className="h-8 bg-gray-200 rounded w-1/5"></div></div>
                                            <div className="animate-pulse flex items-center justify-between"><div className="h-4 bg-gray-200 rounded w-4/6"></div><div className="h-8 bg-gray-200 rounded w-1/5"></div></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {attachments.map((att) => (
                                                <div key={att.id} className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center">
                                                    <p className="text-sm text-gray-800 truncate">{att.fields.attachment_description}</p>
                                                    <div>
                                                        {att.fields.Attachments && att.fields.Attachments.length > 0 ? (
                                                            <div className="flex flex-col space-y-1">
                                                                {att.fields.Attachments.map((file, index) => (
                                                                    <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                                        {file.filename}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 italic">No file uploaded</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <input type="file" className="hidden" ref={el => (fileInputRefs.current[att.id] = el)} onChange={(e) => handleFileChange(e, att)} disabled={!canEdit} />
                                                        <button type="button" onClick={() => handleUploadClick(att)} className="text-sm bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-1.5 cursor-pointer hover:bg-gray-50 flex items-center justify-center disabled:opacity-50" disabled={!canEdit}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                            {isClientView ? (att.fields.Attachments?.length ? 'Add File' : 'Upload') : (att.fields.Attachments?.length ? 'Replace' : 'Upload')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                                        <input type="text" value={`${editedTask['Project Name (from project_id)']?.[0] || ''} (${editedTask['Project ID (from Project ID)']?.[0] || ''})`} className="w-full px-3 py-2 border rounded-md bg-gray-100 text-black text-sm" disabled />
                                    </div>
                                    <div className="p-3 bg-white rounded-md border w-1/3">
                                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Time Remaining
                                        </label>
                                        <div className={`text-lg font-bold ${calculateDaysRemaining().includes('overdue') ? 'text-red-600' : calculateDaysRemaining() === 'Due today' ? 'text-orange-600' : 'text-gray-800'}`}>{calculateDaysRemaining()}</div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Progress ({Math.round((editedTask.progress_bar || 0) * 100)}%)</label>
                                    <input type="range" min="0" max="1" step="0.01" value={editedTask.progress_bar || 0} onChange={(e) => handleInputChange('progress_bar', e.target.value)} className="w-full" disabled={!canEdit} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                    <input type="text" value={editedTask.tags || ''} onChange={(e) => handleInputChange('tags', e.target.value)} className="w-full px-3 py-2 border rounded-md text-black text-sm" placeholder="Tag1,Tag2,..." disabled={!canEdit} />
                                </div>
                                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                                    <div>
                                        {!isClientView && (
                                            <button type="button" onClick={handleDeleteTask} className="px-4 py-2 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700">
                                                Delete Task
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-3 hover:bg-gray-300 font-medium" disabled={isLoading}>Cancel</button>
                                        {canEdit && (
                                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium" disabled={isLoading}>
                                                {isLoading ? 'Updating...' : 'Update Task'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Task Chat</h3>
                                <div ref={chatContainerRef} className="h-48 overflow-y-auto custom-scrollbar border rounded-md p-2 space-y-2 mb-2 bg-gray-50">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.fields.sender === 'Consultant' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-2 rounded-lg max-w-xs ${msg.fields.sender === 'Consultant' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                                                <p className="text-xs font-bold">{msg.fields.sender}</p>
                                                <p className="text-sm">{msg.fields.message_text}</p>
                                                <p className="text-xs text-right opacity-75">{new Date(msg.createdTime).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex">
                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="w-full px-3 py-2 border rounded-l-md text-black text-sm" placeholder="Type a message..." />
                                    <button onClick={handleSendMessage} type="button" className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">Send</button>
                                </div>
                            </div>

                        </div>
                    </form>

                    {!isClientView && (
                        <div className="w-64 border-l p-4 bg-gray-50">
                            <h3 className="font-semibold text-gray-800 mb-4">Add Task Fields</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li onClick={() => setAttachChecklistsFormOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Checklist
                                </li>
                                <li onClick={() => setAttachFilesFormOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> Attach Files</li>
                                <li onClick={() => setAttachTaskformsFormOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Complete Form
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            {isAttachFilesFormOpen && (
                <AttachFilesForm
                    taskId={task.id}
                    onClose={() => setAttachFilesFormOpen(false)}
                    onAttachmentsAdded={handleAttachmentsAdded}
                />
            )}
            {isAttachChecklistsFormOpen && (
                <AttachChecklistsForm
                    taskId={task.id}
                    onClose={() => setAttachChecklistsFormOpen(false)}
                    onChecklistSaved={forceRefetch}
                />
            )}
            {isAttachTaskformsFormOpen && (
                <AttachTaskformsForm
                    onClose={() => setAttachTaskformsFormOpen(false)}
                    onFormAttach={handleFormAttached}
                />
            )}
        </div>
    );
};