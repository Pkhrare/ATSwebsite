import React, { useState } from 'react';

import ApiCaller from '../../apiCall/ApiCaller';

const AddApprovalForm = ({ taskId, onClose, onApprovalAdded, isTemplateMode = false }) => {
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!description.trim()) {
            setError('Please provide an approval description.');
            setIsLoading(false);
            return;
        }

        try {
            if (isTemplateMode) {
                // For template mode, create a local approval object without API call
                const approvalData = {
                    id: `temp-${Date.now()}`, // Temporary ID for template
                    fields: {
                        approval_description: description.trim(),
                    }
                };

                if (onApprovalAdded) {
                    onApprovalAdded(approvalData);
                }
                onClose();
            } else {
                // For regular mode, create the approval record in database
                const approvalRecord = await ApiCaller('/records', {
                    method: 'POST',
                    body: JSON.stringify({
                        recordsToCreate: [{
                            fields: {
                                task_id: [taskId],
                                approval_description: description.trim(),
                            }
                        }],
                        tableName: 'task_approval',
                    }),
                });

                if (onApprovalAdded) {
                    onApprovalAdded(approvalRecord.records[0]);
                }
                onClose();
            }

        } catch (err) {
            setError(err.message || 'Failed to create approval');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Add Approval</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                    
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                            Describe what needs to be approved.
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what is being approved..."
                            className="w-full px-3 py-2 border rounded-md text-black text-sm h-20 resize-none"
                            required
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 font-medium" 
                            disabled={isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Add Approval'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddApprovalForm;
