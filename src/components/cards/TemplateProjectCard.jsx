import React, { useState, useCallback, useMemo, useRef } from 'react';
import TemplateTaskCard from './TemplateTaskCard'; // Will be created in the next step
import AddTaskToProjectForm from '../forms/AddTaskToProjectForm';
import AddCollaboratorForm from '../forms/AddCollaboratorForm';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { dropdownFields, DEFAULT_ACTIVITIES, safeNewDate } from '../../utils/validations';
import { useAuth } from '../../utils/AuthContext';
import ApiCaller from '../apiCall/ApiCaller';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toLexical, fromLexical } from '../../utils/lexicalUtils';
import RichTextEditor from '../richText/RichTextEditor';

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
    
    // Simplified states as many sections are not needed for a template
    const [selectedTask, setSelectedTask] = useState(null);
    const [isTaskCardVisible, setIsTaskCardVisible] = useState(false);
    const [isAddTaskFormVisible, setIsAddTaskFormVisible] = useState(false);

    const assigneeOptions = useMemo(() => {
        const options = new Set();
        if (projectData['Assigned Consultant']) options.add(projectData['Assigned Consultant']);
        // Add other potential assignees if your logic requires it (e.g., from a collaborators list)
        return Array.from(options).filter(Boolean);
    }, [projectData]);

    // This function will be responsible for creating the project on the backend
    const handleCreateProject = async () => {
        setIsCreatingProject(true);
        try {
            // Step 1: Create the main project record.
            const projectToCreate = { ...projectData, Notes: notesEditorRef.current };
            const createProjectResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [{ fields: projectToCreate }],
                    tableName: 'projects'
                })
            });

            const newProjectRecord = createProjectResponse.records[0];
            const newProjectId = newProjectRecord.id;

            // Step 2: Create the task groups, linking them to the new project.
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

            // Step 3: Create all tasks, along with their associated sub-items.
            const allTasksFromTemplate = [
                ...taskData.groups.flatMap(group => 
                    group.tasks.map(task => ({ ...task, finalGroupId: tempGroupToNewIdMap.get(task.groupId) }))
                ),
                ...taskData.ungroupedTasks.map(task => ({ ...task, finalGroupId: null }))
            ];

            // A single batch create for all tasks
            const tasksToCreatePayload = allTasksFromTemplate.map(task => ({
                fields: {
                    ...task.fields,
                    // Remove local-only fields before sending to API
                    checklistItems: undefined,
                    attachedForm: undefined,
                    attachments: undefined,
                    // Link to new records
                    'Project ID': [newProjectId],
                    'task_groups': task.finalGroupId ? [task.finalGroupId] : []
                }
            }));

            if (tasksToCreatePayload.length === 0) {
                alert('Project created successfully! (No tasks to add)');
                onClose();
                return;
            }

            const createTasksResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: tasksToCreatePayload,
                    tableName: 'tasks'
                })
            });
            const newTaskRecords = createTasksResponse.records;

            // Step 4: Now that tasks are created, create all their sub-items in batch.
            const checklistsToCreate = [];
            const attachmentsToCreate = [];
            const formSubmissionsToCreate = [];

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
                                    task_id: [newTaskId], // Changed 'task' to 'task_id'
                                    form: [templateTask.fields.attachedForm.id],
                                    Notes: [fieldId], // Linking to the 'task_forms_fields' record
                                    value: '--EMPTY--',
                                    submission: 'Incomplete'
                                }
                            });
                        });
                    }
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
        setProjectData(prev => ({ ...prev, [field]: value }));
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
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
            <header className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0 bg-white">
                <button onClick={onClose} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-300 shadow-sm transition-all duration-200" aria-label="Back">
                    <BackIcon />
                    <span className="hidden sm:inline">Back to Templates</span>
                </button>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800">{projectData['Project Name']}</h1>
                    <p className="text-xs text-slate-500 font-mono">Template Preview</p>
                </div>
                <button 
                    onClick={handleCreateProject} 
                    disabled={isCreatingProject}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium disabled:bg-emerald-400"
                >
                    {isCreatingProject ? 'Creating...' : 'Create Project'}
                </button>
            </header>

            <main className="flex-grow p-6 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
                    <div className="lg:col-span-3 space-y-6">
                        {/* Project Details Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-slate-700">Project Details</h2>
                                {isEditingDetails ? (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { setIsEditingDetails(false); setProjectData(template.projectData); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium">Cancel</button>
                                        <button onClick={handleSaveDetails} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium">Save</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingDetails(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
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
                                            {dropdownFields['Assigned Consultant'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span className="text-slate-800 ml-2">{projectData['Assigned Consultant']}</span>
                                    )}
                                </div>
                                {/* Other fields... */}
                            </div>
                        </section>

                        {/* Notes Section */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold text-slate-700">📝 Notes</h2>
                                {!isEditingNotes && (
                                    <button onClick={() => setIsEditingNotes(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                                        <EditIcon />
                                    </button>
                                )}
                            </div>
                            {isEditingNotes ? (
                                <div className="space-y-3">
                                    <RichTextEditor
                                        isEditable={true}
                                        initialContent={notesEditorRef.current}
                                        onChange={(editorState) => {
                                            notesEditorRef.current = editorState;
                                        }}
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
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
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
                                                            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                                                                <div {...provided.dragHandleProps} className="flex justify-between items-center p-2 cursor-grab">
                                                                    <h4 className="font-bold text-slate-700">{group.name}</h4>
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
                                                                                            className="p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer"
                                                                                        >
                                                                                            <div className="flex justify-between items-center">
                                                                                                <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
                                                                                                {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
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
                                    <h4 className="font-bold text-slate-700 mb-2 p-2">Ungrouped Tasks</h4>
                                    <Droppable droppableId="ungrouped-tasks" type="TASK">
                                        {(provided) => (
                                            <ul className="space-y-2 p-2 min-h-[50px] bg-slate-50 rounded-lg border" {...provided.droppableProps} ref={provided.innerRef}>
                                                {taskData.ungroupedTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided) => (
                                                            <li
                                                                ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                                                onClick={() => { setSelectedTask(task); setIsTaskCardVisible(true); }} // Re-enable when TemplateTaskCard is built
                                                                className="p-3 bg-white rounded-md shadow-sm border border-slate-200 cursor-pointer"
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <h5 className="font-medium text-sm text-slate-800">{task.fields.task_title}</h5>
                                                                    {task.fields.task_status === 'Completed' ? <CompletedIcon /> : <IncompleteIcon />}
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
                    <div className="lg:col-span-2 space-y-6">
                        {/* Right column can be used for template instructions or other info */}
                        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-700 mb-2">Using This Template</h2>
                            <p className="text-sm text-slate-600">
                                You are currently viewing a project template. You can edit the project details, notes, and re-order tasks and groups. 
                                When you're ready, click the "Create Project" button in the top right. 
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
