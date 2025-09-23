import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../All.css';
import {
    STATES,
    PROJECT_TYPES
} from '../../utils/FormUtils/formConstants';
import { dummyProject } from '../../utils/projectTemplates';
import { generateProjectID } from '../../utils/projectUtils';
import { assignedConsultants_record_ids } from '../../utils/validations';
import { saveContent } from '../../utils/contentUtils';
import CustomSelect from '../../components/forms/CustomSelect';
import ApiCaller from '../../components/apiCall/ApiCaller';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const FormComponent = () => {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        agencyName: '',
        email: '',
        fullName: '',
        projectType: '',
        stateOfOperation: '',
        phone: '',
        consentName: '',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleMultiSelectChange = (name, value) => {
        setFormData(prev => {
            const currentValues = prev[name] || [];
            // Toggle selection
            if (currentValues.includes(value)) {
                return { ...prev, [name]: currentValues.filter(v => v !== value) };
            } else {
                return { ...prev, [name]: [...currentValues, value] };
            }
        });
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // --- Step 1: Basic Form Validation ---
        if (!formData.email) {
            alert("Please provide your email address.");
            setIsSubmitting(false);
            return;
        }

        if (!executeRecaptcha) {
            console.error('Recaptcha execute function not available yet.');
            alert('Recaptcha is not ready. Please try again in a moment.');
            setIsSubmitting(false);
            return;
        }

        // --- Step 2: reCAPTCHA Verification ---
        const recaptchaAction = 'submitIntroForm';
        const token = await executeRecaptcha(recaptchaAction);

        try {
            await ApiCaller('/check-recaptcha', {
                method: 'POST',
                body: JSON.stringify({
                    token,
                    recaptchaKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
                    recaptchaAction
                })
            });


            // --- Step 3: Fetch supplemental data (like task forms) ---
            const allForms = await ApiCaller('/all/task_forms');

            // Create a map for quick lookup
            const formsMap = new Map();

            if (allForms && Array.isArray(allForms)) {
                allForms.forEach(form => {
                    formsMap.set(form.fields.form_name, form);
                });
            }

            // --- Step 4: Select Template and Enrich Tasks ---
            const template = dummyProject;
            if (!template) {
                throw new Error(`The project template could not be loaded.`);
            }

            // Enrich tasks with full form data
            (template.tasks || []).forEach(task => {
                if (task.fields.preAttachedFormName && formsMap.has(task.fields.preAttachedFormName)) {
                    task.fields.attachedForm = formsMap.get(task.fields.preAttachedFormName);
                }
            });


            // --- Step 5: Prepare Project Data ---
            const projectData = {
                'Project Name': `${formData.fullName} - ${formData.agencyName}`,
                'Client Email': formData.email,
                'States': formData.stateOfOperation,
                'Assigned Consultant': 'Amara M Kamara',
                'Supervising Consultant': 'Amara M Kamara',
                'Start Date': new Date().toISOString().split('T')[0],
                'Project Type': formData.projectType,
                'Status': 'Preparatory Stage with Consultant',
                'Project Manager': 'Dave Logan',
                'Full Cost': 0, // Defaulting cost fields to 0
                'Paid': 0,
            };


            // --- Step 6: Execute Project Creation Logic (adapted from TemplateProjectCard) ---
            const projectID = await generateProjectID(projectData['States'], projectData['Project Type'], projectData['Start Date']);
            if (!projectID) {
                throw new Error("Failed to generate a Project ID.");
            }

            const projectToCreate = {
                ...projectData,
                'Project ID': projectID,
                'Balance': 0,
            };

            const assignedConsultantName = projectToCreate['Assigned Consultant'];
            if (assignedConsultantName && assignedConsultants_record_ids[assignedConsultantName]) {
                projectToCreate['collaborators'] = [assignedConsultants_record_ids[assignedConsultantName]];
            }

            const createProjectResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [{ fields: projectToCreate }],
                    tableName: 'projects'
                })
            });

            const newProjectRecord = createProjectResponse.records[0];
            const newProjectId = newProjectRecord.id;
            const newProjectIdentifier = newProjectRecord.fields['Project ID'];

            // Create client collaborator
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


            // Create task groups
            const groupsToCreate = (template.taskGroups || []).map(group => ({
                fields: { group_name: group.name, group_order: group.order, projectID: [newProjectId] }
            }));

            const createGroupsResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({ recordsToCreate: groupsToCreate, tableName: 'task_groups' })
            });

            const newGroupRecords = createGroupsResponse.records;
            const tempGroupToNewIdMap = new Map();
            (template.taskGroups || []).forEach((tempGroup, index) => {
                tempGroupToNewIdMap.set(tempGroup.id, newGroupRecords[index].id);
            });

            // Create tasks
            const allTasksFromTemplate = (template.tasks || []).map(task => {
                const finalGroupId = task.groupId ? tempGroupToNewIdMap.get(task.groupId) : null;
                return { ...task, finalGroupId };
            });

            const humanReadableIds = [];
            const tasksToCreatePayload = allTasksFromTemplate.map((task, index) => {
                let finalAssignee = task.fields.assigned_to;
                if (task.fields.assigned_to === 'Client') finalAssignee = newClientCollaboratorName;
                else if (task.fields.assigned_to === 'Consultant') finalAssignee = projectData['Assigned Consultant'];
                else if (task.fields.assigned_to === 'Supervising Consultant') finalAssignee = projectData['Supervising Consultant'];
                if (!finalAssignee) finalAssignee = projectData['Assigned Consultant'];

                const humanReadableId = `${newProjectIdentifier}-T${index + 1}`;
                humanReadableIds.push(humanReadableId);

                return {
                    fields: {
                        'project_id': [newProjectId],
                        'task_title': task.fields.task_title,
                        'task_status': task.fields.task_status || 'Not Started',
                        'order': task.fields.order || 0,
                        'task_groups': task.finalGroupId ? [task.finalGroupId] : [],
                        'assigned_to': finalAssignee,
                        'due_date': task.fields.due_date,
                        'start_date': task.fields.start_date || new Date().toISOString().split('T')[0],
                        'progress_bar': task.fields.progress_bar || 0,
                        'Action_type': task.fields.Action_type,
                        'tags': task.fields.tags
                    }
                };
            });


            const createTasksResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({ recordsToCreate: tasksToCreatePayload, tableName: 'tasks' })
            });
            const newTaskRecords = createTasksResponse.records;

            // Update tasks with human-readable IDs and save descriptions
            const updateAndSavePromises = newTaskRecords.map((newTask, index) => {
                const templateTask = allTasksFromTemplate[index];
                const updateIdPromise = ApiCaller(`/records/tasks/${newTask.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ fields: { id: humanReadableIds[index] } })
                });
                const saveDescPromise = templateTask.fields.description
                    ? saveContent('tasks', newTask.id, 'description', templateTask.fields.description)
                    : Promise.resolve();
                return Promise.all([updateIdPromise, saveDescPromise]);
            });
            await Promise.all(updateAndSavePromises);

            // --- Step 7: Create all task sub-items (checklists, attachments, etc.) ---
            const formSubmissionsToCreate = [];
            const checklistsToCreate = [];
            const attachmentsToCreate = [];
            const approvalsToCreate = [];

            allTasksFromTemplate.forEach((templateTask, index) => {
                const newTaskId = newTaskRecords[index].id;

                // Handle attached forms
                if (templateTask.fields.attachedForm?.fields?.task_forms_fields?.length > 0) {
                    templateTask.fields.attachedForm.fields.task_forms_fields.forEach(fieldId => {
                        
                            formSubmissionsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    form: [templateTask.fields.attachedForm.id],
                                    field: [fieldId],
                                    value: '--EMPTY--',
                                    submission: 'Incomplete'
                                }
                            });
                        }
                    );
                }

                // Handle checklist items
                if (templateTask.fields.checklistItems && Array.isArray(templateTask.fields.checklistItems) && templateTask.fields.checklistItems.length > 0) {
                    templateTask.fields.checklistItems.forEach(item => {
                        checklistsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                checklist_description: item.checklist_description || item,
                                completed: false
                            }
                        });
                    });
                }

                // Handle attachment placeholders
                if (templateTask.fields.attachments && Array.isArray(templateTask.fields.attachments) && templateTask.fields.attachments.length > 0) {
                    templateTask.fields.attachments.forEach(attachment => {
                        attachmentsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                attachment_description: attachment.attachment_description || attachment
                            }
                        });
                    });
                }

                // Handle approvals
                if (templateTask.fields.approvals && Array.isArray(templateTask.fields.approvals) && templateTask.fields.approvals.length > 0) {
                    templateTask.fields.approvals.forEach(approval => {
                        approvalsToCreate.push({
                            fields: {
                                task_id: [newTaskId],
                                approval_description: approval.approval_description ||
                                    approval.fields?.approval_description ||
                                    approval
                            }
                        });
                    });
                }
            });

            // Create all sub-items in parallel
            const createPromises = [];

            if (formSubmissionsToCreate.length > 0) {
                createPromises.push(
                    ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify({
                            recordsToCreate: formSubmissionsToCreate,
                            tableName: 'task_forms_submissions'
                        })
                    })
                );
            }

            if (checklistsToCreate.length > 0) {
                createPromises.push(
                    ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify({
                            recordsToCreate: checklistsToCreate,
                            tableName: 'task_checklists'
                        })
                    })
                );
            }

            if (attachmentsToCreate.length > 0) {
                createPromises.push(
                    ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify({
                            recordsToCreate: attachmentsToCreate,
                            tableName: 'task_attachments'
                        })
                    })
                );
            }

            if (approvalsToCreate.length > 0) {
                createPromises.push(
                    ApiCaller('/records', {
                        method: 'POST',
                        body: JSON.stringify({
                            recordsToCreate: approvalsToCreate,
                            tableName: 'task_approval'
                        })
                    })
                );
            }




            
            console.log(formData)
            await Promise.all(createPromises);


            // --- Step 9: Navigate to Success Page ---
            navigate('/submission-success', {
                state: {
                    projectId: newProjectIdentifier,
                    projectName: projectData['Project Name']
                }
            });

        } catch (error) {
            console.error('Submission failed:', error);
            alert(`An error occurred during submission: ${error.message}. Please check the console and try again.`);
        } finally {
            setIsSubmitting(false);
        }
    }, [executeRecaptcha, formData, navigate]);

    // Helper function to create project from template
    const createProjectFromTemplate = async (template, projectData, formData) => {
        try {
            // --- Step 6: Execute Project Creation Logic ---
            const projectID = await generateProjectID(projectData['States'], projectData['Project Type'], projectData['Start Date']);
            if (!projectID) {
                throw new Error("Failed to generate a Project ID.");
            }

            const projectToCreate = {
                ...projectData,
                'Project ID': projectID,
                'Balance': 0,
            };

            const assignedConsultantName = projectToCreate['Assigned Consultant'];
            if (assignedConsultantName && assignedConsultants_record_ids[assignedConsultantName]) {
                projectToCreate['collaborators'] = [assignedConsultants_record_ids[assignedConsultantName]];
            }

            // Log the project data being sent to the API
            console.log('Project data being sent:', {
                recordsToCreate: [{ fields: projectToCreate }],
                tableName: 'projects'
            });

            let createProjectResponse;
            try {
                createProjectResponse = await ApiCaller('/records', {
                    method: 'POST',
                    body: JSON.stringify({
                        recordsToCreate: [{ fields: projectToCreate }],
                        tableName: 'projects'
                    })
                });

                console.log('Project creation successful:', createProjectResponse);
            } catch (error) {
                console.error('Error creating project:', error);
                console.error('Project data that failed:', projectToCreate);
                throw new Error(`Failed to create project: ${error.message}`);
            }

            const newProjectRecord = createProjectResponse.records[0];
            const newProjectId = newProjectRecord.id;
            const newProjectIdentifier = newProjectRecord.fields['Project ID'];

            // Create client collaborator
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

            // Submit the form data and navigate to success page
            await submitFormAndNavigate(formData, newProjectIdentifier, projectData['Project Name']);

        } catch (error) {
            throw error;
        }
    };

    // Helper function to submit form data and navigate to success page
    const submitFormAndNavigate = async (formData, projectId, projectName) => {
        console.log('Submitting form data:', formData);

        try {
            // Use the generic form submission endpoint that we know exists
            await ApiCaller('/submit-intro-form', {
                method: 'POST',
                body: JSON.stringify({
                    formData: formData,
                    formType: 'enrollment' // Add a type identifier so the backend knows which form it is
                })
            });

            // Navigate to success page
            navigate('/submission-success', {
                state: {
                    projectId: projectId,
                    projectName: projectName
                }
            });
        } catch (error) {
            console.error('Error submitting form data:', error);
            console.log('Continuing to navigate to success page despite form submission error');

            // Navigate to success page even if form submission fails
            navigate('/submission-success', {
                state: {
                    projectId: projectId,
                    projectName: projectName
                }
            });
        }
    };

    // Helper function to create tasks and groups
    const createTasksAndGroups = async (template, newProjectId, newProjectIdentifier, projectData, newClientCollaboratorName, formData) => {
        try {
            console.log('Starting task and group creation...');
            console.log('Template:', template);
            console.log('Template task groups:', template.taskGroups);
            console.log('Template tasks:', template.tasks);

            // Check if template has task groups
            if (!template.taskGroups || template.taskGroups.length === 0) {
                console.log('No task groups found in template. Skipping task group creation.');
                // Submit form data and navigate even if there are no task groups
                await submitFormAndNavigate(formData, newProjectIdentifier, projectData['Project Name']);
                return; // Exit early if no task groups
            }

            // Create task groups
            const groupsToCreate = (template.taskGroups || []).map(group => ({
                fields: { group_name: group.name, group_order: group.order, projectID: [newProjectId] }
            }));

            console.log('Creating task groups:', groupsToCreate);

            let createGroupsResponse;
            try {
                createGroupsResponse = await ApiCaller('/records', {
                    method: 'POST',
                    body: JSON.stringify({ recordsToCreate: groupsToCreate, tableName: 'task_groups' })
                });
                console.log('Task groups created successfully:', createGroupsResponse);
            } catch (error) {
                console.error('Failed to create task groups:', error);
                throw new Error(`Failed to create task groups: ${error.message}`);
            }

            const newGroupRecords = createGroupsResponse.records;
            const tempGroupToNewIdMap = new Map();
            (template.taskGroups || []).forEach((tempGroup, index) => {
                tempGroupToNewIdMap.set(tempGroup.id, newGroupRecords[index].id);
            });

            // Check if template has tasks
            if (!template.tasks || template.tasks.length === 0) {
                console.log('No tasks found in template. Skipping task creation.');
                // Submit form data and navigate even if there are no tasks
                await submitFormAndNavigate(formData, newProjectIdentifier, projectData['Project Name']);
                return; // Exit early if no tasks
            }

            // Create tasks
            const allTasksFromTemplate = (template.tasks || []).map(task => {
                const finalGroupId = task.groupId ? tempGroupToNewIdMap.get(task.groupId) : null;
                return { ...task, finalGroupId };
            });

            const humanReadableIds = [];
            const tasksToCreatePayload = allTasksFromTemplate.map((task, index) => {
                let finalAssignee = task.fields.assigned_to;
                if (task.fields.assigned_to === 'Client') finalAssignee = newClientCollaboratorName;
                else if (task.fields.assigned_to === 'Consultant') finalAssignee = projectData['Assigned Consultant'];
                else if (task.fields.assigned_to === 'Supervising Consultant') finalAssignee = projectData['Supervising Consultant'];
                if (!finalAssignee) finalAssignee = projectData['Assigned Consultant'];

                const humanReadableId = `${newProjectIdentifier}-T${index + 1}`;
                humanReadableIds.push(humanReadableId);

                return {
                    fields: {
                        'project_id': [newProjectId],
                        'task_title': task.fields.task_title || `Task ${index + 1}`,
                        'task_status': task.fields.task_status || 'Not Started',
                        'order': task.fields.order || 0,
                        'task_groups': task.finalGroupId ? [task.finalGroupId] : [],
                        'assigned_to': finalAssignee,
                        'due_date': task.fields.due_date,
                        'start_date': task.fields.start_date || new Date().toISOString().split('T')[0],
                        'progress_bar': task.fields.progress_bar || 0,
                        'Action_type': task.fields.Action_type || 'Default',
                        'tags': task.fields.tags
                    }
                };
            });

            console.log('Creating tasks:', tasksToCreatePayload);

            let createTasksResponse;
            try {
                createTasksResponse = await ApiCaller('/records', {
                    method: 'POST',
                    body: JSON.stringify({ recordsToCreate: tasksToCreatePayload, tableName: 'tasks' })
                });
                console.log('Tasks created successfully:', createTasksResponse);
            } catch (error) {
                console.error('Failed to create tasks:', error);
                console.error('Task payload that failed:', tasksToCreatePayload);
                throw new Error(`Failed to create tasks: ${error.message}`);
            }

            const newTaskRecords = createTasksResponse.records;

            // Update tasks with human-readable IDs and save descriptions
            const updateAndSavePromises = newTaskRecords.map((newTask, index) => {
                const templateTask = allTasksFromTemplate[index];
                const updateIdPromise = ApiCaller(`/records/tasks/${newTask.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ fields: { id: humanReadableIds[index] } })
                });
                const saveDescPromise = templateTask.fields.description
                    ? saveContent('tasks', newTask.id, 'description', templateTask.fields.description)
                    : Promise.resolve();
                return Promise.all([updateIdPromise, saveDescPromise]);
            });
            await Promise.all(updateAndSavePromises);

            // Since createSubItemsAndSubmitForm was removed, we'll handle task sub-items here
            console.log('Creating task sub-items...');

            try {
                // --- Step 7: Create all task sub-items (checklists, attachments, etc.) ---
                const formSubmissionsToCreate = [];
                const checklistsToCreate = [];
                const attachmentsToCreate = [];
                const approvalsToCreate = [];

                allTasksFromTemplate.forEach((templateTask, index) => {
                    const newTaskId = newTaskRecords[index].id;

                    // Handle attached forms
                    if (templateTask.fields.attachedForm?.fields?.task_forms_fields?.length > 0) {
                        templateTask.fields.attachedForm.fields.task_forms_fields.forEach(fieldId => {
                            formSubmissionsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    form: [templateTask.fields.attachedForm.id],
                                    field: [fieldId],
                                    value: '--EMPTY--',
                                    submission: 'Incomplete'
                                }
                            });
                        });
                    }

                    // Handle checklist items
                    if (templateTask.fields.checklistItems && Array.isArray(templateTask.fields.checklistItems) && templateTask.fields.checklistItems.length > 0) {
                        templateTask.fields.checklistItems.forEach(item => {
                            checklistsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    checklist_description: item.checklist_description || item,
                                    completed: false
                                }
                            });
                        });
                    }

                    // Handle attachment placeholders
                    if (templateTask.fields.attachments && Array.isArray(templateTask.fields.attachments) && templateTask.fields.attachments.length > 0) {
                        templateTask.fields.attachments.forEach(attachment => {
                            attachmentsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    attachment_description: attachment.attachment_description || attachment
                                }
                            });
                        });
                    }

                    // Handle approvals
                    if (templateTask.fields.approvals && Array.isArray(templateTask.fields.approvals) && templateTask.fields.approvals.length > 0) {
                        templateTask.fields.approvals.forEach(approval => {
                            approvalsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    approval_description: approval.approval_description ||
                                        approval.fields?.approval_description ||
                                        approval
                                }
                            });
                        });
                    }
                });

                // Create all sub-items in parallel
                const createPromises = [];

                if (formSubmissionsToCreate.length > 0) {
                    createPromises.push(
                        ApiCaller('/records', {
                            method: 'POST',
                            body: JSON.stringify({
                                recordsToCreate: formSubmissionsToCreate,
                                tableName: 'task_forms_submissions'
                            })
                        })
                    );
                }

                if (checklistsToCreate.length > 0) {
                    createPromises.push(
                        ApiCaller('/records', {
                            method: 'POST',
                            body: JSON.stringify({
                                recordsToCreate: checklistsToCreate,
                                tableName: 'task_checklists'
                            })
                        })
                    );
                }

                if (attachmentsToCreate.length > 0) {
                    createPromises.push(
                        ApiCaller('/records', {
                            method: 'POST',
                            body: JSON.stringify({
                                recordsToCreate: attachmentsToCreate,
                                tableName: 'task_attachments'
                            })
                        })
                    );
                }

                if (approvalsToCreate.length > 0) {
                    createPromises.push(
                        ApiCaller('/records', {
                            method: 'POST',
                            body: JSON.stringify({
                                recordsToCreate: approvalsToCreate,
                                tableName: 'task_approval'
                            })
                        })
                    );
                }

                if (createPromises.length > 0) {
                    await Promise.all(createPromises);
                }


            } catch (error) {
                console.error('Error creating task sub-items:', error);
                // Continue with form submission even if sub-items fail
            }

        } catch (error) {
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-gray-800">
            <div className="container mx-auto p-4 md:p-8">

                <header className="bg-black py-8 mb-12 flex justify-center rounded-lg">
                    <img src="https://storage.googleapis.com/waivergroup_uploads/1758117318568-image.png" alt="The Waiver Consulting Group" className="h-16 object-contain" />
                </header>

                <main className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-yellow-500 mb-8">Project Introduction</h2>

                    <img src="https://storage.googleapis.com/waivergroup_uploads/1756908272203-VENDOR.jpg" alt="Waiver Consulting Group Team" className="w-full rounded-lg mb-12" />

                    <section className="mb-12">
                        <h3 className="text-3xl font-bold text-yellow-500 mb-4 text-center">PROJECT INTRODUCTION</h3>
                        <p className="text-gray-600 mb-4">
                            This form helps us understand your project needs and goals. Completing it accurately allows us to provide customized guidance for your project process, whether it's for Medicaid, Medicare, or managed care organizations. The information you provide helps us identify the right project pathways and requirements specific to your agency type and the states where you operate.
                        </p>
                        <p className="text-gray-500 text-sm">
                            After submitting this form, you'll be connected with an enrollment specialist who will review your information and provide guidance on the next steps in your enrollment journey.
                        </p>
                    </section>

                    <div className="bg-gray-800 p-8 rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Basic Information */}
                            <div>
                                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-300 mb-1">Your Agency/Practice Name <span className="text-red-500">*</span></label>
                                <input type="text" name="agencyName" id="agencyName" value={formData.agencyName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Your Email <span className="text-red-500">*</span></label>
                                <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">First & Last Name <span className="text-red-500">*</span></label>
                                <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>


                            {/* Agency Overview Section */}
                            <div className="pt-6 border-t border-gray-700">
                                <div>
                                    <CustomSelect
                                        label="SELECT STATE OF YOUR PROGRAM"
                                        options={STATES}
                                        selected={formData.stateOfOperation}
                                        setSelected={(value) => setFormData(prev => ({ ...prev, stateOfOperation: value }))}
                                        required
                                    />
                                </div>

                                <div className="mt-4">
                                    <CustomSelect
                                        label="PROJECT TYPE"
                                        options={PROJECT_TYPES}
                                        selected={formData.projectType}
                                        setSelected={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
                                        required
                                    />
                                </div>

                            </div>

                            <div className="flex justify-center pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-lg font-bold rounded-md text-gray-800 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-gray-800 disabled:bg-yellow-200 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Form'}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
                <footer className="text-center mt-12">
                    <p className="text-gray-500 text-sm">Privacy Policy</p>
                </footer>
            </div>
        </div>
    );
};

const EnrollmentIntroPage = () => {
    return (
        <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
            <FormComponent />
        </GoogleReCaptchaProvider>
    );
};

export default EnrollmentIntroPage;
