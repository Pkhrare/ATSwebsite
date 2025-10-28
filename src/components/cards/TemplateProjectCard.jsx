import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import TemplateTaskCard from './TemplateTaskCard'; // Will be created in the next step
import AddTaskToProjectForm from '../forms/AddTaskToProjectForm';
import AddCollaboratorForm from '../forms/AddCollaboratorForm';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { dropdownFields, validateRow, DEFAULT_ACTIVITIES, safeNewDate, assignedConsultants_record_ids } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import { saveContent } from '../../utils/contentUtils';
import RichTextEditor from '../richText/RichTextEditor';
import { generateProjectID } from '../../utils/projectUtils';


// --- SVG Icons (Copied from ProjectCard.jsx) ---
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);
const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);
const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const CompletedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);
const IncompleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);


// --- Main Template Card Component ---
export default function TemplateProjectCard({ template, onClose }) {
    const { userRole } = useAuth();
    // All state is managed locally, initialized from the template prop
    const [projectData, setProjectData] = useState(template.projectData);
    const [taskData, setTaskData] = useState(() => {
        const groupsMap = new Map();
        template.taskGroups.forEach(group => {
            groupsMap.set(group.id, { ...group, tasks: [] });
        });

        const ungroupedTasks = [];
        template.tasks.forEach(task => {
            if (task.groupId && groupsMap.has(task.groupId)) {
                groupsMap.get(task.groupId).tasks.push(task);
            } else {
                ungroupedTasks.push(task);
            }
        });

        const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);
        sortedGroups.forEach(group => group.tasks.sort((a, b) => a.fields.order - b.fields.order));
        ungroupedTasks.sort((a, b) => a.fields.order - b.fields.order);

        return { groups: sortedGroups, ungroupedTasks };
    });

    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const notesEditorRef = useRef(toLexical(projectData.Notes || ''));
    const [errors, setErrors] = useState({});
    
    // Simplified states as many sections are not needed for a template
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);
    const [isAddTaskFormVisible, setIsAddTaskFormVisible] = useState(false);

    useEffect(() => {
        const fetchAndAttachForms = async () => {
            // Find all tasks that need a form pre-attached
            const tasksWithForms = template.tasks.filter(t => t.fields.preAttachedFormName);
            if (tasksWithForms.length === 0) return;

            try {
                // Fetch all available forms from the backend
                const allForms = await ApiCaller('/all/task_forms');
                if (!allForms || !Array.isArray(allForms)) {
                    console.warn("Could not fetch forms for pre-attachment.");
                    return;
                }

                // Create a map for quick lookup
                const formsMap = new Map(allForms.map(form => [form.fields.form_name, form]));

                // Create a new taskData object with the forms attached
                const newTaskData = JSON.parse(JSON.stringify(taskData));
                
                const updateTasksInGroup = (tasks) => {
                    tasks.forEach(task => {
                        if (task.fields.preAttachedFormName && formsMap.has(task.fields.preAttachedFormName)) {
                            task.fields.attachedForm = formsMap.get(task.fields.preAttachedFormName);
                        }
                    });
                };

                // Update both grouped and ungrouped tasks
                newTaskData.groups.forEach(group => updateTasksInGroup(group.tasks));
                updateTasksInGroup(newTaskData.ungroupedTasks);

                // Update the state with the enriched task data
                setTaskData(newTaskData);

            } catch (error) {
                console.error("Error pre-attaching forms to template tasks:", error);
            }
        };

        fetchAndAttachForms();
    }, [template]); // Run only when the template prop changes

    const assigneeOptions = useMemo(() => {
        const options = new Set();
        if (projectData['Assigned Consultant']) options.add(projectData['Assigned Consultant']);
        // Add other potential assignees if your logic requires it (e.g., from a collaborators list)
        return Array.from(options).filter(Boolean);
    }, [projectData]);

    // This function will be responsible for creating the project on the backend
    const handleCreateProject = async () => {
        setIsCreatingProject(true);
        setErrors({});

        // Step 1: Validate required fields before doing anything else.
        const validationErrors = validateRow(projectData);
        if (Object.keys(validationErrors).length > 0) {
            console.log('Validation errors:', validationErrors);
            setErrors(validationErrors);
            setIsEditingDetails(true); // Open the details section to show the errors
            alert('Please fill in all required project details before creating the project.');
            setIsCreatingProject(false);
            return;
        }

        try {
            // Step 2: Generate Project ID and calculate Balance
            const projectID = await generateProjectID(projectData['States'], projectData['Project Type'], projectData['Start Date']);
            if (!projectID) {
                throw new Error("Failed to generate a Project ID. Please check required fields like State, Project Type, and Start Date.");
            }
            const balance = (Number(projectData['Full Cost']) || 0) - (Number(projectData['Paid']) || 0);

            // Step 3: Create the main project record (without Notes - we'll save as attachment).
            // Remove potential problematic fields that shouldn't be in creation
            const { 
                id, 
                createdTime, 
                Notes, 
                Tasks, 
                collaborator_name,
                ServiceMilestones,
                Actions,
                Documents,
                'Last Updated': lastUpdated,
                ...cleanProjectData 
            } = projectData;
            
            // Store Notes content for later attachment saving
            let notesContent = Notes;
            
            // If we have a notes editor ref but it's an editor instance, extract the content
            if (notesEditorRef.current && typeof notesEditorRef.current === 'object' && notesEditorRef.current.getEditorState) {
                notesContent = JSON.stringify(notesEditorRef.current.getEditorState().toJSON());
            }

            const projectToCreate = { 
                ...cleanProjectData, 
                'Project ID': projectID,
                'Balance': balance
            };

            const assignedConsultantName = projectToCreate['Assigned Consultant'];
            if (assignedConsultantName && assignedConsultants_record_ids[assignedConsultantName]) {
                projectToCreate['collaborators'] = [assignedConsultants_record_ids[assignedConsultantName]];
            }


            // Remove any undefined or null values
            Object.keys(projectToCreate).forEach(key => {
                if (projectToCreate[key] === undefined || projectToCreate[key] === null || projectToCreate[key] === '') {
                    delete projectToCreate[key];
                }
            });

            console.log('Creating project with data:', projectToCreate);
            console.log('Project fields being sent:');
            Object.keys(projectToCreate).forEach(key => {
                console.log(`  ${key}: ${typeof projectToCreate[key]} = ${JSON.stringify(projectToCreate[key]).substring(0, 100)}...`);
            });

            const createProjectResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [{ fields: projectToCreate }],
                    tableName: 'projects'
                })
            });

            const newProjectRecord = createProjectResponse.records[0];
            const newProjectId = newProjectRecord.id;
            const newProjectIdentifier = newProjectRecord.fields['Project ID']; // Get the human-readable ID

            // Step 4: Save Notes as attachment if there's content
            try {
                await saveContent('projects', newProjectId, 'Notes', notesContent);
            } catch (notesError) {
                console.error("Project created, but failed to save notes:", notesError);
                // Don't throw error here as project is already created
            }

            // Step 5: Create a collaborator for the client.
            const newClientCollaboratorName = projectData['Project Name'];
            await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [{
                        fields: {
                            collaborator_name: newClientCollaboratorName,
                            collaborator_email: projectData['Client Email'],
                            Projects: [newProjectId]
                        }
                    }],
                    tableName: 'collaborators'
                })
            });

            // Step 6: Create the task groups, linking them to the new project.
            const groupsToCreate = taskData.groups.map(group => ({
                fields: {
                    group_name: group.name,
                    group_order: group.order,
                    projectID: [newProjectId]
                }
            }));

            const createGroupsResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: groupsToCreate,
                    tableName: 'task_groups'
                })
            });

            const newGroupRecords = createGroupsResponse.records;
            const tempGroupToNewIdMap = new Map();
            taskData.groups.forEach((tempGroup, index) => {
                tempGroupToNewIdMap.set(tempGroup.id, newGroupRecords[index].id);
            });

            // Step 7: Create all tasks, along with their associated sub-items.
            const allTasksFromTemplate = [
                ...taskData.groups.flatMap(group => 
                    group.tasks.map(task => ({ ...task, finalGroupId: tempGroupToNewIdMap.get(task.groupId) }))
                ),
                ...taskData.ungroupedTasks.map(task => ({ ...task, finalGroupId: null }))
            ];

            // A single batch create for all tasks
            const humanReadableIds = []; // Store IDs separately
            const tasksToCreatePayload = allTasksFromTemplate.map((task, index) => {
                // Whitelist approach to build a clean payload, preventing read-only fields from being sent.
                
                // --- Dynamic Assignee Logic ---
                let finalAssignee = task.fields.assigned_to; // Default
                const assigneePlaceholder = task.fields.assigned_to;
                if (assigneePlaceholder === 'Client') {
                    finalAssignee = newClientCollaboratorName;
                } else if (assigneePlaceholder === 'Consultant') {
                    finalAssignee = projectData['Assigned Consultant'];
                } else if (assigneePlaceholder === 'Supervising Consultant') {
                    finalAssignee = projectData['Supervising Consultant'];
                }
                
                // If no assignee specified, default to the project's assigned consultant
                if (!finalAssignee) {
                    finalAssignee = projectData['Assigned Consultant'];
                }

                // Generate today's date for start_date if not specified
                const today = new Date().toISOString().split('T')[0];
                
                const fieldsToCreate = {
                    // Don't set 'id' during creation - we'll update it after creation
                    'project_id': [newProjectId], // Use the correct field name 'project_id'
                    'task_title': task.fields.task_title,
                    'task_status': task.fields.task_status || 'Not Started',
                    'order': task.fields.order || 0,
                    'task_groups': task.finalGroupId ? [task.finalGroupId] : [],
                    'assigned_to': finalAssignee, // Use the dynamically determined assignee
                    'due_date': task.fields.due_date,
                    'start_date': task.fields.start_date || today, // Default to today if not specified
                    'progress_bar': task.fields.progress_bar || 0,
                    'Action_type': task.fields.Action_type, // Don't set default here - let template control it
                    'tags': task.fields.tags
                };
                
                // Store the human-readable ID separately
                const humanReadableId = `${newProjectIdentifier}-T${index + 1}`;
                humanReadableIds.push(humanReadableId);
            
                // Remove any undefined, null, or empty fields to keep the payload clean
                Object.keys(fieldsToCreate).forEach(key => {
                    if (fieldsToCreate[key] === undefined || fieldsToCreate[key] === null || fieldsToCreate[key] === '') {
                        delete fieldsToCreate[key];
                    }
                });

                // Also remove any fields that shouldn't be in task creation
                const fieldsToRemove = ['checklistItems', 'attachments', 'attachedForm', 'preAttachedFormName'];
                fieldsToRemove.forEach(field => {
                    if (fieldsToCreate[field] !== undefined) {
                        delete fieldsToCreate[field];
                    }
                });
                

            
                return { fields: fieldsToCreate };
            });

            if (tasksToCreatePayload.length === 0) {
                alert('Project created successfully! (No tasks to add)');
                onClose();
                return;
            }

            console.log('Creating tasks. Number of tasks:', tasksToCreatePayload.length);
            console.log('Task creation payload:', JSON.stringify(tasksToCreatePayload, null, 2));

            const createTasksResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: tasksToCreatePayload,
                    tableName: 'tasks'
                })
            });
            const newTaskRecords = createTasksResponse.records;

            // Step 8: Update task IDs with human-readable IDs
            const idUpdatePromises = humanReadableIds.map(async (humanReadableId, index) => {
                const newTaskId = newTaskRecords[index].id;
                
                if (humanReadableId) {
                    try {
                        await ApiCaller(`/records/tasks/${newTaskId}`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                fields: { id: humanReadableId }
                            })
                        });
                    } catch (idError) {
                        console.error(`Failed to update ID for task ${newTaskId}:`, idError);
                    }
                }
            });
            
            await Promise.all(idUpdatePromises);

            // Step 9: Save task descriptions as attachments
            const descriptionPromises = allTasksFromTemplate.map(async (templateTask, index) => {
                const newTaskId = newTaskRecords[index].id;
                if (templateTask.fields.description) {
                    try {
                        await saveContent('tasks', newTaskId, 'description', templateTask.fields.description);
                    } catch (descError) {
                        console.error(`Failed to save description for task ${newTaskId}:`, descError);
                    }
                }
            });
            
            // Wait for all descriptions to be saved
            await Promise.all(descriptionPromises);

            // Step 9: Now that tasks are created, create all their sub-items in batch.
            const checklistsToCreate = [];
            const attachmentsToCreate = [];
            const formSubmissionsToCreate = [];
            const approvalsToCreate = [];

            allTasksFromTemplate.forEach((templateTask, index) => {
                const newTaskId = newTaskRecords[index].id;

                // Create checklist items
                if (templateTask.fields.checklistItems?.length > 0) {
                    templateTask.fields.checklistItems.forEach(item => {
                        checklistsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                checklist_description: item.checklist_description,
                                completed: false,
                            }
                        });
                    });
                }

                // Create attachment placeholders
                if (templateTask.fields.attachments?.length > 0) {
                    templateTask.fields.attachments.forEach(att => {
                        attachmentsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                attachment_description: att.attachment_description,
                            }
                        });
                    });
                }

                // Create form submissions (if a form is attached)
                if (templateTask.fields.attachedForm) {
                    const formFields = templateTask.fields.attachedForm.fields.task_forms_fields;
                    if (formFields && Array.isArray(formFields)) {
                        formFields.forEach(fieldId => {
                            formSubmissionsToCreate.push({
                                fields: {
                                    task_id: [newTaskId], 
                                    form: [templateTask.fields.attachedForm.id],
                                    field: [fieldId], // Corrected field name for linking to the field
                                    value: '--EMPTY--',
                                    submission: 'Incomplete'
                                }
                            });
                        });
                    }
                }

                // Create approval records (if approvals exist)
                if (templateTask.fields.approvals?.length > 0) {
                    templateTask.fields.approvals.forEach(approval => {
                        approvalsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                approval_description: approval.fields?.approval_description || approval.approval_description,
                            }
                        });
                    });
                }
            });

            // Batch create all sub-items in parallel
            const subItemPromises = [];
            if (checklistsToCreate.length > 0) {
                subItemPromises.push(ApiCaller('/records', {
                    method: 'POST', body: JSON.stringify({ recordsToCreate: checklistsToCreate, tableName: 'task_checklists' })
                }));
            }
            if (attachmentsToCreate.length > 0) {
                subItemPromises.push(ApiCaller('/records', {
                    method: 'POST', body: JSON.stringify({ recordsToCreate: attachmentsToCreate, tableName: 'task_attachments' })
                }));
            }
            if (formSubmissionsToCreate.length > 0) {
                subItemPromises.push(ApiCaller('/records', {
                    method: 'POST', body: JSON.stringify({ recordsToCreate: formSubmissionsToCreate, tableName: 'task_forms_submissions' })
                }));
            }
            if (approvalsToCreate.length > 0) {
                subItemPromises.push(ApiCaller('/records', {
                    method: 'POST', body: JSON.stringify({ recordsToCreate: approvalsToCreate, tableName: 'task_approval' })
                }));
            }

            await Promise.all(subItemPromises);

            alert('Project created successfully!');
            onClose(); // Close the template card and return to the templates page

        } catch (error) {
            console.error("Failed to create project from template:", error);
            alert("An error occurred while creating the project. Please check the console for details.");
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleDetailChange = (field, value) => {
        let processedValue = value;
        if (field === 'Full Cost' || field === 'Paid') {
            processedValue = value === '' ? null : parseFloat(value);
        }
        setProjectData(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleSaveDetails = () => {
        // No API call needed, just exit editing mode
        setIsEditingDetails(false);
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return 'No date';
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // The drag-and-drop handler is simplified to only update local state
    const handleDragEnd = (result) => {
        const { destination, source, type } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        const taskDataCopy = JSON.parse(JSON.stringify(taskData));

        if (type === 'GROUP') {
            const [reorderedGroup] = taskDataCopy.groups.splice(source.index, 1);
            taskDataCopy.groups.splice(destination.index, 0, reorderedGroup);
            // Re-order
            taskDataCopy.groups.forEach((g, index) => g.order = index);
            setTaskData(taskDataCopy);
            return;
        }

        if (type === 'TASK') {
            const sourceList = source.droppableId === 'ungrouped-tasks' 
                ? taskDataCopy.ungroupedTasks 
                : taskDataCopy.groups.find(g => g.id === source.droppableId)?.tasks;
            
            const destList = destination.droppableId === 'ungrouped-tasks'
                ? taskDataCopy.ungroupedTasks
                : taskDataCopy.groups.find(g => g.id === destination.droppableId)?.tasks;

            if (!sourceList || !destList) return;

            const [movedTask] = sourceList.splice(source.index, 1);
            destList.splice(destination.index, 0, movedTask);

            // Update groupId if moved between groups
            movedTask.groupId = destination.droppableId === 'ungrouped-tasks' ? null : destination.droppableId;

            // Re-order both lists
            sourceList.forEach((t, index) => t.fields.order = index);
            if (sourceList !== destList) {
                destList.forEach((t, index) => t.fields.order = index);
            }
            
            setTaskData(taskDataCopy);
        }
    };

    const handleTaskUpdate = (updatedTask) => {
        const newTaskData = JSON.parse(JSON.stringify(taskData));

        let taskFoundAndUpdated = false;

        // Search in grouped tasks
        for (const group of newTaskData.groups) {
            const taskIndex = group.tasks.findIndex(t => t.id === updatedTask.id);
            if (taskIndex !== -1) {
                group.tasks[taskIndex] = updatedTask;
                taskFoundAndUpdated = true;
                break;
            }
        }

        // If not found in groups, search in ungrouped tasks
        if (!taskFoundAndUpdated) {
            const taskIndex = newTaskData.ungroupedTasks.findIndex(t => t.id === updatedTask.id);
            if (taskIndex !== -1) {
                newTaskData.ungroupedTasks[taskIndex] = updatedTask;
            }
        }

        setTaskData(newTaskData);
        setIsTaskCardVisible(false);
    };
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-200 flex-shrink-0 bg-white mb-4 md:mb-6 gap-2">
                <button onClick={onClose} className="flex items-center gap-1 md:gap-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-2 py-2 md:px-4 rounded-lg border border-slate-300 shadow-sm transition-all duration-200 flex-shrink-0" aria-label="Back">
                    <BackIcon />
                    <span className="hidden sm:inline">Back to Templates</span>
                </button>
                <div className="text-center flex-1 px-2 min-w-0">
                    <h1 className="text-lg md:text-2xl font-bold text-slate-800 break-words leading-tight" title={projectData['Project Name']}>{projectData['Project Name']}</h1>
                    <p className="text-xs text-slate-500 font-mono">Template Preview</p>
                </div>
                <button 
                    onClick={handleCreateProject} 
                    disabled={isCreatingProject}
                    className="px-2 py-2 md:px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-xs md:text-sm font-medium disabled:bg-emerald-400 whitespace-nowrap flex-shrink-0"
                >
                    {isCreatingProject ? 'Creating...' : 'Create'}
                </button>
            </div>

            <main className="flex-grow overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
                    <div className="lg:col-span-3 space-y-4 md:space-y-6">
                        {/* Project Details Section */}
                        <section className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                                <h2 className="text-lg font-semibold text-slate-700">Project Details</h2>
                                {isEditingDetails ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setIsEditingDetails(false); setProjectData(template.projectData); }} className="px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium">Cancel</button>
                                        <button onClick={handleSaveDetails} className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium">Save</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingDetails(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto">
                                        <EditIcon />
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm">
                                {/* Project Name */}
                                <div className="md:col-span-2">
                                    <span className="font-medium text-slate-500">Project Name:</span>
                                    {isEditingDetails ? (
                                        <input type="text" value={projectData['Project Name'] || ''} onChange={(e) => handleDetailChange('Project Name', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Project Name']}</span>
                                    )}
                                </div>
                                {/* Client Email */}
                                <div>
                                    <span className="font-medium text-slate-500">Client Email:</span>
                                    {isEditingDetails ? (
                                        <input type="email" value={projectData['Client Email'] || ''} onChange={(e) => handleDetailChange('Client Email', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Client Email'] || 'N/A'}</span>
                                    )}
                                </div>
                                {/* Assigned Consultant */}
                                <div>
                                    <span className="font-medium text-slate-500">Assigned Consultant:</span>
                                    {isEditingDetails ? (
                                        <select value={projectData['Assigned Consultant'] || ''} onChange={(e) => handleDetailChange('Assigned Consultant', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            <option value="">-- Select --</option>
                                            {dropdownFields['Assigned Consultant'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Assigned Consultant']}</span>
                                    )}
                                </div>
                                
                                {/* --- ADDED FIELDS FOR PROJECT CREATION --- */}
                                <div>
                                    <span className="font-medium text-slate-500">Project Manager*:</span>
                                    {isEditingDetails ? (
                                        <>
                                            <select value={projectData['Project Manager'] || ''} onChange={(e) => handleDetailChange('Project Manager', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                                <option value="">-- Select --</option>
                                                {dropdownFields['Project Manager'].map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            {errors['Project Manager'] && <p className="text-red-500 text-xs mt-1">{errors['Project Manager']}</p>}
                                        </>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Project Manager'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Start Date*:</span>
                                    {isEditingDetails ? (
                                        <>
                                            <DatePicker
                                                selected={safeNewDate(projectData['Start Date'])}
                                                onChange={(date) => handleDetailChange('Start Date', date ? format(date, 'yyyy-MM-dd') : '')}
                                                dateFormat="yyyy-MM-dd"
                                                className="w-full mt-1 p-2 border rounded-md text-black"
                                                placeholderText="Pick a date"
                                            />
                                            {errors['Start Date'] && <p className="text-red-500 text-xs mt-1">{errors['Start Date']}</p>}
                                        </>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Start Date'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">State*:</span>
                                    {isEditingDetails ? (
                                        <>
                                            <select value={projectData['States'] || ''} onChange={(e) => handleDetailChange('States', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                                <option value="">-- Select --</option>
                                                {dropdownFields['States'].map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                            {errors['States'] && <p className="text-red-500 text-xs mt-1">{errors['States']}</p>}
                                        </>
                                    ) : (
                                         <span className="text-slate-800 ml-2">{projectData['States'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Project Type*:</span>
                                    {isEditingDetails ? (
                                        <>
                                            <select value={projectData['Project Type'] || ''} onChange={(e) => handleDetailChange('Project Type', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                                 <option value="">-- Select --</option>
                                                {dropdownFields['Project Type'].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            {errors['Project Type'] && <p className="text-red-500 text-xs mt-1">{errors['Project Type']}</p>}
                                        </>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Project Type'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Supervising Consultant:</span>
                                    {isEditingDetails ? (
                                        <select value={projectData['Supervising Consultant'] || ''} onChange={(e) => handleDetailChange('Supervising Consultant', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                            <option value="">-- Select --</option>
                                            {dropdownFields['Supervising Consultant'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Supervising Consultant'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Status:</span>
                                    {isEditingDetails ? (
                                        <select value={projectData['Status'] || ''} onChange={(e) => handleDetailChange('Status', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                             <option value="">-- Select --</option>
                                            {dropdownFields['Status'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Status'] || 'Not Set'}</span>
                                    )}
                                </div>
                                 <div>
                                    <span className="font-medium text-slate-500">Submitted (Y/N):</span>
                                    {isEditingDetails ? (
                                        <select value={projectData['Submitted (Y/N)'] || ''} onChange={(e) => handleDetailChange('Submitted (Y/N)', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black">
                                             <option value="">-- Select --</option>
                                            {dropdownFields['Submitted (Y/N)'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Submitted (Y/N)'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Full Cost:</span>
                                    {isEditingDetails ? (
                                        <input type="number" value={projectData['Full Cost'] || ''} onChange={(e) => handleDetailChange('Full Cost', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Full Cost'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-500">Paid:</span>
                                    {isEditingDetails ? (
                                        <input type="number" value={projectData['Paid'] || ''} onChange={(e) => handleDetailChange('Paid', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Paid'] || 'Not Set'}</span>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <span className="font-medium text-slate-500">IRS Identifier (ID/EIN):</span>
                                    {isEditingDetails ? (
                                        <input type="text" value={projectData['IRS Identifier (ID/EIN)'] || ''} onChange={(e) => handleDetailChange('IRS Identifier (ID/EIN)', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-black" />
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['IRS Identifier (ID/EIN)'] || 'Not Set'}</span>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Notes Section */}
                        <section className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                                <h2 className="text-lg font-semibold text-slate-700">📝 Notes</h2>
                                {!isEditingNotes && (
                                    <button onClick={() => setIsEditingNotes(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium self-start sm:self-auto">
                                        <EditIcon />
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                )}
                            </div>
                            {isEditingNotes ? (
                                <div className="space-y-3">
                                    <RichTextEditor
                                        isEditable={true}
                                        initialContent={''}
                                        onChange={(editorState) => {
                                            notesEditorRef.current = editorState;
                                        }}
                                        sourceTable="projects"
                                        sourceRecordId={projectData.id}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditingNotes(false)} className="text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-md">Done</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    {fromLexical(notesEditorRef.current) || 'No notes available.'}
                                </div>
                            )}
                        </section>
                        
                        {/* Tasks Section */}
                        <section className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">Tasks</h3>
                                {/* Add Task/Group functionality can be added later if needed */}
                            </div>
                            <DragDropContext onDragEnd={handleDragEnd}>
                                <Droppable droppableId="all-groups" type="GROUP">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                            {taskData.groups.map((group, index) => (
                                                <Draggable key={group.id} draggableId={group.id} index={index}>
                                                    {(provided) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps}>
                                                            <div className="p-3 md:p-2 rounded-lg bg-slate-100 border border-slate-200">
                                                                <div {...provided.dragHandleProps} className="flex justify-between items-center p-2 cursor-grab">
                                                                    <h4 className="font-bold text-slate-700 text-sm md:text-base">{group.name}</h4>
                                                                </div>
                                                                <Droppable droppableId={group.id} type="TASK">
                                                                    {(provided) => (
                                                                        <ul className="space-y-2 p-2 min-h-[50px]" {...provided.droppableProps} ref={provided.innerRef}>
                                                                            {group.tasks.map((task, index) => (
                                                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                                    {(provided) => (
                                                                                        <li
                                                                                            ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                                            onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }} // Re-enable when TemplateTaskCard is built
                                                                                            className="p-3 md:p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow min-h-[60px] flex items-center"
                                                                                        >
                                                                                            <div className="flex justify-between items-center w-full">
                                                                                                <h5 className="font-medium text-sm text-slate-800 flex-1 pr-2">{task.fields.task_title}</h5>
                                                                                                <div className="flex-shrink-0">
                                                                                                    {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
                                                                                                </div>
                                                                                            </div>
                                                                                        </li>
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                            {provided.placeholder}
                                                                        </ul>
                                                                    )}
                                                                </Droppable>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                                <div className="mt-4">
                                    <h4 className="font-bold text-slate-700 mb-2 p-2 text-sm md:text-base">Ungrouped Tasks</h4>
                                    <Droppable droppableId="ungrouped-tasks" type="TASK">
                                        {(provided) => (
                                            <ul className="space-y-2 p-2 min-h-[50px] bg-slate-50 rounded-lg border" {...provided.droppableProps} ref={provided.innerRef}>
                                                {taskData.ungroupedTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided) => (
                                                            <li
                                                                ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }} // Re-enable when TemplateTaskCard is built
                                                                className="p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow min-h-[60px] flex items-center"
                                                            >
                                                                <div className="flex justify-between items-center w-full">
                                                                    <h5 className="font-medium text-sm text-slate-800 flex-1 pr-2">{task.fields.task_title}</h5>
                                                                    <div className="flex-shrink-0">
                                                                        {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </ul>
                                        )}
                                    </Droppable>
                                </div>
                            </DragDropContext>
                        </section>
                    </div>
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        {/* Right column can be used for template instructions or other info */}
                        <section className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-700 mb-2">Using This Template</h2>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                You are currently viewing a project template. You can edit the project details, notes, and re-order tasks and groups. 
                                When you're ready, click the "Create" button in the top right. 
                                This will create a new project with your customizations, and the original template will remain unchanged.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            
            {isTaskCardVisible && (
                <TemplateTaskCard
                    task={selectedTask}
                    onClose={() => setIsTaskCardVisible(false)}
                    onTaskUpdate={handleTaskUpdate}
                    assigneeOptions={assigneeOptions}
                />
            )}
        </div>
    );
};
