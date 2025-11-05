import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AIDataRequestModal = ({ isOpen, onClose, onSubmit, fields, projectData }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isOpen) {
            // Initialize form data with empty values
            const initialData = {};
            fields.forEach(field => {
                initialData[field.name] = field.defaultValue || '';
            });
            setFormData(initialData);
            setErrors({});
        }
    }, [isOpen, fields]);

    // Get options for a field based on its type
    const getFieldOptions = (field) => {
        if (field.options) return field.options;
        
        // For assigned_to, get options from project data
        if (field.name === 'assigned_to' && projectData) {
            const options = new Set();
            if (projectData.fields?.['Assigned Consultant']) {
                options.add(projectData.fields['Assigned Consultant']);
            }
            if (projectData.fields?.['Supervising Consultant']) {
                options.add(projectData.fields['Supervising Consultant']);
            }
            if (projectData.fields?.collaborator_name && Array.isArray(projectData.fields.collaborator_name)) {
                projectData.fields.collaborator_name.forEach(c => options.add(c.trim()));
            }
            return Array.from(options).filter(Boolean);
        }
        
        return [];
    };

    // Validate field based on its type
    const validateField = (field, value) => {
        if (field.required && !value) {
            return `${field.label} is required`;
        }
        
        if (field.type === 'email' && value && !/.+@.+\..+/.test(value)) {
            return 'Invalid email format';
        }
        
        if (field.type === 'number' && value && isNaN(value)) {
            return 'Must be a number';
        }
        
        if (field.options && value && !field.options.includes(value)) {
            return `Invalid option. Must be one of: ${field.options.join(', ')}`;
        }
        
        return null;
    };

    const handleChange = (fieldName, value) => {
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        
        // Clear error for this field
        if (errors[fieldName]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate all fields
        const newErrors = {};
        fields.forEach(field => {
            const error = validateField(field, formData[field.name]);
            if (error) {
                newErrors[field.name] = error;
            }
        });
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        onSubmit(formData);
        onClose();
    };

    const renderField = (field) => {
        const options = getFieldOptions(field);
        const hasOptions = options.length > 0;
        const fieldValue = formData[field.name] || '';
        const fieldError = errors[field.name];

        if (field.type === 'date') {
            return (
                <div key={field.name} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <DatePicker
                        selected={fieldValue ? new Date(fieldValue) : null}
                        onChange={(date) => handleChange(field.name, date ? date.toISOString().split('T')[0] : '')}
                        dateFormat="yyyy-MM-dd"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900 ${
                            fieldError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholderText="Select date"
                        wrapperClassName="w-full"
                    />
                    {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
                    {field.description && <p className="text-gray-500 text-xs mt-1">{field.description}</p>}
                </div>
            );
        }

        if (hasOptions || field.type === 'select') {
            return (
                <div key={field.name} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <select
                        value={fieldValue}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900 ${
                            fieldError ? 'border-red-500' : 'border-gray-300'
                        }`}
                    >
                        <option value="">Select {field.label}</option>
                        {options.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
                    {field.description && <p className="text-gray-500 text-xs mt-1">{field.description}</p>}
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <div key={field.name} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <textarea
                        value={fieldValue}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        rows={field.rows || 3}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900 ${
                            fieldError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder={field.placeholder}
                    />
                    {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
                    {field.description && <p className="text-gray-500 text-xs mt-1">{field.description}</p>}
                </div>
            );
        }

        // Default text input
        return (
            <div key={field.name} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                    type={field.type || 'text'}
                    value={fieldValue}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-gray-900 ${
                        fieldError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={field.placeholder}
                />
                {fieldError && <p className="text-red-500 text-xs mt-1">{fieldError}</p>}
                {field.description && <p className="text-gray-500 text-xs mt-1">{field.description}</p>}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <style>{`
                    .react-datepicker__input-container input {
                        color: #111827 !important;
                        background-color: white !important;
                    }
                    .react-datepicker__input-container input::placeholder {
                        color: #9ca3af !important;
                    }
                `}</style>
                <div className="bg-black text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="font-semibold text-sm">Waiverlyn Needs Information</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-gray-600 mb-4 text-sm">
                        I need some additional information to complete your request:
                    </p>
                    
                    {fields.map(field => renderField(field))}
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-black hover:bg-gray-800 text-yellow-400 rounded-md font-medium transition-colors"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIDataRequestModal;

