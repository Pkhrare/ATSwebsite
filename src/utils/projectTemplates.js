// projectTemplates.js

/**
 * This file contains the static data for project templates.
 * 
 * HOW TO ADD A NEW TEMPLATE:
 * 1. Copy the entire `dummyProject` object and paste it as a new element in the `projectTemplates` array.
 * 2. Change the `id` to a new unique string (e.g., 'template-2').
 * 3. Update the `name` and `description` to reflect the new template.
 * 4. Modify the `projectData` object with the desired default values for the new project.
 * 5. Add or remove task groups in the `taskGroups` array.
 * 6. Add or remove tasks in the `tasks` array. Make sure the `groupId` for each task
 *    matches the `id` of a group in the `taskGroups` array if you want it to be grouped.
 *    If a task should be ungrouped, set its `groupId` to null.
 * 7. Task `id` fields should be unique within the template, but they are temporary. New IDs
 *    will be generated when the project is actually created.
 */

export const dummyProject = {
    id: 'template-1',
    name: 'Dummy Project Template',
    description: 'A standard project setup with pre-defined tasks and groups for a typical client engagement.',
    
    // This object mimics the structure of a `project` record from your API
    projectData: {
        'Project Name': 'New Dummy Project',
        'Client Email': '',
        'States': 'NY',
        'Project Type': 'Licensing Only',
        'Assigned Consultant': 'Michael Tarr',
        'Status': 'Not Started',
        'Notes': JSON.stringify({
            "root": {
                "children": [
                    { "children": [{ "detail": 0, "format": 0, "mode": "normal", "style": "", "text": "This is a pre-written note from the project template.", "type": "text", "version": 1 }], "direction": "ltr", "format": "", "indent": 0, "type": "paragraph", "version": 1 }
                ], "direction": "ltr", "format": "", "indent": 0, "type": "root", "version": 1
            }
        })
    },

    // An array of task groups. The `id` is a temporary frontend ID.
    taskGroups: [
        {
            id: 'template-group-1',
            name: 'Phase 1: Initial Setup',
            order: 0,
        },
        {
            id: 'template-group-2',
            name: 'Phase 2: Client Follow-up',
            order: 1,
        }
    ],

    // An array of tasks. The `id` is temporary. `groupId` links to a group above.
    tasks: [
        {
            id: 'template-task-1',
            groupId: 'template-group-1', // Belongs to "Phase 1"
            fields: {
                'task_title': 'Initial Client Consultation',
                'task_status': 'Not Started',
                'description': 'Schedule and hold the initial meeting with the client.',
                'order': 0,
            }
        },
        {
            id: 'template-task-2',
            groupId: 'template-group-1', // Belongs to "Phase 1"
            fields: {
                'task_title': 'Gather Required Documents',
                'task_status': 'Not Started',
                'description': 'Collect all necessary initial documents from the client.',
                'order': 1,
            }
        },
        {
            id: 'template-task-3',
            groupId: 'template-group-2', // Belongs to "Phase 2"
            fields: {
                'task_title': 'Send Follow-up Email',
                'task_status': 'Not Started',
                'description': 'Draft and send the post-consultation follow-up email.',
                'order': 0,
            }
        },
        {
            id: 'template-task-4',
            groupId: null, // This task is ungrouped
            fields: {
                'task_title': 'Internal Project Kick-off',
                'task_status': 'Not Started',
                'description': 'Hold an internal meeting to assign roles and start the project.',
                'order': 0,
            }
        }
    ]
};

// The main export is an array of all available templates.
export const projectTemplates = [
    dummyProject
    // Add other templates here by copying the `dummyProject` object.
];
