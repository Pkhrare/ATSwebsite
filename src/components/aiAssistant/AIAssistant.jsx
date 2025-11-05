import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAIAssistant } from '../../utils/AIAssistantContext';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import AIMessage from './AIMessage';
import AITypingIndicator from './AITypingIndicator';
import AIDataRequestModal from './AIDataRequestModal';
import './AIAssistant.css';
import { 
    ChatBubbleLeftRightIcon, 
    XMarkIcon, 
    MinusIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

// Helper function to sanitize context to remove circular references and non-serializable objects
const sanitizeContext = (obj, seen = new WeakSet()) => {
    if (obj === null || obj === undefined) {
        return null;
    }
    
    // Handle primitives
    if (typeof obj !== 'object') {
        return obj;
    }
    
    // Handle circular references
    if (seen.has(obj)) {
        return '[Circular Reference]';
    }
    
    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
        seen.add(obj);
        return obj.map(item => sanitizeContext(item, seen));
    }
    
    // Handle objects
    seen.add(obj);
    const sanitized = {};
    
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        
        const value = obj[key];
        
        // Skip functions, DOM elements, React refs, and other non-serializable objects
        if (typeof value === 'function') {
            continue; // Skip functions
        }
        
        if (value && typeof value === 'object') {
            // Check if it's a DOM element or React component
            if (value.nodeType || value.$$typeof) {
                continue; // Skip DOM elements and React elements
            }
            
            // Check if it's a React ref
            if (value.current !== undefined && typeof value.current === 'object') {
                continue; // Skip refs
            }
            
            // Recursively sanitize nested objects
            sanitized[key] = sanitizeContext(value, seen);
        } else {
            // Primitive values are safe
            sanitized[key] = value;
        }
    }
    
    return sanitized;
};

const AIAssistant = () => {
    const {
        isOpen,
        isCollapsed,
        position,
        size,
        messages,
        isLoading,
        currentProjectId,
        pendingDataRequest,
        userChatIdentifier,
        toggleOpen,
        toggleCollapsed,
        updatePosition,
        updateSize,
        addMessage,
        clearConversation,
        getFullContext,
        setIsLoading,
        setPendingDataRequest,
        shouldShow
    } = useAIAssistant();

    const { userRole, currentUser } = useAuth();
    const [input, setInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [executeActions, setExecuteActions] = useState(true);
    
    const containerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const resizeHandleRef = useRef(null);

    // Don't show on excluded pages
    if (!shouldShow()) {
        return null;
    }

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current && isOpen && !isCollapsed) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isCollapsed]);

    // Handle drag start
    const handleDragStart = useCallback((e) => {
        if (isCollapsed || isResizing) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    }, [position, isCollapsed, isResizing]);

    // Handle drag
    useEffect(() => {
        const handleDrag = (e) => {
            if (!isDragging) return;
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            
            // Keep within viewport
            const maxX = window.innerWidth - (isCollapsed ? 60 : size.width);
            const maxY = window.innerHeight - (isCollapsed ? 60 : 50);
            
            updatePosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        };

        const handleDragEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
            return () => {
                document.removeEventListener('mousemove', handleDrag);
                document.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, dragStart, isCollapsed, size.width, updatePosition]);

    // Handle resize start
    const handleResizeStart = useCallback((e) => {
        if (isCollapsed) return;
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        });
    }, [size, isCollapsed]);

    // Handle resize
    useEffect(() => {
        const handleResize = (e) => {
            if (!isResizing) return;
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;
            
            const minWidth = 300;
            const minHeight = 400;
            const maxWidth = window.innerWidth - position.x;
            const maxHeight = window.innerHeight - position.y;
            
            updateSize({
                width: Math.max(minWidth, Math.min(resizeStart.width + deltaX, maxWidth)),
                height: Math.max(minHeight, Math.min(resizeStart.height + deltaY, maxHeight))
            });
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
            return () => {
                document.removeEventListener('mousemove', handleResize);
                document.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, resizeStart, position, updateSize]);

    // Handle message send
    const handleSend = async (prefilledMessage = null) => {
        const messageToSend = prefilledMessage || input.trim();
        if (!messageToSend || isLoading) return;

        const userMessage = messageToSend;
        if (!prefilledMessage) {
            setInput('');
        }
        
        // Add user message
        const userMsg = {
            id: Date.now(),
            type: 'user',
            content: userMessage,
            timestamp: new Date().toISOString()
        };
        addMessage(userMsg);
        setIsLoading(true);

        try {
            // Get full context (includes conversation history)
            const context = getFullContext();
            
            // Log conversation history and task context for debugging
            if (import.meta.env.DEV) {
                console.log('📝 Conversation history being sent:', context.conversationHistory?.length || 0, 'messages');
                console.log('📋 Current task context:', context.currentTask ? 'Task ID: ' + context.currentTask : 'No task open');
                if (context.taskData) {
                    console.log('📋 Task data:', context.taskData.fields?.task_title || 'N/A');
                }
            }
            
            // Get project ID from context or use current
            // Try multiple sources: currentProjectId, context.currentProject, or projectData.id
            const projectId = currentProjectId || 
                             context.currentProject || 
                             context.projectData?.id ||
                             context.projectData?.fields?.['Project ID'];

            if (!projectId) {
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: 'I need to know which project you\'re working on. Please open a project first.',
                    timestamp: new Date().toISOString()
                });
                setIsLoading(false);
                return;
            }

            // Get sender name
            const sender = userRole === 'consultant' ? 'Consultant' : (context.currentProject?.name || 'Client');

            // Log userChatIdentifier for debugging
            if (import.meta.env.DEV) {
                console.log('📤 Sending AI request with userChatIdentifier:', userChatIdentifier);
            }

            // Use correct endpoint based on user role
            // IMPORTANT: Clients use client AI (read-only), Consultants use consultant AI (full capabilities)
            // Default to client AI if userRole is not explicitly 'consultant' (safety measure)
            const isConsultant = userRole === 'consultant';
            let endpoint = isConsultant
                ? `/ai/consultant/project/${projectId}/assist`
                : `/ai/client/project/${projectId}/assist`;
            
            // Debug logging to verify correct endpoint is being used
            if (import.meta.env.DEV) {
                console.log(`🔀 AI Endpoint Routing: userRole="${userRole}", isConsultant=${isConsultant}, endpoint="${endpoint}"`);
            }
            
            // Safety check: Ensure clients never use consultant endpoint
            if (!isConsultant && endpoint.includes('/consultant/')) {
                console.error('⚠️ SECURITY: Client attempted to use consultant endpoint - redirecting to client endpoint');
                endpoint = `/ai/client/project/${projectId}/assist`;
            }
            
            // Sanitize context to remove circular references and non-serializable objects
            const sanitizedContext = sanitizeContext(context);
            
            // Call appropriate AI endpoint
            const response = await ApiCaller(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    message: userMessage,
                    sender: sender,
                    executeActions: userRole === 'consultant' ? executeActions : false, // Only consultants can execute actions
                    context: sanitizedContext,
                    userChatIdentifier: userChatIdentifier // Include user chat identifier
                })
            });

            // Handle response
            if (response.type === 'data_request') {
                // Show data request modal
                const { parseFieldRequest } = await import('../../utils/aiFieldRequestHelper');
                const fieldRequest = parseFieldRequest(response);
                
                if (fieldRequest && fieldRequest.fields && fieldRequest.fields.length > 0) {
                    // Store the original message for the callback
                    const originalMessage = userMessage;
                    
                    // Set callback to resend the request with collected data
                    fieldRequest.callback = async (collectedData) => {
                        setIsLoading(true);
                        // Resend the original message with collected data
                        const enrichedMessage = `${originalMessage}\n\nCollected Data: ${JSON.stringify(collectedData)}`;
                        
                        // Add user message showing collected data (simplified)
                        addMessage({
                            id: Date.now(),
                            type: 'user',
                            content: 'Provided requested information',
                            timestamp: new Date().toISOString()
                        });
                        
                        // Process the enriched message
                        try {
                            const enrichedContext = getFullContext();
                            const enrichedProjectId = currentProjectId || 
                                                     enrichedContext.currentProject || 
                                                     enrichedContext.projectData?.id ||
                                                     enrichedContext.projectData?.fields?.['Project ID'];
                            
                            if (!enrichedProjectId) {
                                throw new Error('Project ID is still missing');
                            }
                            
                            // Use correct endpoint based on user role
                            const endpoint = userRole === 'consultant' 
                                ? `/ai/consultant/project/${enrichedProjectId}/assist`
                                : `/ai/client/project/${enrichedProjectId}/assist`;
                            
                            // Sanitize context to remove circular references and non-serializable objects
                            const sanitizedEnrichedContext = sanitizeContext({ ...enrichedContext, collectedFormData: collectedData });
                            
                            const enrichedResponse = await ApiCaller(endpoint, {
                                method: 'POST',
                                body: JSON.stringify({
                                    message: enrichedMessage,
                                    sender: userRole === 'consultant' ? 'Consultant' : 'Client',
                                    executeActions: userRole === 'consultant' ? executeActions : false, // Only consultants can execute actions
                                    context: sanitizedEnrichedContext,
                                    userChatIdentifier: userChatIdentifier // Include user chat identifier
                                })
                            });
                            
                            // Handle the enriched response (same as above)
                            if (enrichedResponse.type === 'action_completed') {
                                // Extract message content from Airtable record or use fallback
                                let messageContent = 'Action completed successfully!';
                                if (enrichedResponse.message) {
                                    if (typeof enrichedResponse.message === 'string') {
                                        messageContent = enrichedResponse.message;
                                    } else if (enrichedResponse.message.fields?.message) {
                                        messageContent = enrichedResponse.message.fields.message;
                                    } else if (enrichedResponse.message.fields?.message_text) {
                                        messageContent = enrichedResponse.message.fields.message_text;
                                    }
                                }
                                
                                addMessage({
                                    id: Date.now() + 1,
                                    type: 'assistant',
                                    content: messageContent,
                                    action: enrichedResponse.action,
                                    result: enrichedResponse.result,
                                    timestamp: new Date().toISOString()
                                });
                            } else if (enrichedResponse.type === 'response' || enrichedResponse.type === 'question') {
                                // Extract message content from Airtable record or use fallback
                                let content = 'I received your message.';
                                if (enrichedResponse.message) {
                                    if (typeof enrichedResponse.message === 'string') {
                                        content = enrichedResponse.message;
                                    } else if (enrichedResponse.message.fields?.message) {
                                        content = enrichedResponse.message.fields.message;
                                    } else if (enrichedResponse.message.fields?.message_text) {
                                        content = enrichedResponse.message.fields.message_text;
                                    } else {
                                        // Fallback: stringify if it's an object but no message field
                                        content = JSON.stringify(enrichedResponse.message);
                                    }
                                }
                                
                                addMessage({
                                    id: Date.now() + 1,
                                    type: 'assistant',
                                    content: content,
                                    timestamp: new Date().toISOString()
                                });
                            } else if (enrichedResponse.type === 'data_request') {
                                // Another data request - show modal again
                                const nestedRequest = parseFieldRequest(enrichedResponse);
                                if (nestedRequest) {
                                    nestedRequest.callback = fieldRequest.callback; // Reuse same callback
                                    setPendingDataRequest(nestedRequest);
                                }
                            }
                        } catch (error) {
                            console.error('Error processing enriched message:', error);
                            addMessage({
                                id: Date.now() + 1,
                                type: 'assistant',
                                content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
                                isError: true,
                                timestamp: new Date().toISOString()
                            });
                        } finally {
                            setIsLoading(false);
                        }
                    };
                    
                    setPendingDataRequest(fieldRequest);
                    
                    // Show message explaining what we need
                    addMessage({
                        id: Date.now() + 1,
                        type: 'assistant',
                        content: response.message || 'I need some additional information to complete your request.',
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // Invalid data request format
                    addMessage({
                        id: Date.now() + 1,
                        type: 'assistant',
                        content: response.message || 'I need some additional information. Please provide the requested details.',
                        timestamp: new Date().toISOString()
                    });
                }
            } else if (response.type === 'action_completed') {
                // Extract message content from Airtable record or use fallback
                let messageContent = 'Action completed successfully!';
                if (response.message) {
                    if (typeof response.message === 'string') {
                        messageContent = response.message;
                    } else if (response.message.fields?.message) {
                        messageContent = response.message.fields.message;
                    } else if (response.message.fields?.message_text) {
                        messageContent = response.message.fields.message_text;
                    }
                }
                
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: messageContent,
                    action: response.action,
                    result: response.result,
                    timestamp: new Date().toISOString()
                });
            } else if (response.type === 'response' || response.type === 'question') {
                // Extract message content from Airtable record or use fallback
                let content = 'I received your message.';
                if (response.message) {
                    if (typeof response.message === 'string') {
                        content = response.message;
                    } else if (response.message.fields?.message) {
                        content = response.message.fields.message;
                    } else if (response.message.fields?.message_text) {
                        content = response.message.fields.message_text;
                    } else {
                        // Fallback: stringify if it's an object but no message field
                        content = JSON.stringify(response.message);
                    }
                }
                
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: content,
                    action: response.action || null,
                    actionData: response.actionData || null,
                    timestamp: new Date().toISOString()
                });
            } else if (response.type === 'validation_error' || response.type === 'error') {
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: `Error: ${response.message || response.error}. ${response.errors ? response.errors.join(', ') : ''}`,
                    isError: true,
                    timestamp: new Date().toISOString()
                });
            } else {
                // Unknown response type - log it and show to user
                console.warn('Unknown response type:', response);
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: typeof response === 'string' ? response : (response.message || 'I\'m having trouble processing that request. Please try again.'),
                    isError: true,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('AI Assistant error:', error);
            
            // Check if error response contains error object
            let errorMsg = error.message || 'An unexpected error occurred.';
            
            // If error has a response body, try to extract the error message
            if (error.response || error.error) {
                const errorResponse = error.response || error;
                if (typeof errorResponse === 'object' && errorResponse.error) {
                    errorMsg = errorResponse.error;
                } else if (typeof errorResponse === 'string') {
                    errorMsg = errorResponse;
                }
            }
            
            // Check if error message contains data request info
            if (errorMsg.includes('need') && (errorMsg.includes('information') || errorMsg.includes('details') || errorMsg.includes('data'))) {
                // This might be a data request that wasn't properly formatted
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: 'I need more information to complete your request. Could you please rephrase your request with all the necessary details?',
                    timestamp: new Date().toISOString()
                });
            } else {
                addMessage({
                    id: Date.now() + 1,
                    type: 'assistant',
                    content: `Sorry, I encountered an error: ${errorMsg}. Please try again.`,
                    isError: true,
                    timestamp: new Date().toISOString()
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Collapsed icon view
    if (isCollapsed || !isOpen) {
        return (
            <div
                data-ai-assistant="true"
                className="fixed bottom-6 right-6 z-[9999] cursor-pointer ai-assistant-icon"
                onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed();
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="bg-black hover:bg-gray-800 text-yellow-400 rounded-full p-4 shadow-2xl transition-all duration-200 hover:scale-110 border-2 border-yellow-400">
                    <ChatBubbleLeftRightIcon className="w-6 h-6" />
                </div>
            </div>
        );
    }

    // Expanded view
    return (
        <div
            data-ai-assistant="true"
            ref={containerRef}
            className={`fixed z-[10000] bg-white border-2 border-black shadow-2xl rounded-lg flex flex-col ai-assistant-container ai-assistant-expanded ${
                isDragging ? 'ai-assistant-dragging' : ''
            }`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header - Draggable */}
            <div
                className="bg-black text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="font-semibold text-sm">Waiverlyn AI Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setExecuteActions(!executeActions);
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            executeActions
                                ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                        title={executeActions ? 'Auto-execute actions enabled' : 'Auto-execute actions disabled'}
                    >
                        {executeActions ? 'Auto' : 'Manual'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapsed();
                        }}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                        title="Minimize"
                    >
                        <MinusIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleOpen();
                        }}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                        title="Close"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="text-sm font-medium mb-2">Welcome to Waiverlyn AI Assistant</p>
                        <p className="text-xs text-gray-400 max-w-xs">
                            I can help you create tasks, forms, checklists, transfer data, and answer questions about your projects.
                        </p>
                        {currentProjectId && (
                            <p className="text-xs text-yellow-600 mt-2 font-medium">
                                Working with project: {currentProjectId}
                            </p>
                        )}
                    </div>
                ) : (
                    messages.map((message) => (
                        <AIMessage key={message.id} message={message} />
                    ))
                )}
                {isLoading && <AITypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-3">
                <div className="flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your project..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none text-sm text-gray-900 bg-white placeholder:text-gray-400"
                        rows="2"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-black hover:bg-gray-800 text-yellow-400 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
                    >
                        Send
                    </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <button
                        onClick={clearConversation}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Resize Handle */}
            <div
                ref={resizeHandleRef}
                className={`absolute bottom-0 right-0 w-6 h-6 cursor-se-resize ai-resize-handle ${
                    isResizing ? 'ai-assistant-resizing' : ''
                }`}
                onMouseDown={handleResizeStart}
            />
            
            {/* Data Request Modal */}
            {pendingDataRequest && (
                <AIDataRequestModal
                    isOpen={!!pendingDataRequest}
                    onClose={() => setPendingDataRequest(null)}
                    onSubmit={async (data) => {
                        // Handle the submitted data
                        if (pendingDataRequest.callback) {
                            await pendingDataRequest.callback(data);
                        }
                        setPendingDataRequest(null);
                    }}
                    fields={pendingDataRequest.fields || []}
                    projectData={getFullContext().projectData}
                />
            )}
        </div>
    );
};

export default AIAssistant;

