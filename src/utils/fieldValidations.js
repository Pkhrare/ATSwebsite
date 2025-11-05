// Field validation rules and metadata for AI assistant
// This file provides field definitions, validation rules, and options

import { dropdownFields, assignedConsultants_record_ids } from './validations';

export const FIELD_VALIDATIONS = {
    // Project fields
    'Project Name': {
        type: 'text',
        required: true,
        description: 'The name of the project'
    },
    'Client Email': {
        type: 'email',
        required: true,
        description: 'Client email address',
        validation: (value) => {
            if (!/.+@.+\..+/.test(value)) {
                return 'Invalid email format';
            }
            return null;
        }
    },
    'States': {
        type: 'select',
        required: true,
        options: dropdownFields['States'] || [],
        description: 'State where the project is located'
    },
    'Project Type': {
        type: 'select',
        required: true,
        options: dropdownFields['Project Type'] || [],
        description: 'Type of project'
    },
    'Assigned Consultant': {
        type: 'select',
        required: true,
        options: dropdownFields['Assigned Consultant'] || [],
        description: 'Consultant assigned to the project'
    },
    'Supervising Consultant': {
        type: 'select',
        required: false,
        options: dropdownFields['Supervising Consultant'] || [],
        description: 'Supervising consultant for the project'
    },
    'Project Manager': {
        type: 'select',
        required: true,
        options: dropdownFields['Project Manager'] || [],
        description: 'Project manager'
    },
    'Status': {
        type: 'select',
        required: true,
        options: dropdownFields['Status'] || [],
        description: 'Project status'
    },
    'Operation': {
        type: 'select',
        required: false,
        options: dropdownFields['Operation'] || [],
        description: 'Project operation status (Active or Deactivated)'
    },
    'Start date': {
        type: 'date',
        required: true,
        description: 'Project start date',
        validation: (value) => {
            const date = new Date(value);
            const today = new Date();
            if (isNaN(date.getTime()) || date > today) {
                return 'Start date must be valid and not in the future';
            }
            return null;
        }
    },
    'Full Cost': {
        type: 'number',
        required: false,
        description: 'Total project cost'
    },
    'Paid': {
        type: 'number',
        required: false,
        description: 'Amount paid'
    },
    
    // Task fields
    'Task Name': {
        type: 'text',
        required: true,
        description: 'Name of the task'
    },
    'assigned_to': {
        type: 'dynamic_select',
        required: false,
        description: 'Person assigned to the task',
        getOptions: (projectData) => {
            if (!projectData?.fields) return [];
            const options = new Set();
            if (projectData.fields['Assigned Consultant']) {
                options.add(projectData.fields['Assigned Consultant']);
            }
            if (projectData.fields['Supervising Consultant']) {
                options.add(projectData.fields['Supervising Consultant']);
            }
            if (projectData.fields.collaborator_name && Array.isArray(projectData.fields.collaborator_name)) {
                projectData.fields.collaborator_name.forEach(c => {
                    if (c && typeof c === 'string') {
                        options.add(c.trim());
                    }
                });
            }
            return Array.from(options).filter(Boolean);
        }
    },
    'task_status': {
        type: 'select',
        required: false,
        options: ['Not Started', 'In Progress', 'Completed'],
        description: 'Task status'
    },
    'due_date': {
        type: 'date',
        required: false,
        description: 'Task due date'
    },
    'Action_type': {
        type: 'select',
        required: false,
        options: dropdownFields['Action_type'] || [],
        description: 'Type of action required'
    },
    
    // Form fields
    'field_type': {
        type: 'select',
        required: true,
        options: dropdownFields['field_type'] || [],
        description: 'Type of form field'
    }
};

// Get field validation info
export const getFieldValidation = (fieldName) => {
    return FIELD_VALIDATIONS[fieldName] || {
        type: 'text',
        required: false,
        description: `Field: ${fieldName}`
    };
};

// Get all available options for a field
export const getFieldOptions = (fieldName, projectData = null) => {
    const field = FIELD_VALIDATIONS[fieldName];
    if (!field) return [];
    
    if (field.type === 'dynamic_select' && field.getOptions) {
        return field.getOptions(projectData);
    }
    
    return field.options || [];
};

// Convert field definition to modal field format
export const fieldToModalField = (fieldName, projectData = null) => {
    const validation = getFieldValidation(fieldName);
    const options = getFieldOptions(fieldName, projectData);
    
    return {
        name: fieldName,
        label: fieldName,
        type: validation.type === 'dynamic_select' ? 'select' : validation.type,
        required: validation.required || false,
        options: options.length > 0 ? options : undefined,
        description: validation.description,
        placeholder: `Enter ${fieldName.toLowerCase()}`
    };
};

// Validate a field value
export const validateFieldValue = (fieldName, value, projectData = null) => {
    const validation = getFieldValidation(fieldName);
    
    if (validation.required && !value) {
        return `${fieldName} is required`;
    }
    
    if (validation.validation && value) {
        return validation.validation(value);
    }
    
    if (validation.type === 'email' && value && !/.+@.+\..+/.test(value)) {
        return 'Invalid email format';
    }
    
    if (validation.type === 'number' && value && isNaN(value)) {
        return 'Must be a number';
    }
    
    if (validation.options && value && !validation.options.includes(value)) {
        return `Invalid option. Must be one of: ${validation.options.join(', ')}`;
    }
    
    return null;
};

