import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { dropdownFields, validateRow, safeNewDate, assignedConsultants_record_ids } from '../../utils/validations';
import { format } from 'date-fns';
import ApiCaller from '../apiCall/ApiCaller';   




async function globalProjectCounter() {
    try {
        const records = await ApiCaller(`/records/counter/dummy`, {
            method: 'GET',
        });
        return records;
    } catch (e) {
        console.error('Failed to load counter:', e);
        return null;
    }
}

async function generateProjectID(state, projectType, startDate) {
    if (!state || !projectType || !startDate) return '';
    const serviceType = projectType.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const formattedDate = new Date(startDate).toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);

    const counter_obj = await globalProjectCounter();
    if (!counter_obj) return '';

    const counter = counter_obj.fields['Counter'];
    await ApiCaller(`/records/counter/dummy`, {
        method: 'PATCH',
        body: JSON.stringify({ fields: { 'Counter': counter + 1 } }),
    });

    return `${state}${serviceType}-${formattedDate}P${counter + 1}`;
}


const AddProjectCard = ({ onClose, onProjectAdded }) => {
    const [fields, setFields] = useState({});
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field, value) => {
        let processedValue = value;
        if (field === 'Full Cost' || field === 'Paid') {
            processedValue = value === '' ? null : parseFloat(value);
        }
        setFields(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const validationErrors = validateRow(fields, true);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setIsSubmitting(false);
            return;
        }

        try {
            const projectID = await generateProjectID(fields['States'], fields['Project Type'], fields['Start Date']);
            const balance = (Number(fields['Full Cost']) || 0) - (Number(fields['Paid']) || 0);
            
            const fieldsToCreate = { ...fields };
            const assignedConsultantName = fieldsToCreate['Assigned Consultant'];
            if (assignedConsultantName && assignedConsultants_record_ids[assignedConsultantName]) {
                fieldsToCreate['collaborators'] = [assignedConsultants_record_ids[assignedConsultantName]];
            }

            const recordToCreate = {
                fields: {
                    ...fieldsToCreate,
                    'Project ID': projectID,
                    'Balance': balance,
                }
            };
            
            await ApiCaller(`/records`, {
                method: 'POST',
                body: JSON.stringify({ recordsToCreate: [recordToCreate], tableName: 'projects' })
            });

            onProjectAdded();
            onClose();

        } catch (error) {
            console.error('Failed to create project:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (name) => {
        const isDropdown = dropdownFields[name];
        const commonProps = {
            id: name,
            value: fields[name] || '',
            onChange: (e) => handleChange(name, e.target.value),
            className:"w-full p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
        };
        return (
            <div key={name}>
                <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{name}</label>
                {isDropdown ? (
                    <select {...commonProps}>
                        <option value="">-- Select --</option>
                        {isDropdown.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : name.includes('Date') ? (
                    <DatePicker
                        selected={safeNewDate(fields[name])}
                        onChange={(date) => handleChange(name, date ? format(date, 'yyyy-MM-dd') : '')}
                        dateFormat="yyyy-MM-dd"
                        className={commonProps.className}
                        placeholderText="Pick a date"
                    />
                ) : (
                    <input type='text' {...commonProps} />
                )}
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
            </div>
        );
    };

    const allFields = [
        'Project Name', 'Client Email', 'Start Date', 'States', 'Project Type', 'Assigned Consultant', 
        'Supervising Consultant', 'Project Manager', 'Status', 'Submitted (Y/N)', 'Full Cost', 'Paid',
        'IRS Identifier (ID/EIN)'
    ];

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-5 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800">Add New Project</h2>
                    <button onClick={onClose} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {allFields.map(renderField)}
                    </div>
                    <footer className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default AddProjectCard; 