const { CLIENT_AI_SYSTEM_PROMPT } = require('./clientAISystemPrompt');

/**
 * Generate client AI response (read-only, informational only)
 * This handler does NOT execute any actions - it only provides guidance and information
 */
const generateClientAIResponse = async (geminiModel, context, userMessage, projectId) => {
    // Build conversation history text for context (skip for client guidance questions)
    let conversationContext = '';
    if (!context.isClientGuidance && context.conversationHistory && Array.isArray(context.conversationHistory) && context.conversationHistory.length > 0) {
        conversationContext = '\n\n=== CONVERSATION HISTORY ===\n';
        context.conversationHistory.forEach((msg, idx) => {
            const role = msg.type === 'user' ? 'User' : 'Waiverlyn';
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            conversationContext += `${idx + 1}. ${role}: ${content}\n`;
        });
        conversationContext += '\nContinue the conversation based on the history above.\n';
    }
    
    // Add current task information if available (skip for client guidance questions)
    let currentTaskContext = '';
    if (!context.isClientGuidance && (context.taskData || context.currentTask)) {
        const taskInfo = context.taskData || {};
        currentTaskContext = '\n\n=== CURRENTLY OPEN TASK ===\n';
        currentTaskContext += `The user currently has a task open. Use this information to answer questions about the specific task.\n`;
        currentTaskContext += `Task ID: ${taskInfo.id || context.currentTask}\n`;
        if (taskInfo.fields) {
            currentTaskContext += `Task Title: ${taskInfo.fields.task_title || 'N/A'}\n`;
            currentTaskContext += `Task Status: ${taskInfo.fields.task_status || 'N/A'}\n`;
            if (taskInfo.fields.Action_type || taskInfo.fields.action_type) {
                currentTaskContext += `Action Type: ${taskInfo.fields.Action_type || taskInfo.fields.action_type}\n`;
                currentTaskContext += `CRITICAL: The Action_type field indicates what action the CLIENT is supposed to do - it is NEVER the consultant who completes the action.\n`;
            }
            if (taskInfo.fields.due_date) {
                currentTaskContext += `Due Date: ${taskInfo.fields.due_date}\n`;
            }
            if (taskInfo.fields.assigned_to) {
                currentTaskContext += `Assigned To: ${Array.isArray(taskInfo.fields.assigned_to) ? taskInfo.fields.assigned_to.join(', ') : taskInfo.fields.assigned_to}\n`;
            }
            // Include full description text if available
            if (taskInfo.fields.description_text) {
                currentTaskContext += `\nTask Description:\n${taskInfo.fields.description_text}\n`;
            } else if (taskInfo.fields.description) {
                const desc = taskInfo.fields.description;
                if (typeof desc === 'string') {
                    try {
                        const parsed = JSON.parse(desc);
                        if (parsed.root && parsed.root.children) {
                            const text = parsed.root.children
                                .map(paragraph => 
                                    (paragraph.children || [])
                                        .map(child => child.text || '')
                                        .join('')
                                )
                                .join('\n');
                            currentTaskContext += `\nTask Description:\n${text}\n`;
                        } else {
                            currentTaskContext += `\nTask Description:\n${desc.substring(0, 500)}\n`;
                        }
                    } catch (e) {
                        currentTaskContext += `\nTask Description:\n${desc.substring(0, 500)}\n`;
                    }
                } else {
                    currentTaskContext += `\nTask Description: Available\n`;
                }
            }
        }
        currentTaskContext += '\nWhen the user asks about "this task" or "the current task" or asks about the task description, they are referring to the task above. You can answer questions about the task description directly since it is provided above.\n';
    }
    
    // Add About Us card context if available
    let aboutUsContext = '';
    if (context.aboutUsCardData || context.currentAboutUsCard) {
        const aboutUsData = context.aboutUsCardData || {};
        aboutUsContext = '\n\n=== CURRENTLY OPEN ABOUT US CARD ===\n';
        aboutUsContext += `The user currently has an About Us card open. Use this information to answer questions about the About Us content.\n`;
        aboutUsContext += `Card ID: ${aboutUsData.id || context.currentAboutUsCard}\n`;
        aboutUsContext += `Title: ${aboutUsData.title || 'N/A'}\n`;
        if (aboutUsData.content) {
            aboutUsContext += `\nContent:\n${aboutUsData.content}\n`;
        }
        aboutUsContext += '\nWhen the user asks about the "About Us" section, "this About Us card", or questions about the About Us content, they are referring to the card above. You can answer questions about the content directly since it is provided above.\n';
    }
    
    // Add informational page context if available
    let infoPageContext = '';
    if (context.infoPageData || context.currentInfoPage) {
        const infoPageData = context.infoPageData || {};
        infoPageContext = '\n\n=== CURRENTLY OPEN INFORMATIONAL PAGE ===\n';
        infoPageContext += `The user currently has an informational page open. Use this information to answer questions about the page content.\n`;
        infoPageContext += `Page ID: ${infoPageData.id || context.currentInfoPage}\n`;
        infoPageContext += `Title: ${infoPageData.title || 'N/A'}\n`;
        if (infoPageData.icon) {
            infoPageContext += `Icon: ${infoPageData.icon}\n`;
        }
        if (infoPageData.content) {
            infoPageContext += `\nContent:\n${infoPageData.content}\n`;
        }
        infoPageContext += '\nWhen the user asks about the informational page, "this page", or questions about the page content, they are referring to the page above. You can answer questions about the content directly since it is provided above.\n';
    }
    
    // Add client guidance context if available (for quick prompt questions)
    let clientGuidanceContext = '';
    if (context.isClientGuidance && context.clientGuidanceContext) {
        const guidance = context.clientGuidanceContext;
        clientGuidanceContext = '\n\n=== CLIENT GUIDANCE CONTEXT ===\n';
        clientGuidanceContext += `This is a CLIENT GUIDANCE question. Use the information below to provide helpful, actionable guidance.\n\n`;
        clientGuidanceContext += `Project Type: ${guidance.projectType || 'N/A'}\n`;
        clientGuidanceContext += `Project Status: ${guidance.projectStatus || 'N/A'}\n`;
        clientGuidanceContext += `Total Tasks: ${guidance.totalTasks || 0}\n`;
        clientGuidanceContext += `Completed Tasks: ${guidance.completedTasks || 0}\n`;
        clientGuidanceContext += `All Tasks Completed: ${guidance.isAllTasksCompleted ? 'Yes' : 'No'}\n\n`;
        
        if (guidance.currentTask) {
            clientGuidanceContext += `Current Task: ${guidance.currentTask.taskTitle || 'N/A'}\n`;
            clientGuidanceContext += `Current Task Status: ${guidance.currentTask.status || 'N/A'}\n`;
            clientGuidanceContext += `Current Task Action Type: ${guidance.currentTask.actionType || 'N/A'}\n`;
            clientGuidanceContext += `Current Task Position: ${guidance.currentTaskIndex !== null ? `Task ${guidance.currentTaskIndex + 1} of ${guidance.taskSequence?.length || 0}` : 'N/A'}\n\n`;
            
            if (guidance.nextTasks && guidance.nextTasks.length > 0) {
                clientGuidanceContext += `Next Tasks After Current Task:\n`;
                guidance.nextTasks.slice(0, 5).forEach((nextTask, idx) => {
                    clientGuidanceContext += `  ${idx + 1}. ${nextTask.taskTitle} (${nextTask.status})\n`;
                });
                clientGuidanceContext += '\n';
            }
        }
        
        if (guidance.taskSequence && guidance.taskSequence.length > 0) {
            clientGuidanceContext += `Task Sequence (${guidance.taskSequence.length} tasks total):\n`;
            guidance.taskSequence.forEach((task, idx) => {
                const status = task.status === 'Completed' ? '✓' : '○';
                const groupInfo = task.groupName ? ` [${task.groupName}]` : '';
                clientGuidanceContext += `  ${status} ${idx + 1}. ${task.taskTitle}${groupInfo} (${task.status})\n`;
            });
            clientGuidanceContext += '\n';
        }
        
        clientGuidanceContext += 'Use this context to answer client guidance questions. Reference task titles, not IDs. Be specific about what comes next in the sequence.\n';
    }
    
    const enhancedPrompt = `${CLIENT_AI_SYSTEM_PROMPT}

=== CURRENT PROJECT CONTEXT ===
${JSON.stringify(context, null, 2)}${conversationContext}${currentTaskContext}${aboutUsContext}${infoPageContext}${clientGuidanceContext}

=== USER REQUEST ===
${userMessage}

=== CRITICAL INSTRUCTIONS ===
You MUST respond with ONLY valid JSON. Do not include any text before or after the JSON.

You can ONLY respond with:
1. {"type": "response", "message": "your answer here"} - For informational responses
2. {"type": "question", "message": "your question here"} - For follow-up questions

You CANNOT respond with action types - you are read-only and cannot create or modify anything.

IMPORTANT: Your entire response must be valid JSON that can be parsed with JSON.parse(). Do not add any explanatory text outside the JSON object.`;

    try {
        const result = await geminiModel.generateContent([enhancedPrompt]);
        const response = await result.response;
        const responseText = response.text();
        
        // Try to parse as JSON
        try {
            // Extract JSON from response if it's wrapped in markdown
            let jsonText = responseText;
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonText = jsonMatch[0];
            }
            
            const parsed = JSON.parse(jsonText);
            
            // Client AI can only return response or question types
            if (parsed.type === 'response' || parsed.type === 'question') {
                return parsed;
            } else {
                // If AI tries to return an action, convert to response
                console.warn('Client AI attempted to return action type - converting to response');
                return {
                    type: 'response',
                    message: parsed.message || 'I can only provide information and guidance. If you need to create or modify project elements, please contact your consultant.'
                };
            }
        } catch (parseError) {
            // If JSON parsing fails, return as a response
            console.warn('Failed to parse client AI response as JSON:', parseError);
            return {
                type: 'response',
                message: responseText
            };
        }
    } catch (error) {
        console.error('Error generating client AI response:', error);
        throw error;
    }
};

module.exports = { generateClientAIResponse };

