import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AIMessage = ({ message }) => {
    const isUser = message.type === 'user';
    const isError = message.isError;
    
    // Format markdown-like content (basic formatting)
    const formatContent = (content) => {
        if (!content) return '';
        
        // Ensure content is a string
        let contentStr = '';
        if (typeof content === 'string') {
            contentStr = content;
        } else if (typeof content === 'object') {
            // Try to extract message from object
            if (content.fields?.message) {
                contentStr = content.fields.message;
            } else if (content.fields?.message_text) {
                contentStr = content.fields.message_text;
            } else if (content.message) {
                contentStr = content.message;
            } else {
                // Fallback: stringify the object
                try {
                    contentStr = JSON.stringify(content);
                } catch (e) {
                    contentStr = String(content);
                }
            }
        } else {
            contentStr = String(content);
        }
        
        // Convert markdown bold to HTML
        let formatted = contentStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Convert markdown links
        formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-yellow-600 hover:underline">$1</a>');
        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br />');
        
        return formatted;
    };

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} ai-message`}>
            <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isUser
                        ? 'bg-black text-white'
                        : isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                }`}
            >
                {!isUser && (
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-xs font-semibold text-gray-600">Waiverlyn</span>
                        {isError && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                        )}
                        {message.action && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Action: {message.action}
                            </span>
                        )}
                    </div>
                )}
                
                <div
                    className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                />
                
                {message.result && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span className="font-medium">Action Completed</span>
                        </div>
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {JSON.stringify(message.result, null, 2)}
                        </div>
                    </div>
                )}
                
                {message.actionData && !message.result && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-yellow-600 font-medium mb-1">
                            Suggested Action: {message.action}
                        </div>
                        <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                            Would you like me to execute this action?
                        </div>
                    </div>
                )}
                
                <div className={`text-xs mt-1 ${isUser ? 'text-gray-300' : 'text-gray-400'}`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default AIMessage;

