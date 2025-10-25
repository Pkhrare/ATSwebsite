import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import '../Pages/All.css';
import Card from '../components/cards/ProjectCard';
import AddProjectCard from '../components/cards/AddProjectCard';
import { dropdownFields, safeNewDate, assignedConsultants_record_ids } from '../utils/validations';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import ApiCaller from '../components/apiCall/ApiCaller';
import { colorClasses } from '../utils/colorUtils';
import { downloadAsJSON, downloadAsCSV, downloadAsXLSX } from '../utils/downloadUtils';


// Helper function to fetch from the backend API
const apiFetch = async (endpoint, options = {}) => {
  const response = await ApiCaller(endpoint, options);
  return response;
};


async function globalProjectCounter() {
  try {
    const records = await apiFetch(`/records/counter/dummy`); // recordId is ignored for counter
    return records;
  } catch (e) {
    console.error('Failed to load:', e);
    return null;
  }
}

// const generateProjectID = (clientName, projectType, startDate) => {
//     const nameParts = clientName.split(' ');
//     const initials = nameParts.length > 1 
//         ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}` 
//         : clientName.substring(0, 2);

//     const typeCode = projectType.split(' ')[0].substring(0, 4);

//     const date = new Date(startDate);
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     const year = String(date.getFullYear()).slice(-2);

//     return `${initials.toUpperCase()}${typeCode.toUpperCase()}-${month}${day}${year}`;
// };


function Projects() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecords, setEditedRecords] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isAddCardVisible, setIsAddCardVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('Project Name');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Initialize activeTab based on URL parameter
  const initialTab = searchParams.get('tab') === 'deactivated' ? 'deactivated' : 'active';
  const [activeTab, setActiveTab] = useState(initialTab); // 'active', 'deactivated', 'templates'

  const columnHeaders = React.useMemo(() => {
    const set = new Set();
    data.forEach(r => Object.keys(r.fields).forEach(k => set.add(k)));
    const allColumns = Array.from(set);

    // Remove unwanted columns
    const unwantedColumns = new Set([
      'Pending Action (Client, Consulting or State)',
      'Notes',
      'Estimated Completion',
      'Actions',
      'Documents',
      'ServiceMilestones',
      'Tasks',
      'collaborator_name',
      'collaborators',
      'task_groups',
      'projectGeneralChat',
      'project_internal_notes',
    ]);
    const filteredColumns = allColumns.filter(column => !unwantedColumns.has(column));

    // Define the desired order of columns
    const preferredOrder = [
        'Project ID',
        'Project Name',
        'Client Email',
        'Start Date',
        'States',
        'Project Type',
        'Assigned Consultant',
        'Supervising Consultant',
        'Project Manager',
        'Status',
        'Submitted (Y/N)',
        'IRS Identifier (ID/EIN)',
        'Last Updated',
        'Full Cost',
        'Paid',
        'Balance',
    ];

    // Create a set of preferred columns for quick lookup
    const preferredOrderSet = new Set(preferredOrder);

    // Get columns that are in the preferred order list, in that order
    const orderedPart = preferredOrder.filter(column => filteredColumns.includes(column));

    // Get the rest of the columns that are not in the preferred order list
    const remainingPart = filteredColumns.filter(column => !preferredOrderSet.has(column));

    // Combine them
    const reorderedColumns = [...orderedPart, ...remainingPart];

    return reorderedColumns;
  }, [data]);

  const filteredData = React.useMemo(() => {
    // First filter by operation status based on active tab
    let operationFilteredData = data;
    if (activeTab === 'active') {
      operationFilteredData = data.filter(record => 
        record.fields['Operation'] === 'Active' || !record.fields['Operation']
      );
    } else if (activeTab === 'deactivated') {
      operationFilteredData = data.filter(record => 
        record.fields['Operation'] === 'Deactivated'
      );
    }
    // Then apply search filter
    if (!searchQuery) {
      return operationFilteredData;
    }
    return operationFilteredData.filter(record => {
      const fieldValue = record.fields[filterField];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (typeof fieldValue === 'number') {
        return fieldValue.toString().toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
    });
  }, [data, searchQuery, filterField, activeTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await apiFetch('/records');
      setData(records);
    } catch (e) {
      console.error('Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'deactivated') {
      setActiveTab('deactivated');
    } else {
      setActiveTab('active');
    }
  }, [searchParams]);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedRecords({});
  };



  const handleUpdateClick = async () => {
    const updates = Object.values(editedRecords).map(record => {
      const originalRecord = data.find(r => r.id === record.id);
      const updatedFields = {
          ...record.fields,
          Balance: (Number(record.fields['Full Cost']) || 0) - (Number(record.fields['Paid']) || 0)
      };

      // Check if Assigned Consultant changed
      if (record.fields['Assigned Consultant'] !== undefined) {
          const oldConsultant = originalRecord.fields['Assigned Consultant'];
          const newConsultant = record.fields['Assigned Consultant'];

          if (oldConsultant !== newConsultant) {
              const oldConsultantId = oldConsultant ? assignedConsultants_record_ids[oldConsultant] : null;
              const newConsultantId = newConsultant ? assignedConsultants_record_ids[newConsultant] : null;

              let currentCollaboratorIds = originalRecord.fields.collaborators || [];

              // Remove old consultant
              if (oldConsultantId) {
                  currentCollaboratorIds = currentCollaboratorIds.filter(id => id !== oldConsultantId);
              }

              // Add new consultant
              if (newConsultantId && !currentCollaboratorIds.includes(newConsultantId)) {
                  currentCollaboratorIds.push(newConsultantId);
              }

              updatedFields.collaborators = currentCollaboratorIds;
          }
      }
      return {
          id: record.id,
          fields: updatedFields
      };
    });

    try {
      if (updates.length) {
        await apiFetch('/records', {
            method: 'PATCH',
            body: JSON.stringify({ recordsToUpdate: updates, tableName: 'projects' })
        });
      }
      await loadData(); // Refetch all data to ensure UI is consistent
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setIsEditing(false);
      setEditedRecords({});
    }
  };

  const handleCellChange = (id, key, value) => {
    const original = data.find(r => r.id === id);
    if (!original || key === 'Project ID') return;
    setEditedRecords(prev => ({
      ...prev,
      [id]: {
        id,
        fields: {
          ...prev[id]?.fields,
          [key]: typeof original.fields[key] === 'number' ? Number(value) : value
        }
      }
    }));
  };

  const handleProjectClick = (record) => {
    if (!isEditing) {
      setSelectedProject(record);
      setIsCardVisible(true);
    }
  };

  const handleProjectUpdate = (updatedRecord) => {
    setData(currentData =>
      currentData.map(record =>
        record.id === updatedRecord.id ? updatedRecord : record
      )
    );
  };

  const handleProjectDelete = (deletedProjectId) => {
    // Remove the deleted project from the data array
    setData(currentData =>
      currentData.filter(record => record.id !== deletedProjectId)
    );
    
    // Close the project card if it's currently open
    setIsCardVisible(false);
    setSelectedProject(null);
  };

  const handleProjectOperationChange = (projectId, newOperation) => {
    // Update the project's operation status in the data array
    setData(currentData =>
      currentData.map(record =>
        record.id === projectId 
          ? { ...record, fields: { ...record.fields, 'Operation': newOperation } }
          : record
      )
    );
    
    // If reactivating a project, switch to the active tab
    if (newOperation === 'Active') {
      setActiveTab('active');
    }
    
    // Close the project card if it's currently open
    setIsCardVisible(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div>
        <header className="mb-6">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button 
                onClick={() => setActiveTab('active')}
                className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                  activeTab === 'active' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                Projects Dashboard
              </button>
              <Link to="/templates" className="shrink-0 border-b-2 border-transparent px-1 pb-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700">
                Projects Template
              </Link>
              <button 
                onClick={() => setActiveTab('deactivated')}
                className={`shrink-0 border-b-2 px-1 pb-4 text-sm font-medium ${
                  activeTab === 'deactivated' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                Deactivated Projects
              </button>
            </nav>
          </div>
          <div className="mt-4">
            <p className="mt-2 text-sm text-slate-600">
              {activeTab === 'active' && "View, edit, and manage all active client projects."}
              {activeTab === 'deactivated' && "View and manage deactivated client projects."}
            </p>
          </div>
        </header>

        <div className="flex justify-between items-center mb-6">
          <div className="text-lg font-medium text-blue-600">
            {activeTab === 'active' && (searchQuery ? `Active Projects: ${filteredData.length}` : `Active Projects: ${data.filter(record => record.fields['Operation'] === 'Active' || !record.fields['Operation']).length}`)}
            {activeTab === 'deactivated' && (searchQuery ? `Deactivated Projects: ${filteredData.length}` : `Deactivated Projects: ${data.filter(record => record.fields['Operation'] === 'Deactivated').length}`)}
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && activeTab === 'active' && (
              <>
                <button
                  onClick={() => setIsAddCardVisible(true)}
                  className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Project
                </button>
                {activeTab === 'active' && (
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 text-sm text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="flex items-center gap-2 text-sm text-white bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateClick}
                  className="flex items-center gap-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Update
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center max-w-lg">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder={`Search by ${filterField}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full p-3 pl-10 text-sm text-slate-900 border border-slate-300 rounded-l-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="p-3 text-sm text-slate-700 bg-slate-100 border-l-0 border border-slate-300 rounded-r-lg hover:bg-slate-200 focus:ring-blue-500 focus:border-blue-500"
              >
                {columnHeaders.map(header => (
                  <option key={header} value={header}>{header}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className={colorClasses.button.secondary}>
                  <tr>
                    {columnHeaders.map((header, index) => (
                      <th
                        key={index}
                        className={`px-6 py-3 text-left text-xs font-medium ${colorClasses.text.primary} uppercase tracking-wider`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">

                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={columnHeaders.length + 1} className="text-center py-12">
                        <div className="text-slate-500">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <h3 className="mt-2 text-lg font-medium">No Projects Found</h3>
                          <p className="mt-1 text-sm">Try adjusting your search or filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredData.map((record) => (
                    <tr
                      key={record.id}
                      className={`cursor-pointer transition-colors ${
                        record.fields['Operation'] === 'Deactivated' 
                          ? 'bg-gray-50 hover:bg-gray-100 opacity-75' 
                          : 'hover:bg-slate-50'
                      }`}
                      onClick={() => handleProjectClick(record)}
                    >
                      {columnHeaders.map((header) => {
                        const currentValue = record.fields[header];
                        const editedValue = editedRecords[record.id]?.fields?.[header];
                        
                        // Add a safeguard for date formatting
                        let displayValue = editedValue !== undefined ? editedValue : currentValue;
                        if (header === 'Last Updated' && currentValue) {
                            try {
                                displayValue = format(new Date(currentValue), 'MM/dd/yyyy h:mm a');
                            } catch (e) {
                                console.error(`Invalid date value for 'Last Updated':`, currentValue);
                                displayValue = 'Invalid Date'; // Fallback for invalid dates
                            }
                        }

                        return (
                          <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {isEditing ? (
                              (header === 'Project ID' || header === 'Balance' || header === 'Last Updated') ? (
                                <span className="font-mono text-slate-800">{displayValue}</span>
                              ) : dropdownFields[header] ? (
                                <select
                                  value={displayValue ?? ''}
                                  onChange={(e) => handleCellChange(record.id, header, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-50 p-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Select --</option>
                                  {dropdownFields[header].map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : header.includes('Date') ? (
                                <DatePicker
                                    selected={safeNewDate(displayValue)}
                                    onChange={(date) => handleCellChange(record.id, header, date ? format(date, 'yyyy-MM-dd') : '')}
                                    dateFormat="yyyy-MM-dd"
                                    className="w-full min-w-[20ch] p-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholderText="Pick a date"
                                    onClick={(e) => e.stopPropagation()}
                                />
                               ) : (
                                <input
                                  type={typeof currentValue === 'number' ? 'number' : 'text'}
                                  value={displayValue ?? ''}
                                  onChange={(e) => handleCellChange(record.id, header, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full min-w-[20ch] p-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              )
                            ) : (
                              <span className="text-slate-800 font-medium">
                                {typeof currentValue === 'boolean'
                                  ? (displayValue ? 'Yes' : 'No')
                                  : (displayValue ?? '-')}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {isAddCardVisible && (
        <AddProjectCard
          onClose={() => setIsAddCardVisible(false)}
          onProjectAdded={() => {
            setIsAddCardVisible(false);
            loadData();
          }}
        />
      )}

      {isCardVisible && selectedProject && (
        <Card
          data={selectedProject}
          onClose={() => setIsCardVisible(false)}
          onProjectUpdate={handleProjectUpdate}
          onProjectDelete={handleProjectDelete}
          onProjectOperationChange={handleProjectOperationChange}
        />
      )}

      {isDownloadModalOpen && (
        <DownloadModal
          onClose={() => setIsDownloadModalOpen(false)}
          data={filteredData}
        />
      )}
    </div>
  );
}

const DownloadModal = ({ onClose, data }) => {
  const handleDownload = (format) => {
    const flattenedData = data.map(item => ({ id: item.id, ...item.fields }));
    switch (format) {
      case 'json':
        downloadAsJSON(flattenedData, 'projects.json');
        break;
      case 'csv':
        downloadAsCSV(flattenedData, 'projects.csv');
        break;
      case 'xlsx':
        downloadAsXLSX(flattenedData, 'projects.xlsx');
        break;
      default:
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-lg text-slate-800 font-medium mb-4">Select Download Format</h3>
        <div className="flex space-x-4">
          <button onClick={() => handleDownload('json')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">JSON</button>
          <button onClick={() => handleDownload('csv')} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">CSV</button>
          <button onClick={() => handleDownload('xlsx')} className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">XLSX</button>
        </div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
      </div>
    </div>
  );
};

export default Projects;
