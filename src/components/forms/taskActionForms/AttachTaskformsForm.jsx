import React, { useState, useEffect } from 'react';
import CreateNewForm from './CreateNewForm';
import ApiCaller from '../../apiCall/ApiCaller';


const AttachTaskformsForm = ({ onClose, onFormAttach }) => {
    const [forms, setForms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedForm, setSelectedForm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const data = await ApiCaller('/all/task_forms');
                setForms(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchForms();
    }, []);

    const handleFormChange = (e) => {
        setSelectedForm(e.target.value);
    };

    const handleAttach = () => {
        if (selectedForm === 'create_new') {
            setShowCreateForm(true);
        } else {
            const formToAttach = forms.find(form => form.id === selectedForm);
            if (onFormAttach) {
                onFormAttach(formToAttach);
            }
            onClose();
        }
    };
    
    const handleFormCreated = (newForm) => {
        if (onFormAttach) {
            onFormAttach(newForm);
        }
        setShowCreateForm(false);
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Attach a Form</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6">
                        {isLoading && <p>Loading forms...</p>}
                        {error && <p className="text-red-500">{error}</p>}
                        {!isLoading && !error && (
                            <div className="space-y-4">
                                <select
                                    value={selectedForm}
                                    onChange={handleFormChange}
                                    className="w-full px-3 py-2 border rounded-md text-black text-sm"
                                >
                                    <option value="">Select a form</option>
                                    {forms.map(form => (
                                        <option key={form.id} value={form.id}>
                                            {form.fields.form_name}
                                        </option>
                                    ))}
                                    <option value="create_new">-- Create a new form --</option>
                                </select>
                                <div className="mt-6 flex justify-end">
                                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2">Cancel</button>
                                    <button onClick={handleAttach} className="px-4 py-2 bg-blue-600 text-white rounded-md" disabled={!selectedForm}>
                                        Attach
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showCreateForm && (
                <CreateNewForm 
                    onClose={() => setShowCreateForm(false)} 
                    onFormCreated={handleFormCreated}
                />
            )}
        </>
    );
};

export default AttachTaskformsForm;