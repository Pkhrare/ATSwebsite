import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import RichTextEditor from '../richText/RichTextEditor';
import { dropdownFields, safeNewDate } from '../../utils/validations';
import { toLexical } from '../../utils/lexicalUtils';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { v4 as uuidv4 } from 'uuid'; // For unique IDs for new checklist items
import AttachTaskformsForm from "../forms/taskActionForms/AttachTaskformsForm"; // Import the form

const TemplateTaskCard = ({ task, onClose, onTaskUpdate, assigneeOptions = [] }) => {
    const [editedTask, setEditedTask] = useState(task.fields);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const descriptionRef = useRef(null);
    const [checklistItems, setChecklistItems] = useState([]);
    const [isChecklistVisible, setIsChecklistVisible] = useState(false);
    const [attachedForm, setAttachedForm] = useState(null);
    const [isAttachFormOpen, setIsAttachFormOpen] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [isAttachmentsVisible, setIsAttachmentsVisible] = useState(false);


    useEffect(() => {
        setEditedTask(task.fields);
        descriptionRef.current = toLexical(task.fields.description || '');
        setChecklistItems(task.fields.checklistItems || []);
        if (task.fields.checklistItems && task.fields.checklistItems.length > 0) {
            setIsChecklistVisible(true);
        }
        // Initialize attached form from the task prop, if it exists
        setAttachedForm(task.fields.attachedForm || null);
        // Initialize attachments from the task prop, if they exist
        setAttachments(task.fields.attachments || []);
        if (task.fields.attachments && task.fields.attachments.length > 0) {
            setIsAttachmentsVisible(true);
        }
    }, [task]);

    const handleInputChange = (field, value) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
    };

    const handleDescriptionChange = (newDescriptionState) => {
        descriptionRef.current = newDescriptionState;
    };

    const handleAddChecklistItem = (description) => {
        if (description.trim()) {
            const newItem = {
                id: uuidv4(), // Temporary unique ID
                checklist_description: description,
                completed: false,
            };
            setChecklistItems([...checklistItems, newItem]);
        }
    };

    const handleChecklistItemChange = (id, newDescription) => {
        setChecklistItems(checklistItems.map(item =>
            item.id === id ? { ...item, checklist_description: newDescription } : item
        ));
    };
    
    const handleRemoveChecklistItem = (id) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    const handleFormAttach = (form) => {
        setAttachedForm(form);
        setIsAttachFormOpen(false);
    };

    const handleAddAttachment = (description) => {
        if (description.trim()) {
            const newAttachment = {
                id: uuidv4(), // Temporary unique ID
                attachment_description: description,
            };
            setAttachments([...attachments, newAttachment]);
        }
    };

    const handleAttachmentChange = (id, newDescription) => {
        setAttachments(attachments.map(att =>
            att.id === id ? { ...att, attachment_description: newDescription } : att
        ));
    };

    const handleRemoveAttachment = (id) => {
        setAttachments(attachments.filter(att => att.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalTaskData = {
            ...editedTask,
            description: descriptionRef.current,
            checklistItems: checklistItems,
            attachedForm: attachedForm, // Include attached form in the final data
            attachments: attachments, // Include attachments in the final data
        };
        onTaskUpdate({ ...task, fields: finalTaskData });
        onClose();
    };

    if (!task) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Edit Template Task</h2>
                        <div className="flex items-center gap-2">
                            {/* Add Field Buttons */}
                            <button type="button" onClick={() => setIsChecklistVisible(true)} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md">Add Checklist</button>
                            <button type="button" onClick={() => setIsAttachFormOpen(true)} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md">Add Form</button>
                            <button type="button" onClick={() => setIsAttachmentsVisible(true)} className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md">Add Attachment</button>
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ml-4" aria-label="Close">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-grow p-6 overflow-y-auto space-y-6">
                        {/* Task Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                            <input
                                type="text"
                                value={editedTask.task_title || ''}
                                onChange={(e) => handleInputChange('task_title', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-black text-sm"
                            />
                        </div>

                        {/* Assigned To & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To (Optional)</label>
                                <select value={editedTask.assigned_to || ''} onChange={(e) => handleInputChange('assigned_to', e.target.value)} className="w-full p-2 border rounded-md text-black text-sm">
                                    <option value="">Unassigned</option>
                                    {assigneeOptions.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Status</label>
                                <select
                                    value={editedTask.task_status || ''}
                                    onChange={(e) => handleInputChange('task_status', e.target.value)}
                                    className="w-full p-2 border rounded-md text-black text-sm"
                                >
                                    <option>Not Started</option>
                                    <option>In Progress</option>
                                    <option>Completed</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                            <DatePicker
                                selected={safeNewDate(editedTask.due_date)}
                                onChange={(date) => handleInputChange('due_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                dateFormat="yyyy-MM-dd"
                                className="w-full px-3 py-2 border rounded-md text-black text-sm"
                                placeholderText="Pick a date"
                            />
                        </div>

                        {/* Description */}
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <button type="button" onClick={() => setIsEditingDescription(!isEditingDescription)} className="text-sm text-blue-600 hover:underline">
                                    {isEditingDescription ? 'Done' : 'Edit'}
                                </button>
                            </div>
                            <RichTextEditor
                                isEditable={isEditingDescription}
                                initialContent={descriptionRef.current}
                                onChange={handleDescriptionChange}
                            />
                        </div>

                        {/* Attached Form Section */}
                        {attachedForm && (
                             <div className="p-4 border border-gray-200 rounded-lg">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-700">Attached Form</h3>
                                        <p className="text-sm text-gray-800 font-semibold mt-1">{attachedForm.fields.form_name}</p>
                                    </div>
                                    <button type="button" onClick={() => setAttachedForm(null)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                                </div>
                             </div>
                        )}
                        
                        {/* Attachments Section */}
                        {isAttachmentsVisible && (
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Attachment Placeholders</h3>
                                <div className="space-y-2">
                                    {attachments.map((att) => (
                                        <div key={att.id} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={att.attachment_description}
                                                onChange={(e) => handleAttachmentChange(att.id, e.target.value)}
                                                className="w-full px-2 py-1 border rounded-md text-black text-sm"
                                                placeholder="File description..."
                                            />
                                            <button type="button" onClick={() => handleRemoveAttachment(att.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <AttachmentInput onAdd={handleAddAttachment} />
                            </div>
                        )}

                        {/* Checklist Section */}
                        {isChecklistVisible && (
                            <div className="p-4 border border-gray-200 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Checklist</h3>
                                <div className="space-y-2">
                                    {checklistItems.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={item.checklist_description}
                                                onChange={(e) => handleChecklistItemChange(item.id, e.target.value)}
                                                className="w-full px-2 py-1 border rounded-md text-black text-sm"
                                            />
                                            <button type="button" onClick={() => handleRemoveChecklistItem(item.id)} className="text-red-500 hover:text-red-700 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <ChecklistItemInput onAdd={handleAddChecklistItem} />
                            </div>
                        )}


                        {/* Action Buttons */}
                        <div className="mt-6 pt-6 border-t flex justify-end items-center">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-3 hover:bg-gray-300 font-medium">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Update Task</button>
                        </div>
                    </form>
                </div>
            </div>
            {isAttachFormOpen && (
                <AttachTaskformsForm
                    onClose={() => setIsAttachFormOpen(false)}
                    onFormAttach={handleFormAttach}
                />
            )}
        </>
    );
};

// A small helper component to handle adding new checklist items
const ChecklistItemInput = ({ onAdd }) => {
    const [text, setText] = useState('');
    const handleAdd = () => {
        onAdd(text);
        setText('');
    };
    return (
        <div className="flex items-center gap-2 mt-3">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                placeholder="Add a new item..."
                className="w-full px-3 py-2 border rounded-md text-black text-sm"
            />
            <button type="button" onClick={handleAdd} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium">Add</button>
        </div>
    );
};

const AttachmentInput = ({ onAdd }) => {
    const [text, setText] = useState('');
    const handleAdd = () => {
        onAdd(text);
        setText('');
    };
    return (
        <div className="flex items-center gap-2 mt-3">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                placeholder="Add a file description..."
                className="w-full px-3 py-2 border rounded-md text-black text-sm"
            />
            <button type="button" onClick={handleAdd} className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm font-medium">Add</button>
        </div>
    );
};

export default TemplateTaskCard;
