import React, { createContext, useState, useContext, useCallback, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const AIAssistantContext = createContext();

// Helper function to generate userChatIdentifier from user email
const generateUserChatIdentifier = (userEmail) => {
    if (!userEmail) return null;
    // Use email as identifier (sanitized if needed)
    return userEmail.toLowerCase().trim();
};

export const useAIAssistant = () => {
    const context = useContext(AIAssistantContext);
    if (!context) {
        throw new Error('useAIAssistant must be used within an AIAssistantProvider');
    }
    return context;
};

// Inner component that uses useLocation (must be inside Router)
const AIAssistantProviderInner = ({ children }) => {
    const location = useLocation();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(true); // Start open but collapsed
    const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
    const [size, setSize] = useState({ width: 400, height: 600 });
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState(null);
    const [screenContext, setScreenContext] = useState({});
    const [conversationHistory, setConversationHistory] = useState([]);
    const [pendingDataRequest, setPendingDataRequest] = useState(null);
    const [userChatIdentifier, setUserChatIdentifier] = useState(null);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    
    // Store context data from different screens
    const contextDataRef = useRef({
        projects: [],
        tasks: [],
        currentProject: null,
        currentTask: null,
        currentScreen: null,
        formData: null,
        projectData: null,
        otherData: {}
    });

    // Register context data from screens
    const registerContext = useCallback((data) => {
        contextDataRef.current = {
            ...contextDataRef.current,
            ...data,
            currentScreen: location.pathname,
            lastUpdated: Date.now()
        };
        setScreenContext(contextDataRef.current);
    }, [location.pathname]);

    // Get full context for AI
    const getFullContext = useCallback(() => {
        // Include all messages in conversation history, not just the last 10
        // The backend will use the last 10 if needed
        return {
            ...contextDataRef.current,
            currentScreen: location.pathname,
            conversationHistory: conversationHistory, // Send all conversation history
            messages: messages, // Also include current messages array
            timestamp: new Date().toISOString()
        };
    }, [location.pathname, conversationHistory, messages]);

    // Add message to conversation
    const addMessage = useCallback((message) => {
        setMessages(prev => {
            // Ensure messages are sorted by timestamp
            const updated = [...prev, message];
            return updated.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0);
                const timeB = new Date(b.timestamp || 0);
                return timeA - timeB;
            });
        });
        setConversationHistory(prev => [...prev.slice(-19), message]); // Keep last 20 messages
    }, []);

    // Load chat history for the user
    const loadChatHistory = useCallback(async (identifier) => {
        if (!identifier || isHistoryLoaded) return;

        try {
            const ApiCaller = (await import('../components/apiCall/ApiCaller')).default;
            const response = await ApiCaller(`/ai/chat-history/${identifier}`);
            
            if (response && response.messages && Array.isArray(response.messages)) {
                // Messages are already sorted by timestamp (oldest first) from backend
                setMessages(response.messages);
                setConversationHistory(response.messages.slice(-20)); // Keep last 20 for context
                setIsHistoryLoaded(true);
                console.log(`Loaded ${response.messages.length} messages from chat history`);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            // Don't block if history fails to load
            setIsHistoryLoaded(true);
        }
    }, [isHistoryLoaded]);

    // Generate and set userChatIdentifier when user changes
    useEffect(() => {
        if (currentUser && currentUser.email) {
            const identifier = generateUserChatIdentifier(currentUser.email);
            setUserChatIdentifier(identifier);
            setIsHistoryLoaded(false); // Reset so history loads for new user
            // Clear messages when user changes - new history will load
            setMessages([]);
            setConversationHistory([]);
        } else {
            // For client users, check if they have a project ID to use as identifier
            // This is a fallback for clients who might not have email
            const clientProjectId = sessionStorage.getItem('currentProjectId');
            if (clientProjectId) {
                // Use project ID as identifier for client users
                const identifier = `client_${clientProjectId}`;
                setUserChatIdentifier(identifier);
                setIsHistoryLoaded(false);
                setMessages([]);
                setConversationHistory([]);
            } else {
                setUserChatIdentifier(null);
                setMessages([]);
                setConversationHistory([]);
                setIsHistoryLoaded(false);
            }
        }
    }, [currentUser]);

    // Load chat history when identifier is available
    useEffect(() => {
        if (userChatIdentifier && !isHistoryLoaded) {
            loadChatHistory(userChatIdentifier);
        }
    }, [userChatIdentifier, isHistoryLoaded, loadChatHistory]);

    // Clear conversation
    const clearConversation = useCallback(() => {
        setMessages([]);
        setConversationHistory([]);
    }, []);

    // Toggle open/closed
    const toggleOpen = useCallback(() => {
        setIsOpen(prev => !prev);
        if (isCollapsed) {
            setIsCollapsed(false);
        }
    }, [isCollapsed]);

    // Toggle collapsed
    const toggleCollapsed = useCallback(() => {
        setIsCollapsed(prev => {
            if (prev) {
                // Expanding - also ensure it's open
                setIsOpen(true);
            }
            return !prev;
        });
    }, []);

    // Update position
    const updatePosition = useCallback((newPosition) => {
        setPosition(newPosition);
    }, []);

    // Update size
    const updateSize = useCallback((newSize) => {
        setSize(newSize);
    }, []);

    // Set current project
    const setProject = useCallback((projectId) => {
        setCurrentProjectId(projectId);
        registerContext({ currentProject: projectId });
    }, [registerContext]);

    // Check if assistant should be visible (exclude login, forms, success pages)
    const shouldShow = useCallback(() => {
        const excludedPaths = [
            '/',
            '/consultant-login',
            '/client-login',
            '/combined-license-form',
            '/enrollment-form',
            '/policy-procedure-form',
            '/quick-intro-form',
            '/submission-success',
            '/project-deactivated'
        ];
        return !excludedPaths.includes(location.pathname);
    }, [location.pathname]);

    const value = {
        isOpen,
        isCollapsed,
        position,
        size,
        messages,
        isLoading,
        currentProjectId,
        screenContext,
        pendingDataRequest,
        userChatIdentifier,
        toggleOpen,
        toggleCollapsed,
        updatePosition,
        updateSize,
        addMessage,
        clearConversation,
        registerContext,
        getFullContext,
        setProject,
        setIsLoading,
        setPendingDataRequest,
        shouldShow,
        loadChatHistory
    };

    return (
        <AIAssistantContext.Provider value={value}>
            {children}
        </AIAssistantContext.Provider>
    );
};

// Outer provider that doesn't use useLocation
export const AIAssistantProvider = ({ children }) => {
    return <AIAssistantProviderInner>{children}</AIAssistantProviderInner>;
};

