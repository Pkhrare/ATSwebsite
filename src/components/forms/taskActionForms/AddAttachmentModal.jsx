import React, { useState, useMemo } from 'react';
import ApiCaller from '../../apiCall/ApiCaller';

const AddAttachmentModal = ({ isOpen, onClose, taskId, onAttachmentAdded }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [attachmentDescription, setAttachmentDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const attachmentDescriptions = ['Other',
        "Articles of Incorporation/Business Registration",
"IRS EIN Confirmation",
"Certificate of Good Standing",
"Bylaws (if Applicable)",
"Operating Agreement",
"Completed Application Form",
"Licensing Fee Payment Proof",
"Signed Provider Agreement",
"Renewal Application (if applicable)",
"Policy & Procedure Manual",
"Background Check Clearances (State/FBI)",
"HIPAA Compliance Agreement",
"NPI Number",
"Medicaid/Medicare Enrollment Proof",
"OSHA Compliance Documentation",
"Anti-Kickback Statute Compliance Statement",
"Proof of Financial Stability (Bank Statements, etc.)",
"Liability, Workers’ Comp & Professional Insurance",
"Audit Reports (if required)",
"Bond Requirements (if applicable)",
"Organizational Chart and Staffing Plan",
"Employee Licenses, Resumes, and Certifications",
"Accreditation & Medical Director Agreements",
"Clinical Staff Licenses and Training Certificates",
"Fire/Health Department Inspection Reports",
"Lease/Ownership Documentation and Safety Plans",
"ADA Compliance Documentation",
"Emergency Preparedness Plan",
"Provider Participation & Referral Agreements",
"Vendor/Supplier Contracts",
"Business Associate Agreements (BAA)",
"Staff Orientation Materials and Training Records",
"Medicaid/Medicare Enrollment Applications",
"CAQH Enrollment (if required)",
"Medicaid/Medicare P&P Manual",
"Managed Care Organization (MCO) Contracts",
"Quality Assurance/Risk Management Plans",
"Client Satisfaction and Performance Review Forms",
"Root Cause Analysis Reports (if applicable)",
"State-Specific Waiver, Special Permits, or Addendums",
"Local Health Department Approvals",
"Environmental Impact Assessments (if applicable)",
"Cybersecurity Policies",
"Electronic Health Record (EHR) System Documentation",
"Disaster Recovery Plan",
"Marketing Materials Approval",
"Advertising Disclosures"

    ];

    // Filter descriptions based on search term
    const filteredDescriptions = useMemo(() => {
        if (!searchTerm.trim()) return attachmentDescriptions;
        return attachmentDescriptions.filter(desc => 
            desc.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setError(null);
    };

    const handleDescriptionSelect = (description) => {
        setAttachmentDescription(description);
        setSearchTerm(description);
        setIsDropdownOpen(false);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownOpen(true);
    };

    const handleSearchFocus = () => {
        setIsDropdownOpen(true);
    };

    const handleSearchBlur = () => {
        // Delay closing to allow clicking on options
        setTimeout(() => setIsDropdownOpen(false), 200);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsDropdownOpen(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            setError('Please select a file to upload');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create a new attachment record first
            const attachmentRecord = {
                fields: {
                    attachment_description: attachmentDescription,
                    task_id: [taskId]
                }
            };

            console.log('Creating attachment record:', attachmentRecord);
            const createResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({
                    recordsToCreate: [attachmentRecord],
                    tableName: 'task_attachments'
                })
            });

            console.log('Create response:', createResponse);
            
            if (!createResponse || !createResponse.records || !createResponse.records[0]) {
                throw new Error('Failed to create attachment record');
            }

            const newAttachment = createResponse.records[0];
            console.log('New attachment created:', newAttachment);

            // Upload the file to the new attachment record
            const formData = new FormData();
            formData.append('file', selectedFile);

            console.log('Uploading file to attachment:', newAttachment.id);
            const uploadResponse = await ApiCaller(`/upload/task_attachments/${newAttachment.id}/Attachments`, {
                method: 'POST',
                body: formData,
            });

            console.log('Upload response:', uploadResponse);

            // Fetch the complete attachment data with the uploaded file
            console.log('Fetching complete attachment data');
            const completeAttachment = await ApiCaller(`/records/task_attachments/${newAttachment.id}`);
            console.log('Complete attachment:', completeAttachment);

            // Notify parent component
            onAttachmentAdded(completeAttachment);

            // Reset form and close modal
            setSelectedFile(null);
            setAttachmentDescription('Other');
            setSearchTerm('Other');
            setIsDropdownOpen(false);
            onClose();

        } catch (err) {
            console.error('Failed to upload attachment:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                response: err.response
            });
            
            // More specific error handling
            let errorMessage = 'Failed to upload attachment. Please try again.';
            if (err.message) {
                errorMessage = err.message;
            } else if (err.response && err.response.data) {
                errorMessage = err.response.data.message || errorMessage;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setSelectedFile(null);
            setAttachmentDescription('Other');
            setSearchTerm('Other');
            setIsDropdownOpen(false);
            setError(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Add New Attachment</h3>
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Attachment Description
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={handleSearchFocus}
                                    onBlur={handleSearchBlur}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Search or type attachment description..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isLoading}
                                />
                                {isDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {filteredDescriptions.length > 0 ? (
                                            filteredDescriptions.map(desc => (
                                                <button
                                                    key={desc}
                                                    type="button"
                                                    onClick={() => handleDescriptionSelect(desc)}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:bg-blue-50 focus:text-blue-700"
                                                >
                                                    {desc}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-sm text-gray-500">
                                                No matching descriptions found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select File
                            </label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                                accept="*/*"
                            />
                            {selectedFile && (
                                <p className="mt-1 text-sm text-gray-600">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !selectedFile}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Uploading...' : 'Upload Attachment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddAttachmentModal;
