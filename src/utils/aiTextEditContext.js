/**
 * Utility to gather context for AI text editing based on where the user is editing
 * This provides rich context to help the AI make better edits
 */

import { fromLexical } from './lexicalUtils';

/**
 * Gather context for AI text editing
 * @param {string} sourceTable - The table being edited (e.g., 'tasks', 'actions', 'projects')
 * @param {string} sourceRecordId - The record ID being edited
 * @param {string} currentText - The current text content (plain text or Lexical JSON)
 * @param {string} fieldName - The field name being edited (e.g., 'description', 'action_description')
 * @param {Object} aiContext - The AI assistant context from useAIAssistant()
 * @returns {Promise<Object>} Context object for the AI
 */
export const gatherTextEditContext = async (sourceTable, sourceRecordId, currentText, fieldName, aiContext) => {
    const context = {
        editingLocation: {
            table: sourceTable,
            recordId: sourceRecordId,
            fieldName: fieldName
        },
        currentText: currentText,
        projectContext: null,
        recordContext: null,
        relatedContext: {}
    };

    try {
        // Convert Lexical content to plain text if needed
        let textContent = currentText;
        if (typeof currentText === 'string' && currentText.trim().startsWith('{')) {
            try {
                textContent = fromLexical(currentText);
            } catch (e) {
                // If conversion fails, use original
                textContent = currentText;
            }
        }
        context.currentText = textContent;

        // Get AI context data
        const aiContextData = aiContext?.getFullContext?.() || {};
        
        // Gather context based on sourceTable
        switch (sourceTable) {
            case 'tasks':
                context = await gatherTaskContext(context, sourceRecordId, fieldName, aiContextData);
                break;
            case 'actions':
                context = await gatherActionContext(context, sourceRecordId, fieldName, aiContextData);
                break;
            case 'projects':
                context = await gatherProjectContext(context, sourceRecordId, fieldName, aiContextData);
                break;
            case 'about_us':
                context = await gatherAboutUsContext(context, sourceRecordId, fieldName, aiContextData);
                break;
            case 'informational_pages':
                context = await gatherInfoPageContext(context, sourceRecordId, fieldName, aiContextData);
                break;
            default:
                // Basic context - just get the record
                context.recordContext = await getRecordContext(sourceTable, sourceRecordId);
        }

        // Always include project context if available
        if (aiContextData.currentProject || aiContextData.projectData) {
            context.projectContext = {
                projectId: aiContextData.currentProject || aiContextData.projectData?.id,
                projectName: aiContextData.projectData?.fields?.['Project Name'],
                projectIdReadable: aiContextData.projectData?.fields?.['Project ID']
            };
        }

    } catch (error) {
        console.error('Error gathering text edit context:', error);
    }

    return context;
};

/**
 * Gather context for task description editing
 */
async function gatherTaskContext(context, taskId, fieldName, aiContextData) {
    try {
        const ApiCaller = (await import('../components/apiCall/ApiCaller')).default;
        
        // Get task record
        const taskRecord = await ApiCaller(`/records/tasks/${taskId}`);
        context.recordContext = {
            taskId: taskRecord.id,
            taskTitle: taskRecord.fields?.task_title,
            taskStatus: taskRecord.fields?.task_status,
            assignedTo: taskRecord.fields?.assigned_to,
            dueDate: taskRecord.fields?.due_date,
            actionType: taskRecord.fields?.Action_type
        };

        // Get project context
        const projectId = taskRecord.fields?.project_id?.[0];
        if (projectId) {
            try {
                const projectRecord = await ApiCaller(`/records/projects/${projectId}`);
                context.projectContext = {
                    projectId: projectRecord.id,
                    projectName: projectRecord.fields?.['Project Name'],
                    projectIdReadable: projectRecord.fields?.['Project ID'],
                    clientEmail: projectRecord.fields?.['Client Email'],
                    assignedConsultant: projectRecord.fields?.['Assigned Consultant'],
                    supervisingConsultant: projectRecord.fields?.['Supervising Consultant']
                };
            } catch (e) {
                console.warn('Could not fetch project context:', e);
            }

            // Get all tasks in the project for context
            try {
                const projectIdReadable = context.projectContext?.projectIdReadable || projectId;
                const tasksResponse = await ApiCaller(`/records/filter/${projectIdReadable}/tasks`);
                context.relatedContext.tasks = (tasksResponse.records || []).map(t => ({
                    id: t.id,
                    title: t.fields?.task_title,
                    status: t.fields?.task_status
                }));
            } catch (e) {
                console.warn('Could not fetch related tasks:', e);
            }
        }

        // Use task data from AI context if available (includes description_text)
        if (aiContextData.taskData) {
            context.recordContext.descriptionText = aiContextData.taskData.fields?.description_text;
        }

    } catch (error) {
        console.error('Error gathering task context:', error);
    }

    return context;
}

/**
 * Gather context for action description editing
 */
async function gatherActionContext(context, actionId, fieldName, aiContextData) {
    try {
        const ApiCaller = (await import('../components/apiCall/ApiCaller')).default;
        
        // Get action record
        const actionRecord = await ApiCaller(`/records/actions/${actionId}`);
        context.recordContext = {
            actionId: actionRecord.id,
            actionDescription: actionRecord.fields?.action_description,
            estimatedCompletionDate: actionRecord.fields?.estimated_completion_date,
            setDate: actionRecord.fields?.set_date,
            completed: actionRecord.fields?.completed,
            pendingAction: actionRecord.fields?.pending_action
        };

        // Get project context
        const projectId = actionRecord.fields?.['Project ID']?.[0];
        if (projectId) {
            try {
                const projectRecord = await ApiCaller(`/records/projects/${projectId}`);
                context.projectContext = {
                    projectId: projectRecord.id,
                    projectName: projectRecord.fields?.['Project Name'],
                    projectIdReadable: projectRecord.fields?.['Project ID']
                };
            } catch (e) {
                console.warn('Could not fetch project context:', e);
            }

            // Get ALL actions in the project for context
            try {
                const projectIdReadable = context.projectContext?.projectIdReadable || projectId;
                const actionsResponse = await ApiCaller(`/records/filter/${projectIdReadable}/actions`);
                context.relatedContext.actions = (actionsResponse.records || []).map(a => ({
                    id: a.id,
                    description: a.fields?.action_description,
                    estimatedCompletionDate: a.fields?.estimated_completion_date,
                    completed: a.fields?.completed
                }));
            } catch (e) {
                console.warn('Could not fetch related actions:', e);
            }
        }

    } catch (error) {
        console.error('Error gathering action context:', error);
    }

    return context;
}

/**
 * Gather context for project notes editing
 */
async function gatherProjectContext(context, projectId, fieldName, aiContextData) {
    try {
        const ApiCaller = (await import('../components/apiCall/ApiCaller')).default;
        
        // Get project record
        const projectRecord = await ApiCaller(`/records/projects/${projectId}`);
        context.recordContext = {
            projectId: projectRecord.id,
            projectName: projectRecord.fields?.['Project Name'],
            projectIdReadable: projectRecord.fields?.['Project ID'],
            operation: projectRecord.fields?.Operation,
            clientEmail: projectRecord.fields?.['Client Email']
        };

        // Use project data from AI context if available
        if (aiContextData.projectData) {
            context.recordContext = {
                ...context.recordContext,
                ...aiContextData.projectData.fields
            };
        }

    } catch (error) {
        console.error('Error gathering project context:', error);
    }

    return context;
}

/**
 * Gather context for About Us card editing
 */
async function gatherAboutUsContext(context, cardId, fieldName, aiContextData) {
    try {
        // Use About Us data from AI context if available
        if (aiContextData.aboutUsCardData) {
            context.recordContext = {
                cardId: aiContextData.aboutUsCardData.id,
                title: aiContextData.aboutUsCardData.title,
                content: aiContextData.aboutUsCardData.content
            };
        }

    } catch (error) {
        console.error('Error gathering About Us context:', error);
    }

    return context;
}

/**
 * Gather context for informational page editing
 */
async function gatherInfoPageContext(context, pageId, fieldName, aiContextData) {
    try {
        // Use info page data from AI context if available
        if (aiContextData.infoPageData) {
            context.recordContext = {
                pageId: aiContextData.infoPageData.id,
                title: aiContextData.infoPageData.title,
                icon: aiContextData.infoPageData.icon,
                content: aiContextData.infoPageData.content
            };
        }

    } catch (error) {
        console.error('Error gathering info page context:', error);
    }

    return context;
}

/**
 * Get basic record context
 */
async function getRecordContext(tableName, recordId) {
    try {
        const ApiCaller = (await import('../components/apiCall/ApiCaller')).default;
        const record = await ApiCaller(`/records/${tableName}/${recordId}`);
        return {
            id: record.id,
            fields: record.fields
        };
    } catch (error) {
        console.error('Error getting record context:', error);
        return null;
    }
}

