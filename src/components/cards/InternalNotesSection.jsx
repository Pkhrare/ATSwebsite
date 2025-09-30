import React, { useState, useEffect, useRef } from 'react';
import RichTextEditor from '../richText/RichTextEditor';
import ApiCaller from '../apiCall/ApiCaller';
import { colorClasses } from '../../utils/colorUtils';

const InternalNotesSection = ({ projectId, currentUser, userRole, projectIDReadable }) => {
    const [internalNotes, setInternalNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notesEditorRef = useRef(null);

    // Only show this section to consultants
    if (userRole !== 'consultant') {
        return null;
    }

    const fetchInternalNotes = async () => {
        if (!projectId) return;
        
        setIsLoading(true);
        try {
            console.log('Fetching internal notes for project:', projectIDReadable);
            const response = await ApiCaller(`/records/filter/${projectIDReadable}/internal_notes`);
            console.log('Internal notes API response:', response);
            const notes = Array.isArray(response?.records) ? response.records : [];
            console.log('Parsed notes:', notes);
            // Sort by created time, newest first
            const sortedNotes = notes.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
            console.log('Sorted notes:', sortedNotes);
            setInternalNotes(sortedNotes);
        } catch (error) {
            console.error('Failed to fetch internal notes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInternalNotes();
    }, [projectId]);

    const handleAddNote = async () => {
        if (!newNoteContent || !notesEditorRef.current) return;

        setIsSubmitting(true);
        try {
            // Get the current content from the editor
            const currentContent = notesEditorRef.current.getEditorState().toJSON();
            const contentString = JSON.stringify(currentContent);
            
            const userIdentifier = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
            
            const newNote = {
                fields: {
                    Projects: [projectId],
                    Notes: contentString,
                    User: userIdentifier
                }
            };

            console.log('Creating new internal note:', newNote);
            console.log('Project ID:', projectId);
            console.log('User identifier:', userIdentifier);

            const createResponse = await ApiCaller('/records', {
                method: 'POST',
                body: JSON.stringify({ 
                    recordsToCreate: [newNote],
                    tableName: 'internal_notes'
                })
            });

            console.log('Note creation response:', createResponse);

            // Add a small delay to ensure the note is committed to the database
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refresh the notes list
            await fetchInternalNotes();
            
            // Reset the form
            setNewNoteContent(null);
            setIsAddingNote(false);
            
        } catch (error) {
            console.error('Failed to add internal note:', error);
            alert('Failed to add note. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <section className={`${colorClasses.card.base} p-5 rounded-xl shadow-sm`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${colorClasses.card.header}`}>📝 Internal Notes</h2>
                {!isAddingNote && (
                    <button 
                        onClick={() => setIsAddingNote(true)} 
                        className={`flex items-center gap-2 text-sm ${colorClasses.button.secondary} px-3 py-1.5 rounded-lg shadow-sm transition-all`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Note
                    </button>
                )}
            </div>

            {/* Add Note Form */}
            {isAddingNote && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="mb-3">
                        <label className={`block text-sm font-medium ${colorClasses.form.label} mb-2`}>
                            Add Internal Note
                        </label>
                        <RichTextEditor
                            isEditable={true}
                            initialContent={null}
                            onChange={(content) => setNewNoteContent(content)}
                            editorRef={notesEditorRef}
                            sourceTable="internal_notes"
                            sourceRecordId={projectId}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => {
                                setIsAddingNote(false);
                                setNewNoteContent(null);
                            }} 
                            className={`text-sm ${colorClasses.button.accent} px-4 py-2 rounded-md`}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddNote}
                            disabled={isSubmitting || !newNoteContent}
                            className={`text-sm ${colorClasses.button.success} px-4 py-2 rounded-md disabled:opacity-50`}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Note'}
                        </button>
                    </div>
                </div>
            )}

            {/* Notes List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-slate-500 mt-2">Loading notes...</p>
                    </div>
                ) : internalNotes.length === 0 ? (
                    <div className="text-center py-8">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-slate-500">No internal notes yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Add the first note to start logging project changes.</p>
                    </div>
                ) : (
                    internalNotes.map((note) => (
                        <div key={note.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{note.fields.User}</p>
                                        <p className="text-xs text-slate-500">{formatTimestamp(note.createdTime)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="prose prose-sm max-w-none">
                                <RichTextEditor
                                    isEditable={false}
                                    initialContent={note.fields.Notes}
                                    sourceTable="internal_notes"
                                    sourceRecordId={note.id}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

export default InternalNotesSection;
