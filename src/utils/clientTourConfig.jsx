import React from 'react';

// Tour configuration for client onboarding
export const getClientTourSteps = (hasGetStartedTask = false, hasOnboardingTasks = false) => {
    const steps = [
        // Step 1: Welcome
        {
            target: 'body',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">Welcome to Your Project Portal! 👋</h3>
                    <p className="text-sm mb-2">
                        We're here to guide you through your project portal. This tour will help you understand how to navigate and complete your tasks efficiently.
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                        Let's get started!
                    </p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        // Step 2: Project Informational Section
        {
            target: '[data-tour="project-details"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">Project Information</h3>
                    <p className="text-sm mb-2">
                        This section shows all the important details about your project, including your assigned consultant, project status, and key dates.
                    </p>
                    <p className="text-sm">
                        You can reference this information anytime to stay updated on your project's progress.
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        // Step 3: How to communicate with consultant
        {
            target: '[data-tour="general-discussion"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">💬 Communicate with Your Consultant</h3>
                    <p className="text-sm mb-2">
                        Use the "General Discussion" section to send messages directly to your consultant. You can:
                    </p>
                    <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                        <li>Type messages in the text area</li>
                        <li>Attach files or images</li>
                        <li>View your conversation history</li>
                    </ul>
                    <p className="text-sm font-semibold text-blue-600">
                        Your consultant will respond here, and you'll see read receipts when they view your messages.
                    </p>
                </div>
            ),
            placement: 'left',
        },
        // Step 4: What to do first
        {
            target: '[data-tour="quick-help"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">🚀 What to Do First</h3>
                    <p className="text-sm mb-2">
                        {hasGetStartedTask ? (
                            <>
                                <strong>Start with the "Get Started" task!</strong> This is your first step. Look for it in the Tasks section below.
                            </>
                        ) : hasOnboardingTasks ? (
                            <>
                                <strong>Complete your onboarding tasks!</strong> These are the initial tasks you need to complete. Find them in the Tasks section below.
                            </>
                        ) : (
                            <>
                                <strong>Review your tasks!</strong> Check the Tasks section below to see what needs to be completed.
                            </>
                        )}
                    </p>
                    <p className="text-sm">
                        You can also click the quick help buttons here to get instant guidance from our AI assistant about getting started.
                    </p>
                </div>
            ),
            placement: 'bottom',
        },
        // Step 5: How to locate tasks
        {
            target: '[data-tour="tasks-section"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">📋 Locate Your Tasks</h3>
                    <p className="text-sm mb-2">
                        All your tasks are organized here. Tasks are grouped by category, and you'll also see ungrouped tasks at the bottom.
                    </p>
                    <p className="text-sm mb-2">
                        <strong>Task Status Indicators:</strong>
                    </p>
                    <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                        <li>✅ Green checkmark = Task completed</li>
                        <li>Circle with initials = Task assigned to someone</li>
                    </ul>
                    <p className="text-sm font-semibold text-blue-600">
                        Click on any task to view its details and complete it.
                    </p>
                </div>
            ),
            placement: 'top',
        },
        // Step 6: How to complete tasks (general)
        {
            target: '[data-tour="task-example"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">✅ How to Complete Tasks</h3>
                    <p className="text-sm mb-2">
                        To complete a task, click on it to open the task details. When you open a task, you'll see:
                    </p>
                    <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                        <li><strong>Task Description:</strong> Read this carefully - it explains what's needed and why</li>
                        <li><strong>Action Buttons:</strong> Below the description, you'll find buttons for:
                            <ul className="list-disc list-inside ml-4 mt-1">
                                <li>Upload Files - for document uploads</li>
                                <li>Sign Document - for signature tasks</li>
                                <li>Complete Form - for form submissions</li>
                                <li>Checklist - for checklist items</li>
                            </ul>
                        </li>
                    </ul>
                    <p className="text-sm font-semibold text-blue-600">
                        Click any task to see its details and complete the required actions!
                    </p>
                </div>
            ),
            placement: 'right',
        },
        // Step 7: Need Help - AI Assistant
        {
            target: '[data-tour="ai-assistant"]',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">🤖 Need Help? Talk to Our AI</h3>
                    <p className="text-sm mb-2">
                        If you're unsure about anything, our AI assistant is here to help! You can:
                    </p>
                    <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                        <li>Ask why certain tasks are needed</li>
                        <li>Get step-by-step guidance on completing tasks</li>
                        <li>Understand how tasks help your application</li>
                        <li>Get answers to any questions about your project</li>
                    </ul>
                    <p className="text-sm font-semibold text-blue-600">
                        Click the AI assistant button (usually in the bottom right) to start a conversation!
                    </p>
                </div>
            ),
            placement: 'left',
        },
        // Step 8: Completion
        {
            target: 'body',
            content: (
                <div>
                    <h3 className="text-lg font-bold mb-2">🎉 You're All Set!</h3>
                    <p className="text-sm mb-2">
                        You now know how to navigate your project portal! Remember:
                    </p>
                    <ul className="text-sm list-disc list-inside mb-2 space-y-1">
                        <li>Check your tasks regularly</li>
                        <li>Read task descriptions carefully</li>
                        <li>Use the AI assistant if you need help</li>
                        <li>Communicate with your consultant via messages</li>
                    </ul>
                    <p className="text-sm font-semibold text-blue-600">
                        You can restart this tour anytime by clicking "Take Tour" next to your project title!
                    </p>
                </div>
            ),
            placement: 'center',
        },
    ];

    return steps;
};

