import React, { useState } from 'react';
import ApiCaller from '../apiCall/ApiCaller';

const AddInfoPageForm = ({ onClose, onPageAdded }) => {
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Title cannot be empty.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            // The backend should create a new page with this title and empty content
            const newPage = await ApiCaller('/info-pages', {
                method: 'POST',
                body: JSON.stringify({ title: title.trim() }),
            });
            onPageAdded(newPage); // Pass the new page data back to be handled
        } catch (err) {
            setError('Failed to create the page. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Page</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="pageTitle" className="block text-sm font-medium text-slate-700">
                            Page Title
                        </label>
                        <input
                            id="pageTitle"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-2 text-black border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter the page title"
                            autoFocus
                            disabled={isLoading}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Page'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddInfoPageForm;
