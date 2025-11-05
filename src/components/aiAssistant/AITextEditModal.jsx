import React, { useState, useEffect } from 'react';
import { useAIAssistant } from '../../utils/AIAssistantContext';
import ApiCaller from '../apiCall/ApiCaller';
import { gatherTextEditContext } from '../../utils/aiTextEditContext';
import { useAuth } from '../../utils/AuthContext';

/**
 * Modal for AI-powered in-place text editing
 * Similar to Cursor's AI edit feature
 */
export default function AITextEditModal({ 
    isOpen, 
    onClose, 
    onSave, 
    sourceTable, 
    sourceRecordId, 
    fieldName, 
    currentText,
    projectId 
}) {
    const { getFullContext, userChatIdentifier, setIsLoading } = useAIAssistant();
    const { userRole } = useAuth();
    const [editInstruction, setEditInstruction] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset instruction when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setEditInstruction('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editInstruction.trim()) return;

        setIsProcessing(true);
        setIsLoading(true);

        try {
            // Gather rich context based on editing location
            const context = await gatherTextEditContext(
                sourceTable,
                sourceRecordId,
                currentText,
                fieldName,
                { getFullContext }
            );

            // Get full AI context
            const fullContext = getFullContext();

            // Determine project ID
            const targetProjectId = projectId || 
                                   fullContext.currentProject || 
                                   fullContext.projectData?.id ||
                                   context.projectContext?.projectId;

            if (!targetProjectId) {
                throw new Error('Project ID is required for AI editing');
            }

            // Get sender name
            const sender = userRole === 'consultant' ? 'Consultant' : (fullContext.currentProject?.name || 'Client');

            // Only consultants can edit - use consultant AI endpoint
            if (userRole !== 'consultant') {
                throw new Error('Only consultants can edit text using AI');
            }
            
            // Call consultant AI endpoint with edit_text action
            const response = await ApiCaller(`/ai/consultant/project/${targetProjectId}/assist`, {
                method: 'POST',
                body: JSON.stringify({
                    message: `Edit the ${fieldName} field. Current content: "${context.currentText.substring(0, 1000)}${context.currentText.length > 1000 ? '...' : ''}". User instruction: "${editInstruction}". Return ONLY the edited text content, preserving any formatting if applicable.`,
                    sender: sender,
                    executeActions: true,
                    context: {
                        ...fullContext,
                        editingContext: context,
                        editInstruction: editInstruction,
                        currentText: context.currentText,
                        editingLocation: {
                            table: sourceTable,
                            recordId: sourceRecordId,
                            fieldName: fieldName
                        }
                    },
                    userChatIdentifier: userChatIdentifier
                })
            });

            // Handle response
            if (response.type === 'action_completed' && response.result?.editedText) {
                // Success - save the edited text from action result
                await onSave(response.result.editedText);
                onClose();
            } else if (response.type === 'response' && response.message) {
                // AI returned text in message (when edit_text action is executed)
                let editedText = response.message;
                if (typeof editedText === 'object' && editedText.fields?.message) {
                    editedText = editedText.fields.message;
                } else if (typeof editedText === 'object' && editedText.message) {
                    editedText = editedText.message;
                }
                // The message should contain the edited text
                await onSave(editedText);
                onClose();
            } else if (response.type === 'action' && response.data?.editedText) {
                // Action response with edited text in data
                await onSave(response.data.editedText);
                onClose();
            } else {
                // Try to extract text from any response
                const possibleText = response.result?.editedText || 
                                   response.data?.editedText || 
                                   response.message || 
                                   (typeof response.message === 'object' ? response.message.fields?.message : null);
                if (possibleText) {
                    await onSave(possibleText);
                    onClose();
                } else {
                    throw new Error('AI did not return edited text. Response: ' + JSON.stringify(response));
                }
            }

        } catch (error) {
            console.error('Error in AI text edit:', error);
            alert(`Error: ${error.message || 'Failed to edit text. Please try again.'}`);
        } finally {
            setIsProcessing(false);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001]" onClick={onClose}>
            <div 
                className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">AI Text Editor</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        Describe how you want to edit the text. The AI will use context from the project, current record, and related data.
                    </p>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-4">
                        <p className="text-xs text-gray-500 mb-1">Current content preview:</p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                            {typeof currentText === 'string' && currentText.length > 200 
                                ? currentText.substring(0, 200) + '...' 
                                : currentText}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Edit Instruction
                        </label>
                        <textarea
                            value={editInstruction}
                            onChange={(e) => setEditInstruction(e.target.value)}
                            placeholder="e.g., 'Make it more professional', 'Add details about the deadline', 'Fix grammar and spelling', 'Expand on the requirements'"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                            disabled={isProcessing}
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isProcessing || !editInstruction.trim()}
                        >
                            {isProcessing ? 'Editing...' : 'Apply Edit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

