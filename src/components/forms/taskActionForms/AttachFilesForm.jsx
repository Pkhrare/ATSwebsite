import React, { useState } from 'react';

const API_URL = 'https://ats-backend-805977745256.us-central1.run.app';

const AttachFilesForm = ({ taskId, onClose, onAttachmentsAdded }) => {
    const [descriptions, setDescriptions] = useState(['']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleDescriptionChange = (index, value) => {
        const newDescriptions = [...descriptions];
        newDescriptions[index] = value;
        setDescriptions(newDescriptions);
    };

    const addDescriptionRow = () => {
        setDescriptions([...descriptions, '']);
    };

    const removeDescriptionRow = (index) => {
        if (descriptions.length > 1) {
            const newDescriptions = descriptions.filter((_, i) => i !== index);
            setDescriptions(newDescriptions);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const validDescriptions = descriptions.map(d => d.trim()).filter(d => d);

        if (validDescriptions.length === 0) {
            setError('Please provide at least one description.');
            setIsLoading(false);
            return;
        }

        try {
            // This is where we'll implement a batch creation logic later if needed.
            // For now, we create them one by one.
            const recordsToCreate = validDescriptions.map(desc => ({
                fields: {
                    task_id: [taskId],
                    attachment_description: desc,
                },
            }));

            const requestBody = {
                recordsToCreate,
                tableName: 'task_attachments',
            };

            const response = await fetch(`${API_URL}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('Failed to add attachments.');
            }

            const newAttachments = await response.json();
            
            if (onAttachmentsAdded) {
                // The response from a batch create is { records: [...] }
                onAttachmentsAdded(newAttachments.records);
            }
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Add File Attachments</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Describe the files you need the client to upload.
                        </label>
                        {descriptions.map((desc, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={desc}
                                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                    placeholder={`File description ${index + 1}`}
                                    className="w-full px-3 py-2 border rounded-md text-black text-sm"
                                />
                                {descriptions.length > 1 && (
                                    <button type="button" onClick={() => removeDescriptionRow(index)} className="p-2 text-red-500 hover:text-red-700">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={addDescriptionRow} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Add another file
                        </button>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium" disabled={isLoading}>
                            {isLoading ? 'Adding...' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AttachFilesForm;
