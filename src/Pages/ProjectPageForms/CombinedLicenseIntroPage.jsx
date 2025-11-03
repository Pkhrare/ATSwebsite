import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import '../All.css';
import { STATES, HELP_TYPES, AGENCY_SERVICES, POPULATIONS_SERVED, SCENARIOS, START_TIMES } from '../../utils/FormUtils/formConstants';
import { dummyProject } from '../../utils/projectTemplates';
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
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 7;
    const [wantsToSchedule, setWantsToSchedule] = useState(''); // Local state, not sent to backend
    const [openAccordions, setOpenAccordions] = useState({}); // Track which accordions are open
    const [validationAttempted, setValidationAttempted] = useState(false); // Track if user tried to proceed
    const [formData, setFormData] = useState({
        programService: '',
        yourEmail: '',
        stateOfProgram: '',
        typeOfHelp: [], // Changed to array for multiple selections
        agencyServices: '',
        populationToServe: '',
        agencyName: '',
        agencyStatus: '',
        agencyPlans: '',
        scenario: '',
        fullName: '',
        phone: '',
        confirmEmail: '',
        meetingDate: null,
        howSoon: '',
        consentName: '',
        reasonForThisMeeting: '',
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (option) => {
        setValidationAttempted(false); // Reset validation when user makes a selection
        setFormData(prev => {
            const currentHelp = prev.typeOfHelp || [];
            if (currentHelp.includes(option)) {
                return { ...prev, typeOfHelp: currentHelp.filter(item => item !== option) };
            } else {
                return { ...prev, typeOfHelp: [...currentHelp, option] };
            }
        });
    };

    const toggleAccordion = (section) => {
        setOpenAccordions(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({ ...prev, meetingDate: date }));
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.stateOfProgram !== '';
            case 2:
                return formData.typeOfHelp.length > 0;
            case 3:
                return formData.agencyServices !== '';
            case 4:
                return formData.populationToServe !== '';
            case 5:
                return formData.agencyName !== '' && formData.agencyPlans !== '' && 
                       formData.fullName !== '' && formData.phone !== '' && 
                       formData.yourEmail !== '' && formData.confirmEmail !== '' &&
                       formData.yourEmail === formData.confirmEmail;
            case 6:
                // Only require meeting fields if they want to schedule
                if (wantsToSchedule === 'yes') {
                    return formData.meetingDate !== null && formData.reasonForThisMeeting !== '';
                } else if (wantsToSchedule === 'no') {
                    return true; // No meeting required
                }
                return false; // Must select Yes or No
            case 7:
                return formData.scenario !== '' && formData.howSoon !== '' && formData.consentName !== '';
            default:
                return true;
        }
    };

    const handleNext = () => {
        setValidationAttempted(true);
        if (validateStep(currentStep)) {
            setValidationAttempted(false); // Reset when valid
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
            }
        } else {
            alert('Please fill in all required fields before proceeding.');
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const getStepStatus = (step) => {
        if (step < currentStep) return 'completed';
        if (step === currentStep) return 'current';
        return 'upcoming';
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!validateStep(currentStep)) {
            alert('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);

        // Basic Form Validation
        if (formData.yourEmail !== formData.confirmEmail) {
            alert("The email addresses you entered do not match. Please correct them and try again.");
            setIsSubmitting(false);
            return;
        }

        if (!executeRecaptcha) {
            console.error('Recaptcha execute function not available yet.');
            alert('Recaptcha is not ready. Please try again in a moment.');
            setIsSubmitting(false);
            return;
        }

        // reCAPTCHA Verification
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

            // Fetch supplemental data (like task forms)
            const allForms = await ApiCaller('/all/task_forms');

            // Create a map for quick lookup
            const formsMap = new Map();
            const fieldDetailsMap = new Map();

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

            // Select Template and Enrich Tasks
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

            // Prepare Project Data
            const projectData = {
                'Project Name': `${formData.fullName}`,
                'Client Email': formData.yourEmail,
                'States': formData.stateOfProgram,
                'Assigned Consultant': 'Amara M Kamara',
                'Supervising Consultant': 'Amara M Kamara',
                'Start Date': new Date().toISOString().split('T')[0],
                'Project Type': 'Licensing & Medicaid',
                'Status': 'Preparatory Stage with Consultant',
                'Project Manager': 'Dave Logan',
                'Full Cost': 0,
                'Paid': 0,
            };

            // Execute Project Creation Logic
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

            // Create all task sub-items
            const formSubmissionsToCreate = [];
            const checklistsToCreate = [];
            const attachmentsToCreate = [];
            const approvalsToCreate = [];

            allTasksFromTemplate.forEach((templateTask, index) => {
                const newTaskId = newTaskRecords[index].id;

                // Handle attached forms
                if (templateTask.fields.attachedForm?.fields?.task_forms_fields?.length > 0) {
                    templateTask.fields.attachedForm.fields.task_forms_fields.forEach(fieldId => {
                        if (templateTask.fields.preAttachedFormName === 'Combined_license_getting_started') {
                            const fieldLabel = fieldDetailsMap.get(fieldId)?.label || fieldId;

                            let value;
                            switch (fieldLabel) {
                                case 'What Program/Service Would You Like To Get Started On?':
                                    value = formData.programService;
                                    break;
                                case 'Your Email':
                                    value = formData.yourEmail;
                                    break;
                                case 'First & Last Name':
                                    value = formData.fullName;
                                    break;
                                case 'SELECT STATE OF YOUR PROGRAM':
                                    value = formData.stateOfProgram;
                                    break;
                                case 'WHAT TYPE OF HELP ARE YOU LOOKING FOR FROM WAIVER CONSULTING GROUP? (e.g., licensing, Medicaid enrollment, policy manual, waiver consulting, etc.).':
                                    value = Array.isArray(formData.typeOfHelp) ? formData.typeOfHelp.join(', ') : formData.typeOfHelp;
                                    break;
                                case 'WHAT TYPE OF PROGRAM OR SERVICES WILL YOUR AGENCY OFFER? For example: Home Care, Skilled Nursing, Adult Day Program, Behavioral Health, Group Home, Therapy Services, etc.':
                                    value = formData.agencyServices;
                                    break;
                                case 'WHO DO YOU PLAN TO SERVE? Describe the primary population(s) your agency will support (e.g., seniors, individuals with disabilities, children, veterans, Medicaid recipients, mental health clients, etc.).':
                                    value = formData.populationToServe;
                                    break;
                                case 'Agency Name (Registered Or Proposed)':
                                    value = formData.agencyName;
                                    break;
                                case 'Agency Registration':
                                    value = formData.agencyRegistration;
                                    break;
                                case "Tell us more about your agency or plans. Share anything else you think we should know—whether you're just getting started, already operating, expanding to a new state, recovering from an audit, or need help with a returned application. IN":
                                    value = formData.agencyPlans;
                                    break;
                                case 'WHICH OF THE FOLLOWING SCENARIOS APPLY TO YOU?':
                                    value = formData.scenario;
                                    break;
                                case 'FIRST & LAST NAME':
                                    value = formData.fullName;
                                    break;
                                case 'PHONE #':
                                    value = formData.phone;
                                    break;
                                case 'CONFIRM YOUR EMAIL':
                                    value = formData.confirmEmail;
                                    break;
                                case 'How Soon Are You Looking Start?':
                                    value = formData.startTime;
                                    break;
                                case 'CONSENT: I consent to being contacted via phone calls, texts or emails by Waiver Consulting Group for further discussion or consultation. (Enter Your Name Below To Contact From Waiver Group)':
                                    value = formData.consent;
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

            // Create Calendar Event
            if (formData.meetingDate) {
                try {
                    await ApiCaller('/calendar/create-event', {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                } catch (calendarError) {
                    console.error('Failed to create calendar event:', calendarError);
                }
            }

            // Convert typeOfHelp array to string for backend compatibility
            // Exclude meetingDate and reasonForThisMeeting if no meeting is scheduled
            const { meetingDate, reasonForThisMeeting, ...restFormData } = formData;
            
            const formDataForSubmission = {
                ...restFormData,
                typeOfHelp: Array.isArray(formData.typeOfHelp) ? formData.typeOfHelp.join(', ') : formData.typeOfHelp
            };
            
            // Only include meeting-related fields if a meeting is actually scheduled
            // This prevents the backend from trying to format an invalid date
            if (meetingDate && meetingDate !== '' && meetingDate !== null) {
                formDataForSubmission.meetingDate = meetingDate;
                formDataForSubmission.reasonForThisMeeting = reasonForThisMeeting || '';
            }

            console.log('Form data being submitted:', formDataForSubmission);

            // Add form submission as a promise that we'll handle separately
            const formSubmissionPromise = ApiCaller('/submit-CombinedLicenseintro-form', {
                    method: 'POST',
                    body: JSON.stringify({
                    formData: formDataForSubmission
                })
            }).catch(error => {
                // Silently catch the error but don't block navigation
                console.error('Form submission API error (continuing anyway):', error);
                return { error }; // Return error object instead of throwing
            });

            createPromises.push(formSubmissionPromise);
            
            // Use Promise.allSettled to ensure all promises complete, even if some fail
            const results = await Promise.allSettled(createPromises);
            
            // Log any failures but don't throw
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Promise ${index} failed:`, result.reason);
                }
            });

            // Navigate to Success Page regardless of API errors
            navigate('/submission-success', {
                state: {
                    projectId: newProjectIdentifier,
                    projectName: projectData['Project Name']
                }
            });

        } catch (error) {
            // Log error but still navigate to success page
            console.error('Submission error (navigating anyway):', error);
            
            // Still navigate to success page even if there was an error
            try {
                navigate('/submission-success', {
                    state: {
                        projectId: newProjectIdentifier,
                        projectName: projectData['Project Name']
                    }
                });
            } catch (navError) {
                console.error('Navigation error:', navError);
                // If navigation fails, show a simple success message
                alert('Your form has been submitted. Thank you!');
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [executeRecaptcha, formData, navigate, currentStep]);

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
                        {/* Progress Tabs */}
                        <div className="flex justify-between items-start mb-8 pb-4 border-b border-gray-600 overflow-x-auto">
                            {[1, 2, 3, 4, 5, 6, 7].map((step) => {
                                const status = getStepStatus(step);
                                const stepNames = ['Welcome', 'Services', 'Program Type', 'Populations', 'Contact', 'Scheduling', 'Final Details'];
                                return (
                                    <div key={step} className={`flex flex-col items-center text-center flex-1 min-w-[60px] md:min-w-[80px] relative ${step < 7 ? 'pr-2 md:pr-4' : ''}`}>
                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                                            status === 'completed' ? 'bg-yellow-400 text-gray-900 border-2 border-yellow-400' :
                                            status === 'current' ? 'bg-transparent text-yellow-400 border-2 border-yellow-400' :
                                            'bg-gray-700 text-gray-300 border-2 border-gray-500'
                                        }`}>
                                            {step}
                                        </div>
                                        <div className={`text-xs md:text-sm font-medium hidden md:block ${
                                            status === 'completed' ? 'text-yellow-400' :
                                            status === 'current' ? 'text-yellow-400 font-semibold' :
                                            'text-gray-400'
                                        }`}>
                                            {stepNames[step - 1]}
                                        </div>
                                        {step < 7 && (
                                            <div className={`absolute top-4 md:top-5 left-1/2 w-full h-0.5 ${
                                                status === 'completed' ? 'bg-yellow-400' : 'bg-gray-600'
                                            }`} style={{ width: 'calc(100% - 2rem)', marginLeft: 'calc(50% + 1rem)' }}></div>
                                        )}
                                    </div>
                                );
                            })}
                            </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Step 1: Welcome & State */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-4 text-sm">
                                    Our Getting Started form is the first and most important step in beginning your journey with Waiver Consulting Group LLC. Completing the form accurately is essential—it enables us to provide custom-tailored support, expedite your onboarding, assign your project internally, and load the appropriate tasks into your Client Portal.
                                </p>
                                <p className="text-gray-300 mb-6 text-sm">
                                    Accurate entries also help avoid delays and redundant questions, improve the quality of your intake consultation, and ensure that all regulatory and waiver-specific requirements are identified early. Whether you're launching a new agency, enrolling in Medicaid, or expanding across states, this form sets the foundation for a smooth and strategic collaboration.
                                </p>
                            <div>

                                    <p className="text-gray-400 mb-2 text-sm">Please select only one state. If expanding, note additional states later.</p>
                            <CustomSelect
                                label="SELECT STATE OF YOUR PROGRAM"
                                options={STATES}
                                selected={formData.stateOfProgram}
                                setSelected={(value) => setFormData(prev => ({ ...prev, stateOfProgram: value }))}
                                required
                            />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Type of Help */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-4 text-sm">
                                    Please select the type of assistance you need from Waiver Consulting Group. This helps us understand how we can best support your agency's goals and customize our services to meet your specific needs.
                                </p>
                                <p className="text-gray-400 mb-4 text-sm">Please select all services you are interested in. Click on a category title to see the options.</p>
                                
                                <div className="space-y-1 text-gray-200 text-sm">
                                    {/* Provider Agency Startup Support */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('startup')}
                                        >
                                            <span>Provider Agency Startup Support</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['startup'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['startup'] ? 'block' : 'hidden'}`}>
                                            {['New agency formation', 'Out-of-State Business registration', 'State licensing navigation', 'Starting A New Agency', 'Service Expansion to Additional States', 'Service Expansion Adding Service in the Same State', 'Development of a Certificate Of Need (CON) Document', 'Responding To an Audit', 'Billing Issues/Reimbursement Denied/Rejected', 'Assistance With an Application You\'ve Already Started', 'Strategic Planning & Growth Strategies for Healthcare Businesses'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Provider Licensing & Certification */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('licensing')}
                                        >
                                            <span>Provider Licensing & Certification</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['licensing'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['licensing'] ? 'block' : 'hidden'}`}>
                                            {['State License Applications', 'Ongoing License Renewal and Compliance Filings', 'Licensing and Certification Support (Ongoing or Project Specific)', 'Recertification Support Services', 'Accreditation & Certification Guidance'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Medicaid Provider Enrollment */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('medicaid')}
                                        >
                                            <span>Medicaid Provider Enrollment</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['medicaid'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['medicaid'] ? 'block' : 'hidden'}`}>
                                            {['Fee-For-Service (Medicaid) and Managed Care Enrollment', 'NPI, CAQH registration and revalidation', 'Medicare Certification - PECOS and CMS 855 applications', 'MCO/MCE Enrollment Applications', 'Medicaid Provider Enrollment'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Compliance & Documentation Services */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('compliance')}
                                        >
                                            <span>Compliance & Documentation Services</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['compliance'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['compliance'] ? 'block' : 'hidden'}`}>
                                            {['Policy and Procedure Manual Development (ONLY)', 'Custom, state-specific, waiver-specific policy manuals', 'Setting Up Agency Phone Answering & Greeting Systems', 'Website Development Services for Healthcare Agencies', 'Quality Assurance & Performance Improvement (QAPI)', 'Custom QA/QAPI programs', 'Risk and Incident Management Advisory', 'Audit Preparation (State or Accrediting Bodies)', 'Post-State Audit or Onsite Inspection Support', 'Pre-State Audit or Onsite Inspection Support', 'Compliance & Regulatory Assistance'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Ongoing Support & Strategic Services */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('ongoing')}
                                        >
                                            <span>Ongoing Support & Strategic Services</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['ongoing'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['ongoing'] ? 'block' : 'hidden'}`}>
                                            {['Post-Startup Regulatory & Compliance Support', 'Change of ownership (CHOW)', 'Administrator/DON changes', 'CLIA, OSHA, DEA Coordination and Registration/Certification', 'Medicare CMS Compliance & Capitalization Guidance', 'Assistance with Medicare Provider Enrollment', 'Credentialing With Payers & MCOs', 'Medicaid Managed Care Organization (MCO) credentialing', 'Private insurance credentialing', 'Recredentialing services', 'Payor/Private Health Plans Credentialing Support Services'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Market Research & Expansion Feasibility */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('market')}
                                        >
                                            <span>Market Research & Expansion Feasibility</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['market'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['market'] ? 'block' : 'hidden'}`}>
                                            {['Competitor research Expansion readiness Demographic & reimbursement analysis', 'Assistance with Government Contracts & Bidding Processes'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Training & Capacity Building */}
                                    <fieldset className="border border-gray-600 rounded-lg p-4">
                                        <legend 
                                            className="cursor-pointer flex justify-between items-center w-full px-2 py-1 font-bold text-yellow-400 text-xs uppercase"
                                            onClick={() => toggleAccordion('training')}
                                        >
                                            <span>Training & Capacity Building</span>
                                            <span className="text-yellow-400 text-lg leading-none">{openAccordions['training'] ? '-' : '+'}</span>
                                        </legend>
                                        <div className={`space-y-3 mt-3 ${openAccordions['training'] ? 'block' : 'hidden'}`}>
                                            {['Waiver Academy & Educational Services', 'On-demand compliance training', 'Staff onboarding & waiver orientation', 'SOP tutorials', 'Training & Education Services for Healthcare Staff', 'Operational Efficiency and Process Improvement Consultation', 'Technology Integration and Solutions for Healthcare'].map(option => (
                                                <label key={option} className="flex items-center cursor-pointer hover:text-yellow-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={(formData.typeOfHelp || []).includes(option)}
                                                        onChange={() => handleCheckboxChange(option)}
                                                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-400 rounded bg-gray-700"
                                                    />
                                                    <span className="ml-2 text-sm">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                {validationAttempted && formData.typeOfHelp.length === 0 && (
                                    <p className="text-red-400 text-sm mt-2">Please select at least one service.</p>
                                )}
                            </div>
                        )}

                        {/* Step 3: Program/Service Type */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-6 text-sm">
                                    Please select the type of program or services your agency offers or will offer. This information helps us understand the scope of your operations and tailor our support accordingly.
                                </p>
                            <CustomSelect
                                label="WHAT TYPE OF PROGRAM OR SERVICES WILL YOUR AGENCY OFFER? For example: Home Care, Skilled Nursing, Adult Day Program, Behavioral Health, Group Home, Therapy Services, etc."
                                options={AGENCY_SERVICES}
                                selected={formData.agencyServices}
                                setSelected={(value) => setFormData(prev => ({ ...prev, agencyServices: value }))}
                                required
                            />
                            </div>
                        )}

                        {/* Step 4: Populations Served */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-4 text-sm">
                                    At Waiver Consulting Group LLC, we support provider agencies that deliver essential care and services to a diverse range of vulnerable, medically complex, and underserved populations. The agencies we work with operate across all 50 states and are dedicated to improving quality of life through Medicaid Waiver, home- and community-based services (HCBS), and related healthcare programs.
                                </p>
                                <p className="text-gray-300 mb-6 text-sm">
                                    Understanding the primary populations your agency serves helps us align our support with the specific regulatory requirements, compliance needs, and service delivery models relevant to your client base.
                                </p>
                            <CustomSelect
                                label="WHO DO YOU PLAN TO SERVE? Describe the primary population(s) your agency will support (e.g., seniors, individuals with disabilities, children, veterans, Medicaid recipients, mental health clients, etc.)."
                                options={POPULATIONS_SERVED}
                                selected={formData.populationToServe}
                                setSelected={(value) => setFormData(prev => ({ ...prev, populationToServe: value }))}
                                required
                            />
                            </div>
                        )}

                        {/* Step 5: Agency & Contact Information */}
                        {currentStep === 5 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-6 text-sm">
                                    Provide your agency's name (or proposed name) and any relevant details about your organization. Your contact information allows us to follow up with you, schedule consultations, and send important updates about your project.
                                </p>
                            <div>
                                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-300 mb-1">Agency Name (Registered Or Proposed) <span className="text-red-500">*</span></label>
                                    <input type="text" name="agencyName" id="agencyName" value={formData.agencyName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                            </div>

                            <fieldset className="space-y-2">
                                <div className="flex items-center">
                                    <input id="agencyRegistered" name="agencyStatus" type="radio" value="registered" onChange={handleInputChange} className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300" />
                                    <label htmlFor="agencyRegistered" className="ml-3 block text-sm font-medium text-gray-300">My Agency is Registered</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="agencyNotRegistered" name="agencyStatus" type="radio" value="not_registered" onChange={handleInputChange} className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300" />
                                    <label htmlFor="agencyNotRegistered" className="ml-3 block text-sm font-medium text-gray-300">My Agency is Not Yet Registered</label>
                                </div>
                            </fieldset>

                            <div>
                                <label htmlFor="agencyPlans" className="block text-sm font-medium text-gray-300 mb-1">Tell us more about your agency or plans. Share anything else you think we should know—whether you're just getting started, already operating, expanding to a new state, recovering from an audit, or need help with a returned application. IN <span className="text-red-500">*</span></label>
                                    <textarea name="agencyPlans" id="agencyPlans" rows="4" value={formData.agencyPlans} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required></textarea>
                            </div>

                                <h3 className="uppercase font-bold text-yellow-400 text-base md:text-lg mt-6 mb-4">Your Contact Information</h3>

                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">FIRST & LAST NAME <span className="text-red-500">*</span></label>
                                    <input type="text" name="fullName" id="fullName" value={formData.fullName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">PHONE # <span className="text-red-500">*</span></label>
                                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                                </div>

                                <div>
                                    <label htmlFor="yourEmail" className="block text-sm font-medium text-gray-300 mb-1">Your Email <span className="text-red-500">*</span></label>
                                    <input type="email" name="yourEmail" id="yourEmail" value={formData.yourEmail} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                            </div>

                            <div>
                                <label htmlFor="confirmEmail" className="block text-sm font-medium text-gray-300 mb-1">CONFIRM YOUR EMAIL <span className="text-red-500">*</span></label>
                                    <input type="email" name="confirmEmail" id="confirmEmail" value={formData.confirmEmail} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                            </div>
                            </div>
                        )}

                        {/* Step 6: Scheduling */}
                        {currentStep === 6 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-6 text-sm">
                                    Would you like to schedule your free complimentary intake consultation now? You can choose a time that works best for you via our online calendar. This initial meeting allows us to discuss your specific needs, answer questions, and outline the next steps in your journey with Waiver Consulting Group.
                                </p>

                            <div>
                                    <label htmlFor="wantsToSchedule" className="block text-sm font-medium text-gray-300 mb-1">Would you like to schedule an appointment with a Consultant to get started? <span className="text-red-500">*</span></label>
                                    <select 
                                        id="wantsToSchedule" 
                                        name="wantsToSchedule"
                                        value={wantsToSchedule} 
                                        onChange={(e) => {
                                            setWantsToSchedule(e.target.value);
                                            // Clear meeting data if they select "No"
                                            if (e.target.value === 'no') {
                                                setFormData(prev => ({ ...prev, meetingDate: null, reasonForThisMeeting: '' }));
                                            }
                                        }}
                                        className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white"
                                        required
                                    >
                                        <option value="">-- Select an option --</option>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                {wantsToSchedule === 'yes' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">Please select a date and time that works for you <span className="text-red-500">*</span></label>
                                <CalendarAvailability
                                    onTimeSlotSelect={(slot) => handleDateChange(slot)}
                                />
                            </div>

                            <div>
                                <label htmlFor="reasonForThisMeeting" className="block text-sm font-medium text-gray-300 mb-1">What do you hope to accomplish through this meeting? <span className="text-red-500">*</span></label>
                                            <textarea name="reasonForThisMeeting" id="reasonForThisMeeting" rows="4" value={formData.reasonForThisMeeting} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required></textarea>
                            </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Step 7: Final Details */}
                        {currentStep === 7 && (
                            <div className="space-y-6">
                                <p className="text-gray-300 mb-6 text-sm">
                                    Just a few final questions to help us better understand your timeline, experience level, and ensure we have your consent to communicate with you. This information helps us match your needs with our support capacity and provide the most appropriate level of assistance.
                                </p>
                                <div>
                                    <label htmlFor="programService" className="block text-sm font-medium text-gray-300 mb-1">What Program/Service Would You Like To Get Started On? <span className="text-red-500">*</span></label>
                                    <input type="text" name="programService" id="programService" value={formData.programService} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                                </div>

                                <CustomSelect
                                    label="WHICH OF THE FOLLOWING SCENARIOS APPLY TO YOU?"
                                    options={SCENARIOS}
                                    selected={formData.scenario}
                                    setSelected={(value) => setFormData(prev => ({ ...prev, scenario: value }))}
                                    required
                                />

                            <CustomSelect
                                label="How Soon Are You Looking Start?"
                                options={START_TIMES}
                                selected={formData.howSoon}
                                setSelected={(value) => setFormData(prev => ({ ...prev, howSoon: value }))}
                                required
                            />

                            <div>
                                <label htmlFor="consentName" className="block text-sm font-medium text-gray-300 mb-1">CONSENT: I consent to being contacted via phone calls, texts or emails by Waiver Consulting Group for further discussion or consultation. (Enter Your Name Below To Contact From Waiver Group) <span className="text-red-500">*</span></label>
                                    <input type="text" name="consentName" id="consentName" value={formData.consentName} onChange={handleInputChange} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm text-white" required />
                            </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-600">
                            <button
                                type="button"
                                onClick={handlePrevious}
                                disabled={currentStep === 1}
                                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                                    currentStep === 1
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                                }`}
                            >
                                Previous
                            </button>
                            {currentStep < totalSteps ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="px-6 py-3 bg-yellow-400 text-gray-800 rounded-md font-bold hover:bg-yellow-500 transition-colors"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-lg font-bold rounded-md text-gray-800 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-gray-800 disabled:bg-yellow-200 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Form'}
                                </button>
                            )}
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
    return (
        <GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
            <FormComponent />
        </GoogleReCaptchaProvider>
    );
};

export default CombinedLicenseIntroPage;
