import React, { useEffect, useState, useCallback } from 'react';
import Nav from '../components/layout/Nav';
import '../Pages/All.css';
import Card from '../components/cards/ProjectCard';
import AddProjectCard from '../components/cards/AddProjectCard';
import { dropdownFields, safeNewDate } from '../utils/validations';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import ApiCaller from '../components/apiCall/ApiCaller';


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

  const columnHeaders = React.useMemo(() => {
    const set = new Set();
    data.forEach(r => Object.keys(r.fields).forEach(k => set.add(k)));
    const columns = Array.from(set);

    // Remove unwanted columns
    const filteredColumns = columns.filter(column =>
      column !== 'Pending Action (Client, Consulting or State)' &&
      column !== 'Notes' &&
      column !== 'Estimated Completion' &&
      column !== 'Actions' &&
      column !== 'Documents' &&
      column !== 'ServiceMilestones' &&
      column !== 'Tasks' &&
      column !== 'collaborator_name' &&
      column !== "collaborators"
    );

    // Reorder columns to have 'Full Cost', 'Paid', 'Balance' next to each other
    const reorderedColumns = [
      ...filteredColumns.filter(column => column !== 'Full Cost' && column !== 'Paid' && column !== 'Balance'),
      'Full Cost',
      'Paid',
      'Balance'
    ];

    return reorderedColumns;
  }, [data]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery) {
      return data;
    }
    return data.filter(record => {
      const fieldValue = record.fields[filterField];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (typeof fieldValue === 'number') {
        return fieldValue.toString().toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
    });
  }, [data, searchQuery, filterField]);

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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedRecords({});
  };



  const handleUpdateClick = async () => {
    const updates = Object.values(editedRecords).map(record => ({
      id: record.id,
      fields: {
        ...record.fields,
        Balance: (Number(record.fields['Full Cost']) || 0) - (Number(record.fields['Paid']) || 0)
      }
    }));

    try {
      if (updates.length) await apiFetch('/records', {
        method: 'PATCH',
        body: JSON.stringify({ recordsToUpdate: updates, tableName: 'projects' })
      });
      await loadData();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Nav />
      <main className="bg-slate-50 min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Projects Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">View, edit, and manage all client projects.</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              {!isEditing && (
                <>
                  <button
                    onClick={() => setIsAddCardVisible(true)}
                    className="flex items-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Add Project
                  </button>
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 text-sm text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg shadow-sm transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    Edit
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
          </header>

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
                <thead className="bg-slate-50">
                  <tr>
                    {columnHeaders.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
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
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => handleProjectClick(record)}
                    >
                      {columnHeaders.map((header) => {
                        const currentValue = record.fields[header];
                        const editedValue = editedRecords[record.id]?.fields?.[header];
                        const displayValue = editedValue !== undefined ? editedValue : header === 'Last Updated' ? format(new Date(currentValue), 'MM/dd/yyyy h:mm a') : currentValue;

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
      </main>

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
        />
      )}
    </>
  );
}

export default Projects;
