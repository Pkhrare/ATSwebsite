import React, { useState, useRef } from 'react';
import { dropdownFields, safeNewDate } from '../../utils/validations';
import RichTextEditor from '../richText/RichTextEditor';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import { saveContent } from '../../utils/contentUtils';
import AttachChecklistsForm from './taskActionForms/AttachChecklistsForm';
import { Draggable, Droppable, DragDropContext } from '@hello-pangea/dnd';
import AttachTaskformsForm from './taskActionForms/AttachTaskformsForm';
import { v4 as uuidv4 } from 'uuid';
import ApiCaller from '../apiCall/ApiCaller';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';



const AddTaskToProjectForm = ({ onClose, onTaskAdded, projectId, projectName, assigneeOptions, nextTaskOrder }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const descriptionRef = useRef(null);
    const [initialDescription] = useState('{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}');
    const [attachmentDescriptions, setAttachmentDescriptions] = useState(['']);
    const [showAttachmentsSection, setShowAttachmentsSection] = useState(false);
    const [isChecklistFormOpen, setChecklistFormOpen] = useState(false);
    const [isTaskformsFormOpen, setTaskformsFormOpen] = useState(false);
    const [checklistItems, setChecklistItems] = useState([]);
    const [attachedForm, setAttachedForm] = useState(null);
    console.log("nextTaskOrder", nextTaskOrder);
    const today = new Date().toISOString().split('T')[0];
    
    const [formData, setFormData] = useState({
        id: `T-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        task_title: '',
        project_id: projectId,
        assigned_to: assigneeOptions?.length > 0 ? assigneeOptions[0] : '',
        task_status: 'Not Started',
        due_date: '',
        start_date: today,
        tags: '',
        Action_type: dropdownFields.Action_type[0], // Default to the first option
    });
    
    const [formErrors, setFormErrors] = useState({});
    
    const validateField = (name, value) => {
        switch (name) {
            case 'task_title':
                return value.trim() ? '' : 'Task title is required';
            case 'due_date':
                if (value){
                    if (new Date(value) < new Date(formData.start_date)) return 'Due date must be after start date';
                }
                return '';
            default:
                return '';
        }
    };
    
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: null }));
        }
    };
    
    const handleDescriptionChange = (index, value) => {
        const newDescriptions = [...attachmentDescriptions];
        newDescriptions[index] = value;
        setAttachmentDescriptions(newDescriptions);
    };

    const addDescriptionRow = () => {
        setAttachmentDescriptions([...attachmentDescriptions, '']);
    };

    const removeDescriptionRow = (index) => {
        if (attachmentDescriptions.length > 1) {
            const newDescriptions = attachmentDescriptions.filter((_, i) => i !== index);
            setAttachmentDescriptions(newDescriptions);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const errors = Object.keys(formData).reduce((acc, key) => {
            const error = validateField(key, formData[key]);
            if (error) acc[key] = error;
            return acc;
        }, {});
        
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Step 1: Create the task (without description - we'll save it as attachment)
            const taskData = { 
                ...formData, 
                progress_bar: 0,
                order: nextTaskOrder,
            };

            // If due_date is empty, remove it to avoid sending an invalid value to the API.
            if (!taskData.due_date) {
                delete taskData.due_date;
            }

            if (taskData.project_id) {
                taskData.project_id = [taskData.project_id];
            }
            
            const taskRequestBody = {
                recordsToCreate: [{ fields: taskData }],
                tableName: 'tasks'
            };
            
            const taskResult = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify(taskRequestBody),
            });
            
            const newTaskId = taskResult.records[0].id;

            // Step 2: Save description as attachment if there's content
            const descriptionState = descriptionRef.current || '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';
            try {
                await saveContent('tasks', newTaskId, 'description', descriptionState);
            } catch (descriptionError) {
                console.error("Task created, but failed to save description:", descriptionError);
                setError("Task created, but description failed to save. You can add it later via 'Edit Task'.");
            }

            // Step 3: Create attachments if any descriptions are provided
            const validDescriptions = attachmentDescriptions.map(d => d.trim()).filter(d => d);
            if (validDescriptions.length > 0) {
                const attachmentsToCreate = validDescriptions.map(desc => ({
                    fields: {
                        task_id: [newTaskId],
                        attachment_description: desc,
                    },
                }));

                const attachmentsRequestBody = {
                    recordsToCreate: attachmentsToCreate,
                    tableName: 'task_attachments',
                };

                try {
                    await ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify(attachmentsRequestBody),
                    });
                } catch (attachmentError) {
                    console.error("Task created, but failed to add attachments:", attachmentError);
                    setError("Task created, but attachments failed. You can add them later via 'Edit Task'.");
                }
            }

            // Step 4: Create checklist items
            if (checklistItems.length > 0) {
                const recordsToCreate = checklistItems.map(item => ({
                    fields: {
                        task_id: [newTaskId],
                        checklist_description: item.checklist_description,
                        order_number: item.order_number,
                        completed: item.completed,
                        checlist_id: `CL-${Math.random().toString(36).substr(2, 5)}`
                    }
                }));

                const checklistRequestBody = {
                    recordsToCreate,
                    tableName: 'task_checklists'
                };

                try {
                    await ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify(checklistRequestBody)
                    });
                } catch (checklistError) {
                    console.error("Task created, but failed to add checklist items:", checklistError);
                    setError("Task created, but checklist items failed. You can add them later via 'Edit Task'.");
                }
            }

            // Step 5: Create empty form submission if a form is attached
            console.log("attachedForm", attachedForm);
            if (attachedForm) {
                console.log("attachedForm", attachedForm);
                const submissionId = uuidv4();
                
                const fieldIds = attachedForm.fields.task_forms_fields;

                // Defensive check: ensure the form and its fields exist before proceeding.
                if (!attachedForm || !Array.isArray(fieldIds) || fieldIds.length === 0) {
                    // It's better to clean up the created task than to leave an orphaned one.
                    await ApiCaller(`/records/tasks/${newTaskId}`, {
                        method: 'DELETE',
                        body: JSON.stringify({ recordIds: [newTaskId] })
                    });
                    throw new Error("The selected form has no fields linked to it in the backend and cannot be attached. Please select another form or update the form configuration.");
                }

                // Ensure we have a valid array of field IDs before proceeding
                if (Array.isArray(fieldIds) && fieldIds.length > 0) {
                    // Fetch form fields using their IDs from the attachedForm object
                    const formFieldsResponse = await ApiCaller('/records/by-ids', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            recordIds: fieldIds, 
                            tableName: 'task_forms_fields' 
                        }),
                    });

                    const formFields = formFieldsResponse.records;
                    
                    if (formFields && formFields.length > 0) {
                        const recordsToCreate = formFields.map(field => ({
                            fields: {
                                submission_id: submissionId,
                                form: [attachedForm.id],
                                field: [field.id],
                                task_id: [newTaskId],
                                value: '--EMPTY--', // Placeholder value
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
        
                        // Link submissions back to the task
                        if (newSubmissions && newSubmissions.length > 0) {
                            await ApiCaller(`/records/tasks/${newTaskId}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    fields: {
                                        task_forms_submissions: newSubmissions.map(s => s.id)
                                    }
                                })
                            });
                        }
                    }
                }
            }
            
            // Re-fetch the task to get the updated record with submissions
            const finalTask = await ApiCaller(`/records/tasks/${newTaskId}`);

            if (onTaskAdded) {
                onTaskAdded(finalTask);
            }
            
            onClose();
        } catch (error) {
            console.error("Error creating task:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex" style={{ maxHeight: '90vh' }}>
                <div className="flex-grow overflow-auto custom-scrollbar">
                    <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Add Task to {projectName}</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="p-6">
                        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task ID</label>
                                <input type="text" value={formData.id} onChange={(e) => handleInputChange('id', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-black" required />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title*</label>
                                <input type="text" value={formData.task_title} onChange={(e) => handleInputChange('task_title', e.target.value)} className={`w-full px-3 py-2 border ${formErrors.task_title ? 'border-red-500' : 'border-gray-300'} rounded-md text-black`} required />
                                {formErrors.task_title && <p className="mt-1 text-sm text-red-600">{formErrors.task_title}</p>}
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <RichTextEditor 
                                    isEditable={true} 
                                    initialContent={initialDescription}
                                    onChange={(state) => descriptionRef.current = state} 
                                />
                            </div>

                            {attachedForm && (
                                <div className="md:col-span-2 p-4 border rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-medium text-gray-700">Attached Form</h3>
                                        <button type="button" onClick={() => setAttachedForm(null)} className="text-sm text-red-600 hover:underline">Remove</button>
                                    </div>
                                    <p className="text-sm text-gray-800">{attachedForm.fields.form_name}</p>
                                </div>
                            )}

                            {checklistItems.length > 0 && (
                                <div className="md:col-span-2 p-4 border rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-medium text-gray-700">Checklist</h3>
                                        <button 
                                            type="button" 
                                            onClick={() => setChecklistFormOpen(true)} 
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {checklistItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <input type="checkbox" checked={item.completed} readOnly className="h-4 w-4 rounded border-gray-300"/>
                                                <label className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                                    {item.checklist_description}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showAttachmentsSection && (
                                <div className="md:col-span-2 space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">File Attachment Requests (Optional)</label>
                                    {attachmentDescriptions.map((desc, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={desc}
                                                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                                placeholder={`File description ${index + 1}`}
                                                className="w-full px-3 py-2 border rounded-md text-black text-sm"
                                            />
                                            {attachmentDescriptions.length > 1 && (
                                                <button type="button" onClick={() => removeDescriptionRow(index)} className="p-2 text-red-500 hover:text-red-700">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addDescriptionRow} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                        Add another file request
                                    </button>
                                </div>
                            )}


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                <select value={formData.assigned_to} onChange={(e) => handleInputChange('assigned_to', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-black" required>
                                    <option value="">Select Assignee</option>
                                    {assigneeOptions?.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={formData.task_status} onChange={(e) => handleInputChange('task_status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-black">
                                    <option value="Not Started">Not Started</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <DatePicker
                                    selected={safeNewDate(formData.due_date)}
                                    onChange={(date) => handleInputChange('due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                    dateFormat="yyyy-MM-dd"
                                    minDate={safeNewDate(formData.start_date)}
                                    className={`w-full px-3 py-2 border ${formErrors.due_date ? 'border-red-500' : 'border-gray-300'} rounded-md text-black`}
                                    placeholderText="Select a due date"
                                />
                                {formErrors.due_date && <p className="mt-1 text-sm text-red-600">{formErrors.due_date}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Call to action for the assignee</label>
                                <select value={formData.Action_type} onChange={(e) => handleInputChange('Action_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-black">
                                    {dropdownFields.Action_type.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                <input type="text" value={formData.tags} onChange={(e) => handleInputChange('tags', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-black" placeholder="Tag1,Tag2,..." />
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="w-64 border-l p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-800 mb-4">Add Task Fields</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li onClick={() => setChecklistFormOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            Checklist
                        </li>
                        <li onClick={() => setShowAttachmentsSection(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> Attach Files</li>
                        
                        <li onClick={() => setTaskformsFormOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Complete Form
                        </li>
                    </ul>
                </div>
            </div>
            {isChecklistFormOpen && (
                <AttachChecklistsForm 
                    taskId={null} 
                    onClose={() => setChecklistFormOpen(false)} 
                    initialChecklistItems={checklistItems}
                    onChecklistSaved={(items) => {
                        setChecklistItems(items);
                        setChecklistFormOpen(false);
                    }}
                />
            )}
            {isTaskformsFormOpen && (
                <AttachTaskformsForm
                    onClose={() => setTaskformsFormOpen(false)}
                    onFormAttach={(form) => {
                        setAttachedForm(form);
                        setTaskformsFormOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default AddTaskToProjectForm; 