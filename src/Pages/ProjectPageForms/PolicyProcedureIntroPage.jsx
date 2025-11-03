import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../All.css';
import { STATES, MANUAL_PURPOSES, POPULATIONS_SERVED_POLICY, START_TIMES } from '../../utils/FormUtils/formConstants';
import { customizedPolicy } from '../../utils/projectTemplates'; // Import dummyProject directly
import { generateProjectID } from '../../utils/projectUtils';
import { assignedConsultants_record_ids } from '../../utils/validations';
import { saveContent } from '../../utils/contentUtils';
import CustomSelect from '../../components/forms/CustomSelect';
import ApiCaller from '../../components/apiCall/ApiCaller';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import CalendarAvailability from '../../components/CalendarAvailability';


const FormComponent = () => {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        yourEmail: '',
        stateOfProgram: '',
        manualPurpose: '',
        programService: '',
        populationToServe: '',
        agencyName: '',
        phone: '',
        howSoon: '',
        consentName: '',
        reasonForThisMeeting: '',
        meetingDate: null,
    });


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: typeof value === 'string' ? value.trim() : value
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({ ...prev, meetingDate: date }));
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // --- Step 1: Basic Form Validation ---

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
            const fieldDetailsMap = new Map(); // New map for field details

            if (allForms && Array.isArray(allForms)) {
                allForms.forEach(form => {
                    formsMap.set(form.fields.form_name, form);
                });

                // Fetch all field details
                const allFieldIds = allForms.flatMap(form => form.fields.task_forms_fields || []);
                if (allFieldIds.length > 0) {
                    try {
                        const formFieldsResponse = await ApiCaller('/records/by-ids', {
                            method: 'POST',
                            body: JSON.stringify({
                                recordIds: allFieldIds,
                                tableName: 'task_forms_fields'
                            })
                        });

                        formFieldsResponse.records.forEach(field => {
                            fieldDetailsMap.set(field.id, {
                                id: field.id,
                                label: field.fields.field_label,
                                type: field.fields.field_type
                            });
                        });
                    } catch (error) {
                        console.error('Failed to fetch field details:', error);
                    }
                }
            }

            // --- Step 4: Select Template and Enrich Tasks ---
            const template = customizedPolicy;
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
                'Project Name': `${(formData.firstName || '').trim()} ${(formData.lastName || '').trim()}`,
                'Client Email': formData.yourEmail,
                'States': formData.stateOfProgram,
                'Assigned Consultant': 'Amara M Kamara',
                'Supervising Consultant': 'Amara M Kamara',
                'Start Date': new Date().toISOString().split('T')[0],
                'Project Type': 'Policy & Procedure Manual',
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
                        if (templateTask.fields.preAttachedFormName === 'Policy_procedure_getting_started') {
                            const fieldLabel = fieldDetailsMap.get(fieldId)?.label || fieldId;
                            console.log(`Processing field: ${fieldLabel} (ID: ${fieldId})`);

                            let value;
                            switch (fieldLabel) {
                                case 'First Name':
                                    value = formData.firstName;
                                    break;
                                case 'Last Name':
                                    value = formData.lastName;
                                    break;
                                case 'Your Email':
                                    value = formData.yourEmail;
                                    break;
                                case 'Your Phone #':
                                    value = formData.phone;
                                    break;
                                case 'For Which State Do You Need The Policy Manual?':
                                    value = formData.stateOfProgram;
                                    break;
                                case 'For What Purpose Do You Need The Manual?':
                                    value = formData.manualPurpose;
                                    break;
                                case 'Describe Your Program/Service Type':
                                    value = formData.programService;
                                case 'Your Primary Population':
                                    value = formData.populationToServe;
                                    break;
                                case 'Organization Name (Registered Or Proposed)':
                                    value = formData.agencyName;
                                    break;
                                case'How Urgently Do You Need the Manual?':
                                    value = formData.howSoon;
                                    break;
                                case ' Consent':
                                    value = formData.consentName;
                                    break;
                                default:
                                    value = '--EMPTY--';
                            }
                            formSubmissionsToCreate.push({
                                fields: {
                                    task_id: [newTaskId],
                                    form: [templateTask.fields.attachedForm.id],
                                    field: [fieldId],
                                    value: value,
                                    submission: 'Completed'
                                }
                            });

                        } else {
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

            // --- Step 8: Create Calendar Event ---
            // if (formData.meetingDate) {
            //     try {
            //         await ApiCaller('/calendar/create-event', {
            //             method: 'POST',
            //             body: JSON.stringify(formData) // Send the whole form data
            //         });
            //     } catch (calendarError) {
            //         console.error('Failed to create calendar event:', calendarError);
            //         // Decide if this should be a fatal error or just a warning
            //         // For now, we'll log it and continue
            //     }
            // }

            createPromises.push(
                ApiCaller('/submit-Policy-intro-form', {
                    method: 'POST',
                    body: JSON.stringify({
                        formData: formData
                    })
                })
            );
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

    return (
        <div className="min-h-screen bg-slate-100 text-gray-800">
            <div className="container mx-auto p-4 md:p-8">

                <header className="bg-black py-8 mb-12 flex justify-center rounded-lg">
                    <img src="https://storage.googleapis.com/waivergroup_uploads/1758117318568-image.png" alt="The Waiver Consulting Group" className="h-16 object-contain" />
                </header>

                <main className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-yellow-500 mb-8">Let's Collaborate On Your Vision</h2>

                    <img src="https://storage.googleapis.com/waivergroup_uploads/1756908272203-VENDOR.jpg" alt="Waiver Consulting Group Team" className="w-full rounded-lg mb-12" />

                    <section className="mb-12">
                        <h3 className="text-3xl font-bold text-yellow-500 mb-4 text-center">GETTING STARTED</h3>
                        <p className="text-gray-600 mb-4">
                            This is the first and most important step in beginning your journey with Waiver Consulting Group LLC. Completing the form accurately is essential—it enables us to provide custom-tailored support, expedite your onboarding, assign your project internally, and load the appropriate tasks into your Client Portal. Accurate entries also help avoid delays and redundant questions, improve the quality of your intake consultation, and ensure that all regulatory and waiver-specific requirements are identified early.
                        </p>
                        <p className="text-gray-500 text-sm">
                            When you have completed and submitted this form, you will receive an invite to our Client Portal where you will be assigned a License Specialist who will answer your questions, provide you with information, and help you get started with launching your program.
                        </p>
                    </section>

                    <div className="bg-gray-800 p-8 rounded-lg">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">FIRST NAME <span className="text-red-500">*</span></label>
                                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">LAST NAME <span className="text-red-500">*</span></label>
                                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <div>
                                <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-300 mb-1">Your Email <span className="text-red-500">*</span></label>
                                <input type="email" name="yourEmail" id="yourEmail" value={formData.yourEmail} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">PHONE # <span className="text-red-500">*</span></label>
                                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <CustomSelect
                                label="SELECT STATE OF YOUR PROGRAM"
                                options={STATES}
                                selected={formData.stateOfProgram}
                                setSelected={(value) => setFormData(prev => ({ ...prev, stateOfProgram: value }))}
                                required
                            />

                            <CustomSelect
                                label="For What Purpose Do You Need The Manual?"
                                options={MANUAL_PURPOSES}
                                selected={formData.manualPurpose}
                                setSelected={(value) => setFormData(prev => ({ ...prev, manualPurpose: value }))}
                                required
                            />

                            <div>
                                <label htmlFor="programService" className="block text-sm font-medium text-gray-300 mb-1">Describe Your Program/Service Type <span className="text-red-500">*</span></label>
                                <textarea name="programService" id="programService" rows="4" value={formData.programService} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white"></textarea>
                            </div>

                            <CustomSelect
                                label="Your Primary Population"
                                options={POPULATIONS_SERVED_POLICY}
                                selected={formData.populationToServe}
                                setSelected={(value) => setFormData(prev => ({ ...prev, populationToServe: value }))}
                                required
                            />

                            <div>
                                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-300 mb-1">Organization Name (Registered Or Proposed)<span className="text-red-500">*</span></label>
                                <input type="text" name="agencyName" id="agencyName" value={formData.agencyName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
                            </div>

                            <CustomSelect
                                label="How Soon Are You Looking Start?"
                                options={START_TIMES}
                                selected={formData.howSoon}
                                setSelected={(value) => setFormData(prev => ({ ...prev, howSoon: value }))}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">The Next Step After Submitting This Form May Be An Initial Google Meet/Zoom Meeting. Please select a date and time that works for you <span className="text-red-500">*</span></label>
                                <CalendarAvailability
                                    onTimeSlotSelect={(slot) => handleDateChange(slot)}
                                />
                            </div>

                            <div>
                                <label htmlFor="reasonForThisMeeting" className="block text-sm font-medium text-gray-300 mb-1">What do you hope to accomplish through this meeting? <span className="text-red-500">*</span></label>
                                <textarea name="reasonForThisMeeting" id="reasonForThisMeeting" rows="4" value={formData.reasonForThisMeeting} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white"></textarea>
                            </div>

                            <div>
                                <label htmlFor="consentName" className="block text-sm font-medium text-gray-300 mb-1">CONSENT: I consent to being contacted via phone calls, texts or emails by Waiver Consulting Group for further discussion or consultation. (Enter Your Name Below To Contact From Waiver Group) <span className="text-red-500">*</span></label>
                                <input type="text" name="consentName" id="consentName" value={formData.consentName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" />
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

const CombinedLicenseIntroPage = () => {
    // Wrap the form component with the reCAPTCHA provider
    return (
        <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
            <FormComponent />
        </GoogleReCaptchaProvider>
    );
};

export default CombinedLicenseIntroPage;
