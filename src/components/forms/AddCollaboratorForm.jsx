import React, { useState, useEffect, useCallback } from 'react';
import ApiCaller from '../apiCall/ApiCaller';

// Helper function to fetch from the backend API
const apiFetch = async (endpoint, options = {}) => {
  const response = await ApiCaller(endpoint, options);
  if (!response.ok) {
    throw new Error(response.error || 'API request failed');
  }
  return response;
};

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


export default function AddCollaboratorForm({ projectId, onClose, onCollaboratorAdded }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [existingCollaborators, setExistingCollaborators] = useState([]);
    const [showExisting, setShowExisting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCollaborator, setSelectedCollaborator] = useState(null);

    const fetchExistingCollaborators = useCallback(async () => {
        setIsLoading(true);
        try {
            const collaborators = await apiFetch('/collaborators');
            setExistingCollaborators(collaborators);
            setShowExisting(true);
        } catch (error) {
            console.error("Failed to fetch collaborators:", error);
            alert("Failed to fetch existing collaborators.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSelectCollaborator = (collaborator) => {
        setSelectedCollaborator(collaborator);
        setName(collaborator.fields.collaborator_name);
        setEmail(collaborator.fields.collaborator_email);
        setShowExisting(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email) {
            alert('Name and email are required.');
            return;
        }

        setIsLoading(true);
        try {
            let collaboratorName = name;
            if (selectedCollaborator) {
                // Link existing collaborator
                const existingProjects = selectedCollaborator.fields.Projects || [];
                if (existingProjects.includes(projectId)) {
                    alert('This collaborator is already part of the project.');
                    setIsLoading(false);
                    return;
                }
                const updatedProjects = [...existingProjects, projectId];
                await apiFetch('/records', {
                    method: 'PATCH',
                    body: JSON.stringify({
                        tableName: 'collaborators',
                        recordsToUpdate: [{
                            id: selectedCollaborator.id,
                            fields: { 'Projects': updatedProjects }
                        }]
                    })
                });
                collaboratorName = selectedCollaborator.fields.collaborator_name;

            } else {
                // Create new collaborator
                const response = await apiFetch('/records', {
                    method: 'POST',
                    body: JSON.stringify({
                        tableName: 'collaborators',
                        recordsToCreate: [{
                            fields: {
                                'collaborator_name': name,
                                'collaborator_email': email,
                                'Projects': [projectId]
                            }
                        }]
                    })
                });
                collaboratorName = response.records[0].fields.collaborator_name;
            }

            onCollaboratorAdded({ name: collaboratorName });
            onClose();

        } catch (error) {
            console.error('Failed to add collaborator:', error);
            alert('An error occurred while adding the collaborator.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-800">
                    <CloseIcon />
                </button>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Add Collaborator</h2>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-black"
                            required
                        />
                    </div>

                    <div className="my-4">
                        <button
                            type="button"
                            onClick={fetchExistingCollaborators}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 text-black"
                        >
                            {isLoading && !showExisting ? 'Loading...' : 'Add from existing collaborators'}
                        </button>
                        {showExisting && (
                            <div className="mt-2 border border-slate-300 rounded-md max-h-40 overflow-y-auto">
                                {existingCollaborators.length > 0 ? (
                                    <ul>
                                        {existingCollaborators.map(c => (
                                            <li
                                                key={c.id}
                                                onClick={() => handleSelectCollaborator(c)}
                                                className="p-2 hover:bg-slate-100 cursor-pointer text-black"
                                            >
                                                {c.fields.collaborator_name} ({c.fields.collaborator_email})
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="p-2 text-slate-500">No existing collaborators found.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-emerald-400"
                        >
                            {isLoading ? 'Inviting...' : 'Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 