import { useEffect } from 'react';
import { useAIAssistant } from '../utils/AIAssistantContext';
import { useLocation } from 'react-router-dom';

/**
 * Hook to automatically collect and register screen context
 * Usage: Call this hook in any component to register its data
 */
export const useScreenContext = (contextData) => {
    const { registerContext } = useAIAssistant();
    const location = useLocation();

    useEffect(() => {
        if (contextData) {
            registerContext({
                ...contextData,
                screen: location.pathname,
                timestamp: Date.now()
            });
        }
    }, [contextData, registerContext, location.pathname]);
};

/**
 * Hook for project screens to register project context
 */
export const useProjectContext = (projectId, projectData = null) => {
    const { setProject, registerContext } = useAIAssistant();
    const location = useLocation();

    useEffect(() => {
        if (projectId) {
            setProject(projectId);
            
            if (projectData) {
                registerContext({
                    currentProject: projectId,
                    projectData: projectData,
                    screen: location.pathname
                });
            }
        }
    }, [projectId, projectData, setProject, registerContext, location.pathname]);
};

/**
 * Hook for task screens to register task context
 */
export const useTaskContext = (taskId, taskData = null, projectId = null) => {
    const { registerContext } = useAIAssistant();
    const location = useLocation();

    useEffect(() => {
        if (taskId) {
            registerContext({
                currentTask: taskId,
                taskData: taskData,
                currentProject: projectId,
                screen: location.pathname
            });
        }
    }, [taskId, taskData, projectId, registerContext, location.pathname]);
};

