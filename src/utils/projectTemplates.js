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
 * 8. To pre-attach a form to a task, add the `preAttachedFormName` property to its `fields` object
 *    with the exact name of the form as the value. The component will fetch and attach it on load.
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
            name: 'ONBOARDING TASKS FOR LICENSE',
            order: 0,
        },
        {
            id: 'template-group-2',
            name: 'ONBOARDING TASK FOR PROVIDER ENROLLMENT',
            order: 1,
        }
    ],

    // An array of tasks. The `id` is temporary. `groupId` links to a group above.
    tasks: [
        {
            id: 'template-task-1',
            groupId: 'template-group-1', // Belongs to "Phase 1"
            fields: {
                'task_title': 'TASK #1: IF REGISTERED, TELL US ABOUT YOUR AGENCY/PRACTICE',
                'task_status': 'Not Started',
                'description': JSON.stringify({ "root": { "children": [{ "children": [{ "detail": 0, "format": 0, "mode": "normal", "style": "", "text": "IMPORTANT:\n\nPlease ensure all information is entered accurately.\nIf your agency has not yet been established, enter the name you intend to use for your business.\nIf Waiver Consulting Group (WCG) is responsible for forming and registering your agency, enter \\\"Pending WCG\\\" for any responses you do not have.\nFor any information that is not applicable, please enter \\\"N/A.\\\"\n", "type": "text", "version": 1 }], "direction": "ltr", "format": "", "indent": 0, "type": "paragraph", "version": 1 }], "direction": "ltr", "format": "", "indent": 0, "type": "root", "version": 1 } }),
                'assigned_to': 'Client',
                'order': 0,
                'Action_type': 'Complete Form',
                'preAttachedFormName': 'Agency Information' // This task will have the 'Agency Information' form attached by default.
            }
        },
        {
            id: 'template-task-2',
            groupId: 'template-group-1', // Belongs to "Phase 1"
            fields: {
                'task_title': "TASK # 1a: BUSINESS NOT REGISTERED? LET'S GET IT REGISTERED",
                'task_status': 'Not Started',
                'description': '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"First Select The Structure Of Your Proposed Business","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"(If you aren\'t sure, don\'t worry, call us to discuss them further)","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"WHAT IS A BUSIENSS STRUCTURE?","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Business structures like different backpacks for carrying money that you earn from selling stuff, let\'s say like snacks or video games. Each backpack has its own rules for what happens if the snacks go bad or if you lose some video games, and also for how you count the money when you talk to the Money Collector (the IRS for taxes).","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Sole Proprietorship:","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Imagine you\'re selling snacks all by yourself. You get all the profit, but if you owe money or get into trouble, it\'s all on you. And when you tell the Money Collector how much you made, it\'s just added to the money you got from mowing lawns or babysitting.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Partnership:","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is like teaming up with a buddy to sell more snacks. You both share the money you make and the trouble you might get into. And you both tell the Money Collector about your share of the snack money.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Corporation (C Corp and S Corp):","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Think of a C Corp like a big, fancy backpack with lots of pockets. It\'s its own thing, and it keeps your personal stuff (like your house and video games) safe if something goes wrong. But, the Money Collector asks for a share of the money twice: once from the backpack (the corporation itself) and again from whatever you take out of it.","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"An S Corp is like a C Corp, but you tell the Money Collector about the money you make directly, so it\'s only counted once. This is like having a fancy backpack but with a special pass to skip the double money check.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Limited Liability Company (LLC):","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"An LLC is like a backpack that protects your personal stuff and is flexible; you can carry it however you want. If you tell the Money Collector about the money in it, it\'s just once, like your allowance or birthday money.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":1,"mode":"normal","style":"","text":"Cooperative:","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Imagine you and a bunch of friends run a snack stand together. You decide how to run it and what to do with the profits. If the stand makes money, you share it based on how much each person helped out or how many snacks they sold.","type":"text","version":1},{"type":"linebreak","version":1},{"detail":0,"format":0,"mode":"normal","style":"","text":"Each type of backpack (business structure) has different rules for handling problems, sharing profits, and dealing with the Money Collector. You\'d pick the type based on what you\'re servicing, how many friends are helping, how much you want to protect your personal assets, and how you want to talk to the IRS about your business income. :)","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}',
                'assigned_to': 'Client',
                'order': 1,
                'Action_type': 'Complete Form',
             
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
