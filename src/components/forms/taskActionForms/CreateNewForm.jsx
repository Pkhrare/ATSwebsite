import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FORM_FIELD_TYPES } from '../../../utils/validations';
import ApiCaller from '../../apiCall/ApiCaller';

const CreateNewForm = ({ onClose, onFormCreated }) => {
    const [formData, setFormData] = useState({
        form_name: '',
    });
    const [fields, setFields] = useState([
        { id: uuidv4(), field_label: '', field_type: 'Single line text' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFieldChange = (id, field, value) => {
        setFields(prev => 
            prev.map(item => 
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const addField = () => {
        setFields(prev => [...prev, { id: uuidv4(), field_label: '', field_type: 'Single line text' }]);
    };

    const removeField = (id) => {
        if (fields.length > 1) {
            setFields(prev => prev.filter(field => field.id !== id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.form_name.trim()) {
            setError('Form name is required');
            return;
        }

        if (fields.some(field => !field.field_label.trim())) {
            setError('All field labels are required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Create the form
            const formRequestBody = {
                recordsToCreate: [{
                    fields: {
                        form_name: formData.form_name,
                        date_create: new Date().toISOString().split('T')[0]
                    }
                }],
                tableName: 'task_forms'
            };

            const formResult = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify(formRequestBody),
            });
            const newFormId = formResult.records[0].id;

            // Step 2: Create the form fields
            const fieldsToCreate = fields.map((field, index) => ({
                fields: {
                    task_form: [newFormId],
                    field_label: field.field_label,
                    field_type: field.field_type
                }
            }));

            const fieldsRequestBody = {
                recordsToCreate: fieldsToCreate,
                tableName: 'task_forms_fields'
            };

            const fieldsResult = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify(fieldsRequestBody),
            });
            const fieldIds = fieldsResult.records.map(record => record.id);

            // Step 3: Update the form with the field IDs
            await ApiCaller(`/records/task_forms/${newFormId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    fields: {
                        task_forms_fields: fieldIds
                    }
                }),
            });

            // Step 4: Fetch the complete form with fields
            const completeForm = await ApiCaller(`/records/task_forms/${newFormId}`);

            if (onFormCreated) {
                onFormCreated(completeForm);
            }
            
            onClose();
        } catch (error) {
            console.error("Error creating form:", error);
            setError(error.message || 'An error occurred while creating the form');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Create New Form</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Form Name*</label>
                            <input 
                                type="text" 
                                name="form_name" 
                                value={formData.form_name} 
                                onChange={handleFormChange} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black" 
                                required 
                            />
                        </div>
                        
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-medium text-gray-700">Form Fields</h3>
                                <button 
                                    type="button" 
                                    onClick={addField} 
                                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    Add Field
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-4 border border-gray-200 rounded-md">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-medium text-gray-700">Field {index + 1}</h4>
                                            {fields.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeField(field.id)} 
                                                    className="text-sm text-red-600 hover:text-red-800"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Field Label*</label>
                                                <input 
                                                    type="text" 
                                                    value={field.field_label} 
                                                    onChange={(e) => handleFieldChange(field.id, 'field_label', e.target.value)} 
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black text-sm" 
                                                    required 
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Field Type</label>
                                                <select 
                                                    value={field.field_type} 
                                                    onChange={(e) => handleFieldChange(field.id, 'field_type', e.target.value)} 
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black text-sm"
                                                >
                                                    {FORM_FIELD_TYPES.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex justify-end pt-4">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300" 
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Create Form'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateNewForm;