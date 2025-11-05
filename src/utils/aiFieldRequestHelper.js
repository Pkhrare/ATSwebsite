// Helper utilities for AI to request field data from users
import { fieldToModalField, getFieldValidation, getFieldOptions } from './fieldValidations';

/**
 * Convert AI request for missing fields into modal field format
 * @param {Array} missingFields - Array of field names that need to be collected
 * @param {Object} projectData - Current project data for dynamic fields
 * @returns {Array} Array of field definitions for the modal
 */
export const createFieldRequestFields = (missingFields, projectData = null) => {
    return missingFields.map(fieldName => {
        return fieldToModalField(fieldName, projectData);
    });
};

/**
 * Parse AI response to extract field requests
 * The AI should return a response with type: 'data_request' and fields array
 * @param {Object} aiResponse - Response from AI
 * @returns {Object|null} Field request object or null
 */
export const parseFieldRequest = (aiResponse) => {
    if (aiResponse.type === 'data_request' && aiResponse.fields && Array.isArray(aiResponse.fields)) {
        return {
            fields: aiResponse.fields.map(field => {
                // If field is just a string, convert to field definition
                if (typeof field === 'string') {
                    return fieldToModalField(field);
                }
                // If field is already an object, ensure it has required properties
                return {
                    name: field.name || field.field,
                    label: field.label || field.name || field.field,
                    type: field.type || 'text',
                    required: field.required || false,
                    options: field.options,
                    description: field.description,
                    placeholder: field.placeholder || `Enter ${(field.label || field.name || field.field).toLowerCase()}`
                };
            }),
            message: aiResponse.message || 'I need some additional information to complete your request.',
            callback: null // Will be set by the component
        };
    }
    return null;
};

