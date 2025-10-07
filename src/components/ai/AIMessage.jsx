import React from 'react';
import { getMessageStyling, formatAIMetadata, renderMarkdownToHtml } from '../../utils/aiUtils';

const AIMessage = ({ message, className = '' }) => {
    const styling = getMessageStyling(message, 'client', '');
    const metadata = message.metadata || {};

    return (
        <div className={`flex ${styling.alignment} ${className}`}>
            <div className="relative max-w-md">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-purple-800">Waiverlyn</span>
                            <div className="text-xs text-purple-600">AI Assistant</div>
                        </div>
                    </div>
                    
                    {message.fields?.message_text && (
                        <div
                            className="text-sm text-slate-800 leading-relaxed mb-3 prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(message.fields.message_text) }}
                        />
                    )}
                    
                    {/* AI-specific metadata */}
                    {message.fields?.is_ai && metadata.contextUsed && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-purple-700">
                                    {formatAIMetadata(metadata)}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {/* Attachment handling for AI messages */}
                    {(message.fields?.attachmentUrl || message.fields?.attachment_url) && (
                        <div className="mb-3">
                            {message.fields.attachmentType?.startsWith('image/') ? (
                                <div className="rounded-lg overflow-hidden border border-purple-200">
                                    <img 
                                        src={message.fields.attachmentUrl || message.fields.attachment_url} 
                                        alt={message.fields.attachmentName || message.fields.attachment_name || "Attachment"} 
                                        className="max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                </div>
                            ) : (
                                <a 
                                    href={message.fields.attachmentUrl || message.fields.attachment_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">
                                        {message.fields.attachmentName || message.fields.attachment_name || "Download"}
                                    </span>
                                </a>
                            )}
                        </div>
                    )}
                    
                    <div className="text-xs text-purple-600 text-right">
                        {new Date(message.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
                <div className="absolute -bottom-1 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-200"></div>
            </div>
        </div>
    );
};

export default AIMessage;
