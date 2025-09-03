import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useEffect, useRef } from 'react';
import {
    PASTE_COMMAND,
    $getSelection,
    $isRangeSelection,
    INSERT_PARAGRAPH_COMMAND,
    createCommand,
} from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import { $createImageNode } from './nodes/ImageNode';
import ApiCaller from '../../components/apiCall/ApiCaller';

export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND');

export default function UnifiedPastePlugin({ sourceTable, sourceRecordId }) {
    const [editor] = useLexicalComposerContext();
    const fileInputRef = useRef(null);
    
    // Debug logging
    console.log('UnifiedPastePlugin initialized with:', { sourceTable, sourceRecordId });

    const uploadImage = useCallback(async (file) => {
        console.log('uploadImage called with:', { file, sourceTable, sourceRecordId });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceTable', sourceTable);
        formData.append('sourceRecordId', sourceRecordId);

        try {
            console.log('Sending image upload request to /upload-image');
            const response = await ApiCaller('/upload-image', {
                method: 'POST',
                body: formData,
            });
            console.log('Image upload response:', response);
            const imageUrl = response.url;
            editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: imageUrl, altText: file.name });
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Image upload failed.');
        }
    }, [editor, sourceTable, sourceRecordId]);

    useEffect(() => {
        // Handles image insertion from button click or paste
        const unregisterInsert = editor.registerCommand(
            INSERT_IMAGE_COMMAND,
            (payload) => {
                const imageNode = $createImageNode(payload);
                editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                        selection.insertNodes([imageNode]);
                        editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined);
                    }
                });
                return true;
            },
            1,
        );
        
        // Handles all paste events
        const unregisterPaste = editor.registerCommand(
            PASTE_COMMAND,
            (event) => {
                const clipboardData = event.clipboardData;
                if (!clipboardData) return false;

                // Check for image files first
                const files = Array.from(clipboardData.files);
                const imageFile = files.find(file => file.type.startsWith('image/'));

                if (imageFile) {
                    uploadImage(imageFile);
                    return true; // We handled the paste
                }

                // If no image, check for HTML content
                const html = clipboardData.getData('text/html');
                if (html) {
                    editor.update(() => {
                        const parser = new DOMParser();
                        const dom = parser.parseFromString(html, 'text/html');
                        const nodes = $generateNodesFromDOM(editor, dom);
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertNodes(nodes);
                        }
                    });
                    return true; // We handled the paste
                }

                return false; // Let default plain text paste happen
            },
            1 // High priority to triage all paste events
        );

        return () => {
            unregisterInsert();
            unregisterPaste();
        };
    }, [editor, uploadImage]);
    
    // Logic for the toolbar button to open the file dialog
    const openFileDialog = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };
    
    useEffect(() => {
        return editor.registerCommand('OPEN_IMAGE_UPLOAD', () => {
            console.log('OPEN_IMAGE_UPLOAD command received, opening file dialog');
            openFileDialog();
            return true;
        }, 1);
    }, [editor]);

    return <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
        console.log('File input change event:', e.target.files[0]);
        uploadImage(e.target.files[0]);
    }} style={{ display: 'none' }} />;
}
