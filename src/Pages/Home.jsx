import React, { useEffect, useState, useCallback } from 'react';
import Nav from '../components/Nav';
import '../Pages/All.css';
import { GET_LIST_AirtableData, UPDATE_MULTIPLE_RECORDS, CREATE_RECORDS, GET_RECORD_AirtableData, UPDATE_RECORD_AirtableData } from '../utils/AirtableAPI';
import Card from '../components/Card';
import {dropdownFields, validateRow } from '../utils/validations';


async function globalProjectCounter() {
  try {
    const records = await GET_RECORD_AirtableData('counter');
    return records;
  } catch (e) {
    console.error('Failed to load:', e);
    return null; // Return null or handle the error appropriately
  }
}

async function generateProjectID(state, projectType, startDate) {
  console.log("Generating Project ID, state:", state, "projectType:", projectType, "startDate:", startDate);
  if (!state || !projectType || !startDate) return '';
  const serviceType = projectType.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const formattedDate = new Date(startDate).toISOString().slice(2, 10).replace(/-/g, '').slice(0, 6);
  
  const counter_obj = await globalProjectCounter();
  console.log("Counter object:", counter_obj);
  if (!counter_obj) return ''; // Handle the case where fetching the counter fails

  const counter = counter_obj.fields['Counter'];
  await UPDATE_RECORD_AirtableData({
    fields: {
      'Counter': counter + 1,
    },
    id: counter_obj.id,
    tableName: "counter"
  });
  return `${state}${serviceType}-${formattedDate}P${counter + 1}`;
}



function Home() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecords, setEditedRecords] = useState({});
  const [newRows, setNewRows] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [errors, setErrors] = useState({});

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
      column !== 'Documents'
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const records = await GET_LIST_AirtableData();
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
    setNewRows([]);
    setErrors({});
  };



  const handleUpdateClick = async () => {
    const updates = Object.values(editedRecords).map(record => ({
      id: record.id,
      fields: {
        ...record.fields,
        Balance: (Number(record.fields['Full Cost']) || 0) - (Number(record.fields['Paid']) || 0)
      }
    }));

    const inserts = [];
    const newErrors = {};

    for (let row of newRows) {
      const errs = validateRow(row.fields, true);
      if (Object.keys(errs).length > 0) {
        newErrors[row.id] = errs;
        continue;
      }
      
      if (!row.fields['Project ID']) {
        console.log("Generating Project ID");
        row.fields['Project ID'] = await generateProjectID(row.fields['States'], row.fields['Project Type'], row.fields['Start Date']);
      }
      console.log('Project ID:', row.fields['Project ID']);
      
      row.fields['Balance'] = (Number(row.fields['Full Cost']) || 0) - (Number(row.fields['Paid']) || 0);
      inserts.push({ fields: row.fields });
      console.log(inserts);
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (updates.length) await UPDATE_MULTIPLE_RECORDS(updates);
      if (inserts.length) await CREATE_RECORDS(inserts);
      await loadData();
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setIsEditing(false);
      setEditedRecords({});
      setNewRows([]);
      setErrors({});
    //   setIsCardVisible(false);
    }
  };

  const handleAddRow = () => {
    const empty = {};
    columnHeaders.forEach(k => empty[k] = '');
    setNewRows(p => [...p, { id: `new-${Date.now()}`, fields: empty }]);
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

  const handleNewRowChange = (id, key, value) => {
    setNewRows(prev => prev.map(row => row.id === id ? {
      ...row,
      fields: { ...row.fields, [key]: value }
    } : row));
  };

  const handleProjectClick = (record) => {
    if (!isEditing) {
      setSelectedProject(record);
      setIsCardVisible(true);
    }
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
      <div className="p-6 flex justify-end mb-4 space-x-2">
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit
          </button>
        )}
        {isEditing && (
          <>
            <button
              onClick={handleAddRow}
              className="px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              + Add
            </button>
            <button
              onClick={handleUpdateClick}
              className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Update
            </button>
          </>
        )}
      </div>

      <div className="p-6 pt-0 overflow-x-auto max-h-[80vh]">
        <table className="min-w-full table-auto border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              {columnHeaders.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
              {isEditing && newRows.length > 0 && (
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">

            {/* New rows */}
            {isEditing && newRows.map((row) => (
              <tr key={row.id} className="bg-yellow-50 hover:bg-yellow-100">
                {columnHeaders.map((header) => (
                  <td key={header} className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {(header === 'Project ID' || header === 'Balance') ? (
                      <span>{row.fields[header]}</span>
                    ) : dropdownFields[header] ? (
                      <select
                        value={row.fields[header] || ''}
                        onChange={(e) => handleNewRowChange(row.id, header, e.target.value)}
                        className="w-full p-1 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="">-- Select --</option>
                        {dropdownFields[header].map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={row.fields[header] || ''}
                        onChange={(e) => handleNewRowChange(row.id, header, e.target.value)}
                        className="w-full p-1 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    )}
                    {errors[row.id]?.[header] && (
                      <p className="text-red-500 text-xs mt-1">{errors[row.id][header]}</p>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                  <button
                    onClick={() => setNewRows(prev => prev.filter(r => r.id !== row.id))}
                    className="text-red-600 text-xs hover:underline"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}

            {/* Existing rows */}
            {data.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleProjectClick(record)}
              >
                {columnHeaders.map((header) => {
                  const currentValue = record.fields[header];
                  const editedValue = editedRecords[record.id]?.fields?.[header];
                  const displayValue = editedValue !== undefined ? editedValue : currentValue;

                  return (
                    <td key={header} className="px-3 py-3 whitespace-nowrap text-sm text-gray-700">
                      {isEditing ? (
                        (header === 'Project ID' || header === 'Balance') ? (
                          <span>{displayValue}</span>
                        ) : dropdownFields[header] ? (
                          <select
                            value={displayValue ?? ''}
                            onChange={(e) => handleCellChange(record.id, header, e.target.value)}
                            className="w-full p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Select --</option>
                            {dropdownFields[header].map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={typeof currentValue === 'number' ? 'number' : 'text'}
                            value={displayValue ?? ''}
                            onChange={(e) => handleCellChange(record.id, header, e.target.value)}
                            className="min-w-[20ch] px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )
                      ) : (
                        typeof currentValue === 'boolean'
                          ? (displayValue ? 'Yes' : 'No')
                          : (displayValue ?? '-')
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isEditing && isCardVisible && <Card data={selectedProject} onClose={() => setIsCardVisible(false)} />}
    </>
  );
}

export default Home;
