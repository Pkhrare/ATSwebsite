import React, { useState, useCallback, useRef } from 'react';
import RichTextEditor from '../components/richText/RichTextEditor';

const JsonRichTextEditor = () => {
    const [jsonContent, setJsonContent] = useState(`{
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "Welcome to the JSON/Rich Text Editor Playground!",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "This is a utility for consultants to experiment with rich text content and see the corresponding JSON output. You can:",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "• Edit rich text on the right and see JSON update immediately",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "• Paste JSON on the left and click 'Apply Changes' to see it rendered",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      },
      {
        "children": [
          {
            "detail": 0,
            "format": 1,
            "mode": "normal",
            "style": "",
            "text": "• Copy content from either panel using the copy buttons",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      }
    ],
    "direction": null,
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
}`);
    
    const [jsonError, setJsonError] = useState(null);
    const [copyFeedback, setCopyFeedback] = useState({ json: false, richText: false });
    const [richTextContent, setRichTextContent] = useState(jsonContent);
    const [isApplyingJson, setIsApplyingJson] = useState(false);
    const [editorKey, setEditorKey] = useState(0); // Add a key to force re-render
    const richTextEditorRef = useRef(null);

    // Handle changes from the rich text editor (real-time updates to JSON)
    const handleRichTextChange = useCallback((newContent) => {
        // Don't update JSON if we're currently applying JSON changes
        if (isApplyingJson) return;
        
        try {
            const parsedContent = JSON.parse(newContent);
            const formattedJson = JSON.stringify(parsedContent, null, 2);
            setJsonContent(formattedJson);
            setRichTextContent(newContent); // Also update the rich text content state
            setJsonError(null);
        } catch (error) {
            console.error('Error parsing rich text content:', error);
            setJsonError('Error parsing rich text content');
        }
    }, [isApplyingJson]);

    // Handle changes from the JSON textarea (no automatic updates)
    const handleJsonChange = useCallback((event) => {
        const newJsonContent = event.target.value;
        setJsonContent(newJsonContent);
        
        // Validate JSON format but don't update rich text editor yet
        try {
            JSON.parse(newJsonContent);
            setJsonError(null);
        } catch (error) {
            setJsonError('Invalid JSON format');
        }
    }, []);

    // Apply JSON changes to rich text editor (manual trigger)
    const applyJsonToRichText = useCallback(() => {
        try {
            const parsedJson = JSON.parse(jsonContent);
            setJsonError(null);
            
            // Set flag to prevent rich text change handler from running
            setIsApplyingJson(true);
            
            // Update the rich text content state and force a complete re-render
            setRichTextContent(jsonContent);
            setEditorKey(prev => prev + 1); // Force re-render by changing key
            
            // Reset the flag after a longer delay to ensure debounced callbacks have finished
            setTimeout(() => {
                setIsApplyingJson(false);
            }, 300);
        } catch (error) {
            setJsonError('Invalid JSON format');
        }
    }, [jsonContent]);

    // Copy JSON content to clipboard
    const copyJsonContent = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(jsonContent);
            setCopyFeedback(prev => ({ ...prev, json: true }));
            setTimeout(() => setCopyFeedback(prev => ({ ...prev, json: false })), 2000);
        } catch (error) {
            console.error('Failed to copy JSON content:', error);
        }
    }, [jsonContent]);

    // Copy rich text content to clipboard
    const copyRichTextContent = useCallback(async () => {
        try {
            if (richTextEditorRef.current) {
                const editorState = richTextEditorRef.current.getEditorState();
                const jsonContent = JSON.stringify(editorState.toJSON(), null, 2);
                await navigator.clipboard.writeText(jsonContent);
                setCopyFeedback(prev => ({ ...prev, richText: true }));
                setTimeout(() => setCopyFeedback(prev => ({ ...prev, richText: false })), 2000);
            }
        } catch (error) {
            console.error('Failed to copy rich text content:', error);
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        JSON/Rich Text Editor Playground
                    </h1>
                    <p className="text-gray-600">
                        A utility for consultants to experiment with rich text content and see the corresponding JSON output.
                    </p>
                </div>

                {/* Two-panel layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
                    {/* Left Panel - JSON Editor */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900">JSON Content</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={applyJsonToRichText}
                                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors"
                                    disabled={!!jsonError}
                                >
                                    Apply Changes
                                </button>
                                <button
                                    onClick={copyJsonContent}
                                    className={`px-3 py-1 text-white text-sm rounded-md transition-colors ${
                                        copyFeedback.json 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {copyFeedback.json ? 'Copied!' : 'Copy JSON'}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative min-h-[400px]">
                            <textarea
                                value={jsonContent}
                                onChange={handleJsonChange}
                                className={`w-full h-full p-4 font-mono text-sm border rounded-md resize-none text-black ${
                                    jsonError 
                                        ? 'border-red-300 bg-red-50' 
                                        : 'border-gray-300 bg-white'
                                }`}
                                placeholder="Paste your JSON content here..."
                                spellCheck={false}
                            />
                            {jsonError && (
                                <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                    {jsonError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Rich Text Editor */}
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900">Rich Text Preview</h2>
                            <button
                                onClick={copyRichTextContent}
                                className={`px-3 py-1 text-white text-sm rounded-md transition-colors ${
                                    copyFeedback.richText 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {copyFeedback.richText ? 'Copied!' : 'Copy Rich Text'}
                            </button>
                        </div>
                        <div className="flex-1 min-h-[400px]">
                            <RichTextEditor
                                key={editorKey}
                                isEditable={true}
                                initialContent={richTextContent}
                                onChange={handleRichTextChange}
                                editorRef={richTextEditorRef}
                            />
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">How to use:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Edit rich text:</strong> Use the toolbar to format text, add images, YouTube videos, etc. Changes appear in JSON immediately.</li>
                        <li>• <strong>Edit JSON:</strong> Paste or modify JSON content in the left panel, then click "Apply Changes" to see it rendered.</li>
                        <li>• <strong>Copy content:</strong> Use the copy buttons to copy either JSON or rich text content</li>
                        <li>• <strong>One-way sync:</strong> Rich text changes update JSON automatically, but JSON changes require clicking "Apply Changes"</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default JsonRichTextEditor;
