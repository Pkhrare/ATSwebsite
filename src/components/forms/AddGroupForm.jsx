import React, { useState } from 'react';
import { colorClasses } from '../../utils/colorUtils';
import ApiCaller from '../apiCall/ApiCaller';

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function AddGroupForm({ projectData, taskData, onClose, onGroupAdded }) {
    const [groupName, setGroupName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!groupName.trim()) {
            setError('Group name is required');
            return;
        }

        setIsCreating(true);
        setError('');

        try {
            // --- ID Generation Logic ---
            // 1. Get the project's unique ID.
            const projectId = projectData.fields['Project ID'];
            // 2. Create a short, uppercase code from the group name (e.g., "Phase One" -> "PO").
            const groupCode = groupName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
            // 3. Combine them for a unique and readable ID.
            const generatedGroupId = `${projectId}-${groupCode}-${taskData.groups.length}`;

            const newGroupOrder = taskData.groups.length;

            const response = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [{
                        fields: {
                            group_name: groupName.trim(),
                            groupID: generatedGroupId, // The user-provided ID
                            group_order: newGroupOrder,
                            projectID: [projectData.id], // Corrected field name
                            Tasks: [] // Initialize the linked Tasks field as empty
                        }
                    }],
                    tableName: 'task_groups'
                })
            });

            if (onGroupAdded) {
                onGroupAdded(response.records[0]);
            }
            
            onClose();

        } catch (error) {
            console.error("Failed to create new group:", error);
            setError(error.message || "An error occurred while creating the group.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
            <div className={`${colorClasses.card.base} rounded-lg shadow-xl w-full max-w-md`} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className={`text-xl font-semibold ${colorClasses.card.header}`}>Add New Group</h2>
                    <button onClick={onClose} className={`${colorClasses.text.secondary} hover:${colorClasses.text.primary}`} aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium ${colorClasses.form.label} mb-2`}>
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className={`w-full px-3 py-2 ${colorClasses.form.input} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            placeholder="Enter group name (e.g., Phase One, Documentation, etc.)"
                            disabled={isCreating}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-600">{error}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 ${colorClasses.button.neutral} rounded-md text-sm font-medium`}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`px-4 py-2 ${colorClasses.button.secondary} rounded-md text-sm font-medium disabled:opacity-50`}
                            disabled={isCreating || !groupName.trim()}
                        >
                            {isCreating ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
