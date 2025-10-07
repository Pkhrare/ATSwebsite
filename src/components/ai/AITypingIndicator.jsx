import React from 'react';

const AITypingIndicator = ({ isTyping, className = '' }) => {
    if (!isTyping) return null;

    return (
        <div className={`flex justify-start ${className}`}>
            <div className="relative p-4 rounded-2xl max-w-xs bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold text-purple-800">Waiverlyn</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-purple-600 font-medium">analyzing...</span>
                    </div>
                </div>
                <div className="absolute -bottom-1 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-200"></div>
            </div>
        </div>
    );
};

export default AITypingIndicator;
