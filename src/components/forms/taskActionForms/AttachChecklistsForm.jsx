import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'hhttps://ats-backend-805977745256.us-central1.run.app/api';

const apiFetch = async (endpoint, options = {}) => {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API request failed');
    }
    return response.json();
};

function AttachChecklistsForm({ taskId, onClose, onChecklistSaved, initialChecklistItems = [] }) {
    const [items, setItems] = useState([]);
    const [originalItems, setOriginalItems] = useState([]);
    const [newItemText, setNewItemText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setItems(initialChecklistItems.map((item, index) => ({...item, order_number: index + 1})));
    }, [initialChecklistItems]);

    const fetchChecklists = useCallback(async () => {
        if (!taskId) return;
        setIsLoading(true);
        try {
            const { records } = await apiFetch(`/records/filter/${taskId}/task_checklists`);
            const sortedRecords = records.sort((a, b) => a.fields.order_number - b.fields.order_number);
            setItems(sortedRecords.map(r => ({ ...r.fields, id: r.id })));
            setOriginalItems(sortedRecords.map(r => ({ ...r.fields, id: r.id })));
        } catch (err) {
            setError('Failed to load checklists.');
        } finally {
            setIsLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        if (taskId) {
            fetchChecklists();
        } else {
            setItems(initialChecklistItems);
        }
    }, [taskId, fetchChecklists, initialChecklistItems]);

    const handleOnDragEnd = (result) => {
        if (!result.destination) return;
        const updatedItems = Array.from(items);
        const [reorderedItem] = updatedItems.splice(result.source.index, 1);
        updatedItems.splice(result.destination.index, 0, reorderedItem);
        setItems(updatedItems.map((item, index) => ({ ...item, order_number: index + 1 })));
    };

    const handleAddItem = () => {
        if (newItemText.trim() === '') return;
        const newItem = {
            id: uuidv4(),
            checklist_description: newItemText,
            completed: false,
            order_number: items.length + 1,
            isNew: true,
        };
        setItems([...items, newItem]);
        setNewItemText('');
    };

    const handleItemChange = (id, newDescription) => {
        setItems(items.map(item => (item.id === id ? { ...item, checklist_description: newDescription } : item)));
    };

    const handleToggleComplete = (id) => {
        setItems(items.map(item => (item.id === id ? { ...item, completed: !item.completed } : item)));
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSave = async () => {
        if (!taskId) {
            // If there's no taskId, we're in creation mode.
            // Pass the items back to the parent form.
            if (onChecklistSaved) {
                onChecklistSaved(items);
            }
            onClose();
            return;
        }

        setIsLoading(true);
        setError(null);

        const itemsToCreate = items.filter(item => item.isNew);
        const itemsToUpdate = items.filter(item => {
            const original = originalItems.find(o => o.id === item.id);
            return original && (
                original.checklist_description !== item.checklist_description ||
                original.order_number !== item.order_number ||
                original.completed !== item.completed
            );
        });
        const itemsToDelete = originalItems.filter(original => !items.some(current => current.id === original.id));

        try {
            if (itemsToCreate.length > 0) {
                const recordsToCreate = itemsToCreate.map(({ id, isNew, ...fields }) => ({
                    fields: { ...fields, task_id: [taskId], checlist_id: `CL-${Math.random().toString(36).substr(2, 5)}` },
                }));
                await apiFetch('/records', {
                    method: 'POST',
                    body: JSON.stringify({ recordsToCreate, tableName: 'task_checklists' }),
                });
            }

            if (itemsToUpdate.length > 0) {
                const recordsToUpdate = itemsToUpdate.map(({ id, ...fields }) => ({ id, fields }));
                await apiFetch('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({ recordsToUpdate, tableName: 'task_checklists' }),
                });
            }

            if (itemsToDelete.length > 0) {
                const recordIds = itemsToDelete.map(item => item.id);
                await apiFetch('/records/task_checklists', {
                    method: 'DELETE',
                    body: JSON.stringify({ recordIds }),
                });
            }

            if (onChecklistSaved) onChecklistSaved();
            onClose();

        } catch (err) {
            setError('Failed to save checklist. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Checklist</h2>
                    <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 rounded-full p-1.5">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {error && <div className="m-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <p className="text-center text-gray-500">Loading checklist...</p>
                    ) : (
                        <>
                            <DragDropContext onDragEnd={handleOnDragEnd}>
                                <Droppable droppableId="checklists">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                            {items.map((item, index) => (
                                                <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`flex items-center gap-3 p-3 rounded-lg transition-shadow ${snapshot.isDragging ? 'shadow-lg bg-blue-50' : 'bg-gray-50'}`}
                                                        >
                                                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                                            <input type="checkbox" checked={item.completed || false} onChange={() => handleToggleComplete(item.id)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                            <input
                                                                type="text"
                                                                value={item.checklist_description}
                                                                onChange={(e) => handleItemChange(item.id, e.target.value)}
                                                                className={`flex-grow bg-transparent outline-none text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                                                            />
                                                            <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
                                    placeholder="Add a new item..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                                />
                                <button onClick={handleAddItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm">Add</button>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-3 hover:bg-gray-300 font-medium text-sm">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Checklist'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AttachChecklistsForm; 