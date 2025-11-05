import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    $createTextNode,
    $getRoot,
    FORMAT_TEXT_COMMAND,
    $selectAll,
    $getNodeByKey,
    $isTextNode,
    INDENT_CONTENT_COMMAND,
    OUTDENT_CONTENT_COMMAND,
    KEY_TAB_COMMAND,
} from 'lexical';
import CodeEditorModal from './CodeEditorModal';
import ConfirmationDialog from './ConfirmationDialog';
import CodeRenderer from './CodeRenderer';
import AITextEditModal from '../aiAssistant/AITextEditModal';
import { toLexical } from '../../utils/lexicalUtils';
import {
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
    $isListItemNode,
    $isListNode,
} from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $patchStyleText } from '@lexical/selection';

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {HashtagPlugin} from '@lexical/react/LexicalHashtagPlugin';
import {AutoLinkPlugin} from '@lexical/react/LexicalAutoLinkPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';

import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {ListNode, ListItemNode} from '@lexical/list';
import {CodeNode} from '@lexical/code';
import {HashtagNode} from '@lexical/hashtag';
import {AutoLinkNode, LinkNode} from '@lexical/link';
import { ImageNode, $isImageNode } from './nodes/ImageNode';
import { YouTubeNode, $createYouTubeNode } from './nodes/YouTubeNode';
import UnifiedPastePlugin, { INSERT_YOUTUBE_COMMAND } from './UnifiedPastePlugin';

const DEFAULT_FONT_SIZE = '14px';

// New component to handle link clicks in read-only mode.
function ClickableLinkPlugin({ isEditable }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        // Apply styles and handle clicks
        const applyLinkBehavior = () => {
            const links = rootElement.querySelectorAll('a');
            links.forEach(link => {
                link.classList.add('text-blue-600', 'underline', 'cursor-pointer');
                if (!isEditable) {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
            });
        };

        // Initial application
        applyLinkBehavior();

        // Re-apply on updates
        const unregister = editor.registerUpdateListener(() => {
            applyLinkBehavior();
        });

        return () => {
            unregister();
        };

    }, [editor, isEditable]);

    return null;
}

// Simple table insertion fallback
function insertSimpleTable(editor, rows, cols) {
    editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const tableText = `\n\n[TABLE ${rows}x${cols}]\n` +
                Array.from({length: rows}, (_, i) =>
                    Array.from({length: cols}, (_, j) => `Cell ${i+1}-${j+1}`).join(' | ')
                ).join('\n') + '\n[/TABLE]\n\n';

            selection.insertText(tableText);
        }
    });
}

// Table plugin component - simplified version
function TablePluginComponent() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        let unregister;

        const initTablePlugin = async () => {
            try {
                const tableModule = await import('@lexical/table');
                if (tableModule && tableModule.registerTablePlugin) {
                    unregister = tableModule.registerTablePlugin(editor, {
                        hasCellMerge: true,
                        hasCellBackgroundColor: true,
                        hasTabHandler: true,
                    });
                }
            } catch (error) {
                console.warn('Table plugin not available:', error);
            }
        };

        initTablePlugin();

        return () => {
            if (unregister) unregister();
        };
    }, [editor]);

    return null;
}

// --- Toolbar Plugin ---
function ToolbarPlugin({ 
  onSwitchToCode = () => {},
  setRichTextBackup = () => {},
  setConfirmationAction = () => {},
  setIsConfirmationOpen = () => {},
  showCodeEditButton = true,
  onAIEdit = null,
  sourceTable = null,
  sourceRecordId = null
}) {
  const [editor] = useLexicalComposerContext();
  
  // Debug: Log AI edit button visibility
  useEffect(() => {
    if (onAIEdit && sourceTable && sourceRecordId) {
      console.log('AI Edit button should be visible:', { sourceTable, sourceRecordId, hasOnAIEdit: !!onAIEdit });
    } else {
      console.log('AI Edit button NOT visible:', { sourceTable, sourceRecordId, hasOnAIEdit: !!onAIEdit });
    }
  }, [onAIEdit, sourceTable, sourceRecordId]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [selectedImageNode, setSelectedImageNode] = useState(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [hasTableSupport, setHasTableSupport] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);

  // Check if table support is available
  useEffect(() => {
      import('@lexical/table').then(() => {
          setHasTableSupport(true);
      }).catch(() => {
          setHasTableSupport(false);
      });
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));

            const node = selection.getNodes()[0];
            const parent = node ? node.getParent() : null;
            setIsLink(!!(node && $isLinkNode(node)) || !!(parent && $isLinkNode(parent)));

            // Check if an image is selected - use a more stable approach
            const imageNode = selection.getNodes().find(n => $isImageNode(n));
            const hasImageSelected = !!imageNode;
            
            // Use a more conservative update approach
            if (hasImageSelected && !isImageSelected) {
                setIsImageSelected(true);
                setSelectedImageNode(imageNode);
            } else if (!hasImageSelected && isImageSelected) {
                setIsImageSelected(false);
                setSelectedImageNode(null);
            }
            
            // Check if the selection is in a list
            const anchorNode = selection.anchor.getNode();
            let element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
            
            const elementParent = element.getParent();
            const isInList = elementParent && elementParent.getType() === 'list';
            
            if (isInList) {
                const listType = elementParent.getListType();
                setIsUnorderedList(listType === 'bullet');
                setIsOrderedList(listType === 'number');
            } else {
                setIsUnorderedList(false);
                setIsOrderedList(false);
            }
        }
      });
    });
  }, [editor, isImageSelected]);

  const applyFontSize = useCallback((size) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': size });
      }
    });
  }, [editor]);

  const changeFontSize = useCallback((direction) => {
    const currentSize = parseInt((fontSize || DEFAULT_FONT_SIZE).replace('px', ''));
    let newSize;
    if (direction === 'increase') {
        newSize = Math.min(currentSize + 1, 50);
    } else {
        newSize = Math.max(currentSize - 1, 5);
    }
    const newSizePx = `${newSize}px`;
    // Set the state to update the UI immediately
    setFontSize(newSizePx);
    // Then apply the style to the editor state
    applyFontSize(newSizePx);
  }, [fontSize, applyFontSize, editor]);

  const insertLink = useCallback(() => {
    // Handle image linking
    if (isImageSelected && selectedImageNode) {
        const currentHref = selectedImageNode.getHref();
        const url = prompt(
            currentHref 
                ? `Current link: ${currentHref}\n\nEnter new URL (or leave empty to remove link):`
                : 'Enter the URL for this image:'
        );
        
        if (url !== null) { // User didn't cancel
            // Use a more stable update approach
            editor.update(() => {
                const writableNode = selectedImageNode.getWritable();
                if (url.trim() === '') {
                    // Remove link
                    writableNode.__href = null;
                } else {
                    // Validate URL
                    try {
                        new URL(url);
                        writableNode.__href = url;
                    } catch (error) {
                        alert('Please enter a valid URL (e.g., https://example.com)');
                        return;
                    }
                }
            }, {
                onUpdate: () => {
                    // Ensure the editor maintains focus
                    editor.focus();
                }
            });
        }
        return;
    }

    // Handle text linking (existing logic)
    if (isLink) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        return;
    }

    let isTextSelected = false;
    editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.getTextContent().trim() !== '') {
            isTextSelected = true;
        }
    });

    if (!isTextSelected) {
        alert('Please select some text or an image first, then click the Link button to make it clickable.');
        return;
    }

    const url = prompt('Enter the URL:');
    if (url) {
        // Validate URL
        try {
            new URL(url);
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        } catch (error) {
            alert('Please enter a valid URL (e.g., https://example.com)');
        }
    }
  }, [editor, isLink, isImageSelected, selectedImageNode]);

  const insertImage = useCallback(() => {
    console.log('Image button clicked, dispatching OPEN_IMAGE_UPLOAD command');
    // Dispatch a custom command that the ImagePlugin will listen for
    editor.dispatchCommand('OPEN_IMAGE_UPLOAD', undefined);
  }, [editor]);

  const insertYouTube = useCallback(() => {
    const url = prompt('Enter YouTube URL or iframe embed code:');
    if (!url) return;

    console.log('YouTube button clicked with URL:', url);

    // Check if it's an iframe embed code
    const iframeMatch = url.match(/src="([^"]+)"/);
    if (iframeMatch) {
      const src = iframeMatch[1];
      console.log('Detected iframe, src:', src);
      editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, { src });
      return;
    }

    // Check if it's a YouTube URL and convert to embed format
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      const embedSrc = `https://www.youtube.com/embed/${videoId}`;
      console.log('Detected YouTube URL, converted to:', embedSrc);
      editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, { src: embedSrc });
      return;
    }

    // If it doesn't match YouTube patterns, try to use it as-is
    console.log('Using URL as-is:', url);
    editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, { src: url });
  }, [editor]);

  const insertTable = useCallback(async () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');

    if (rows && cols) {
      const numRows = parseInt(rows, 10);
      const numCols = parseInt(cols, 10);

      if (numRows > 0 && numCols > 0 && numRows <= 100 && numCols <= 15) {
        if (hasTableSupport) {
          try {
            const tableModule = await import('@lexical/table');
            console.log('Inserting table with command:', tableModule.INSERT_TABLE_COMMAND);
            editor.dispatchCommand(tableModule.INSERT_TABLE_COMMAND, {
              columns: numCols,
              rows: numRows,
            });
            console.log('Table command dispatched successfully');
          } catch (error) {
            console.error('Failed to insert table:', error);
            insertSimpleTable(editor, numRows, numCols);
            alert('Fell back to simple table format.');
          }
        } else {
          insertSimpleTable(editor, numRows, numCols);
          alert('Basic table inserted. Install @lexical/table for full functionality.');
        }
      } else {
        alert('Please enter valid numbers (rows: 1-100, columns: 1-15)');
      }
    }
  }, [editor, hasTableSupport]);
  
  const toggleBulletList = useCallback(() => {
    if (isUnorderedList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }
  }, [editor, isUnorderedList]);
  
  const toggleNumberedList = useCallback(() => {
    if (isOrderedList) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  }, [editor, isOrderedList]);

  return (
      <div
          className="flex items-center gap-2 p-2 bg-slate-100 border-b border-slate-300 rounded-t-md flex-wrap"
          onMouseDown={(e) => e.preventDefault()}
      >
          <button
              type="button"
              onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${isBold ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Format Bold"
          >
              Bold
          </button>
          <button
              type="button"
              onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${isItalic ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Format Italic"
          >
              Italic
          </button>
          <button
              type="button"
              onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${isUnderline ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Format Underline"
          >
              Underline
          </button>
          <button
              type="button"
              onClick={insertLink}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                  isLink || (isImageSelected && selectedImageNode?.getHref()) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
              aria-label="Insert Link"
          >
              {isImageSelected 
                  ? (selectedImageNode?.getHref() ? 'Unlink Image' : 'Link Image')
                  : (isLink ? 'Unlink' : 'Link')
              }
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          {/* Font Size Controls */}
          <div className="flex items-center gap-1">
              <button
                  type="button"
                  onClick={() => changeFontSize('decrease')}
                  className="px-2 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200 border"
                  aria-label="Decrease Font Size"
              >
                  A-
              </button>
              <input
                  type="number"
                  value={fontSize.replace('px', '')}
                  onChange={(e) => {
                      const newSize = e.target.value;
                      if (newSize) {
                          applyFontSize(`${newSize}px`);
                      }
                  }}
                  className="w-12 text-center py-1 rounded-md text-sm bg-white text-slate-700 border hover:bg-slate-50"
                  aria-label="Font Size"
                  onMouseDown={(e) => e.stopPropagation()}
              />
              <button
                  type="button"
                  onClick={() => changeFontSize('increase')}
                  className="px-2 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200 border"
                  aria-label="Increase Font Size"
              >
                  A+
              </button>
          </div>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          <button
              type="button"
              onClick={toggleBulletList}
              className={`px-3 py-1 rounded-md text-sm font-medium ${isUnorderedList ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Bullet List"
          >
              • List
          </button>
          <button
              type="button"
              onClick={toggleNumberedList}
              className={`px-3 py-1 rounded-md text-sm font-medium ${isOrderedList ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Numbered List"
          >
              1. List
          </button>

          <div className="w-px h-6 bg-slate-300 mx-1"></div>

          <button
              type="button"
              onClick={insertImage}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200"
              aria-label="Insert Image"
          >
              Image
          </button>
          <button
              type="button"
              onClick={insertYouTube}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200"
              aria-label="Insert YouTube Video"
          >
              YouTube
          </button>
          <button
              type="button"
              onClick={insertTable}
              className="px-3 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200"
              aria-label="Insert Table"
              title={hasTableSupport ? "Insert Table (full functionality)" : "Insert Table (basic text)"}
          >
              Table {!hasTableSupport && '⚠️'}
          </button>
          
          {showCodeEditButton && (
            <>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              
              <button
                  type="button"
                  onClick={() => {
                    const editorState = editor.getEditorState();
                    const jsonString = JSON.stringify(editorState.toJSON());
                    setRichTextBackup(jsonString);
                    
                    setConfirmationAction(() => () => {
                      onSwitchToCode();
                    });
                    setIsConfirmationOpen(true);
                  }}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-200"
                  aria-label="Edit HTML/CSS/JS Code"
                  title="Edit HTML/CSS/JS Code"
              >
                  <span className="inline-block">&lt;/&gt;</span>
              </button>
            </>
          )}
          
          {onAIEdit && sourceTable && sourceRecordId && (
            <>
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              
              <button
                  type="button"
                  onClick={() => {
                    const editorState = editor.getEditorState();
                    const jsonString = JSON.stringify(editorState.toJSON());
                    onAIEdit(jsonString);
                  }}
                  className="px-3 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-sm"
                  aria-label="AI Edit Text"
                  title="AI Edit Text (Uses project and record context)"
              >
                  <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="font-medium">AI Edit</span>
                  </span>
              </button>
            </>
          )}
      </div>
  );
}

// Component to dynamically set the editable state of the editor
function SetEditablePlugin({isEditable}) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editor.setEditable(isEditable);
    }, [editor, isEditable]);
    return null;
}

// Plugin to listen for changes and notify the parent component
function OnChangePlugin({ onChange }) {
    const [editor] = useLexicalComposerContext();
    const timeoutRef = useRef(null);
    
    useEffect(() => {
        if (!onChange) return;
        return editor.registerUpdateListener(({ editorState }) => {
            // Debounce the onChange callback to prevent excessive re-renders
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
                const editorStateJSON = editorState.toJSON();
                onChange(JSON.stringify(editorStateJSON));
            }, 100); // 100ms debounce
        });
    }, [editor, onChange]);
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    
    return null;
}

// Plugin to load initial content from a prop (Final, More Robust Version)
function InitialContentPlugin({ initialContent }) {
    const [editor] = useLexicalComposerContext();
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        // Only initialize content once to prevent re-renders
        if (hasInitialized) return;
        
        editor.update(() => {
            const root = $getRoot();

            if (!initialContent) {
                // Ensure root is never empty
                if (root.getChildrenSize() === 0) {
                    const paragraph = $createParagraphNode();
                    root.append(paragraph);
                }
                setHasInitialized(true);
                return;
            }

            try {
                let parsedJson;

                // Handle cases where content might already be an object (e.g., from HMR)
                if (typeof initialContent === 'object' && initialContent !== null) {
                    parsedJson = initialContent;
                } else {
                    // Fix invalid escape sequences in URLs before parsing
                    let sanitizedContent = initialContent;
                    if (typeof initialContent === 'string') {
                        // Fix the common issue where underscores in URLs get incorrectly escaped
                        sanitizedContent = initialContent.replace(/\\_/g, '_');
                    }
                    parsedJson = JSON.parse(sanitizedContent);
                }

                // Handle cases where the content might be wrapped in an array or is double-stringified
                if (Array.isArray(parsedJson)) {
                    parsedJson = parsedJson[0];
                }
                if (typeof parsedJson === 'string') {
                    parsedJson = JSON.parse(parsedJson);
                }

                // Handle the editorState wrapper structure
                if (parsedJson && parsedJson.editorState && parsedJson.editorState.root) {
                    parsedJson = parsedJson.editorState;
                }

                // Validate that parsedJson has the expected structure
                if (!parsedJson || typeof parsedJson !== 'object' || !parsedJson.root) {
                    throw new Error('Invalid Lexical JSON structure');
                }

                // Parse and set the editor state directly
                const parsedState = editor.parseEditorState(parsedJson);
                editor.setEditorState(parsedState);

            } catch (error) {
                // If any step fails, fall back to treating it as plain text.
                console.warn('Could not parse initial content as Lexical JSON, treating as plain text.', error);

                // Ensure root is never empty
                root.clear();
                const paragraph = $createParagraphNode();
                
                // Show a user-friendly error for truncated content
                if (error.message && error.message.includes('Unexpected end of JSON input')) {
                    const errorText = $createTextNode('⚠️ Content too large to display properly. This content may have exceeded storage limits. The new attachment system will resolve this issue.');
                    paragraph.append(errorText);
                } else {
                    // For other errors, try to display as plain text
                    if (typeof initialContent === 'string') {
                        paragraph.append($createTextNode(initialContent));
                    } else {
                        paragraph.append($createTextNode('Content could not be loaded.'));
                    }
                }
                
                root.append(paragraph);
            }
            
            setHasInitialized(true);
        });
    }, [editor, initialContent, hasInitialized]);

    return null;
}


// Plugin to expose the editor instance via a ref
function SetRefPlugin({ editorRef }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (editorRef) {
            editorRef.current = editor;
        }
        return () => {
            if (editorRef) {
                editorRef.current = null;
            }
        };
    }, [editor, editorRef]);
    return null;
}

// Plugin to convert iframe text nodes to YouTube nodes
function ConvertIframePlugin() {
    const [editor] = useLexicalComposerContext();
    
    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const root = $getRoot();
                const children = root.getChildren();
                
                children.forEach((child) => {
                    if (child.getType() === 'paragraph') {
                        const paragraphChildren = child.getChildren();
                        paragraphChildren.forEach((textNode) => {
                            if ($isTextNode(textNode)) {
                                const text = textNode.getTextContent();
                                const iframeMatch = text.match(/<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*>/i);
                                if (iframeMatch) {
                                    const src = iframeMatch[1];
                                    console.log('Converting iframe text to YouTube node:', src);
                                    
                                    // Replace the text node with a YouTube node
                                    editor.update(() => {
                                        const youtubeNode = $createYouTubeNode({ src });
                                        textNode.replace(youtubeNode);
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });
    }, [editor]);
    
    return null;
}

// Plugin to handle cursor positioning around images
function ImageCursorPlugin() {
    const [editor] = useLexicalComposerContext();
    
    useEffect(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        const handleClick = (event) => {
            const target = event.target;
            
            // Check if the click is on an image
            if (target.tagName === 'IMG') {
                const img = target;
                const imageContainer = img.closest('[data-lexical-decorator]');
                
                if (imageContainer) {
                    const rect = imageContainer.getBoundingClientRect();
                    const clickX = event.clientX;
                    const imageCenter = rect.left + (rect.width / 2);
                    
                    // Determine if click is on left or right side of image
                    const isLeftSide = clickX < imageCenter;
                    
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            // Find the image node
                            const imageNode = selection.getNodes().find(n => $isImageNode(n));
                            if (imageNode) {
                                if (isLeftSide) {
                                    // Position cursor before the image
                                    const textNode = $createTextNode('');
                                    imageNode.insertBefore(textNode);
                                    textNode.select();
                                } else {
                                    // Position cursor after the image
                                    const textNode = $createTextNode('');
                                    imageNode.insertAfter(textNode);
                                    textNode.select();
                                }
                            }
                        }
                    });
                }
            }
        };

        rootElement.addEventListener('click', handleClick);
        
        return () => {
            rootElement.removeEventListener('click', handleClick);
        };
    }, [editor]);
    
    return null;
}

// Plugin for handling nested lists with Tab and Shift+Tab
function NestedListPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const unregister = editor.registerCommand(
            KEY_TAB_COMMAND,
            (event) => {
                const editorState = editor.getEditorState();
                let listItemNode = null;

                editorState.read(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;
                    
                    const node = selection.anchor.getNode();
                    const parent = findParent(node, $isListItemNode);
                    if (parent) {
                        listItemNode = parent;
                    }
                });

                if (listItemNode) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
                    } else {
                        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
                    }
                    return true;
                }
                return false;
            },
            1, // High priority
        );

        function findParent(node, predicate) {
            let parent = node;
            while (parent !== null) {
                if (predicate(parent)) {
                    return parent;
                }
                parent = parent.getParent();
            }
            return null;
        }

        return () => {
            unregister();
        };
    }, [editor]);

    return null;
}

const editorTheme = {
  link: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
  table: 'mobile-table-wrapper border-collapse my-4 w-full border border-slate-400 overflow-hidden',
  tableRow: 'border-b border-slate-300',
  tableCell: 'border border-slate-400 p-2 md:p-3 min-w-[150px] relative bg-white text-sm md:text-sm break-words',
  tableCellHeader: 'border border-slate-400 p-2 md:p-3 min-w-[150px] bg-slate-100 font-semibold relative text-sm md:text-sm break-words',
  youtube: 'my-4 w-full max-w-4xl mx-auto',
  image: 'block w-full h-auto', // Full-width responsive images
  list: {
    ul: 'list-[disc] ml-6 pl-2',
    ol: 'list-[decimal] ml-6 pl-2',
    listitem: 'my-1',
    nested: {
      listitem: 'list-none',
    },
    ulDepth: [
      'list-[disc]',
      'list-[circle]',
      'list-[square]',
      'list-dash',
      'list-check',
    ],
    olDepth: [
      'list-[decimal]',
      'list-[lower-alpha]',
      'list-[lower-roman]',
      'list-[decimal]',
      'list-[lower-alpha]',
    ],
  },
  text: {
    base: 'text-base',
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

function onError(error) {
  console.error(error);
}

// A list of matchers for the AutoLinkPlugin.
// For example, to automatically link URLs.
const URL_MATCHER = /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

const MATCHERS = [
  (text) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: match[0],
    };
  },
];

function RichTextEditor({ isEditable, initialContent, onChange, editorRef, sourceTable, sourceRecordId, showCodeEditButton = true, hideContainer = false }) {
    const [tableNodes, setTableNodes] = useState([]);
    const [isTableNodesLoaded, setIsTableNodesLoaded] = useState(false);
    const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [codeContent, setCodeContent] = useState('');
    const [richTextBackup, setRichTextBackup] = useState(null);
    const [isAITextEditModalOpen, setIsAITextEditModalOpen] = useState(false);
    const [currentTextForEdit, setCurrentTextForEdit] = useState(null);

    // Add mobile table styles
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .mobile-table-wrapper {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                width: 100%;
                max-width: 100%;
                border-radius: 0.375rem;
                box-shadow: inset 0 0 0 1px #e2e8f0;
            }
            .mobile-table-wrapper table {
                min-width: 100%;
                table-layout: auto;
                width: 100%;
            }
            @media (max-width: 768px) {
                /* Ensure the rich text editor content area constrains tables but allows table scrolling */
                .prose {
                    overflow-x: visible;
                    max-width: 100%;
                }
                /* Target the ContentEditable area specifically - allow table scrolling */
                [contenteditable="true"] {
                    overflow-x: visible;
                    max-width: 100%;
                }
                /* Only prevent overflow for non-table content */
                .prose > *:not(.mobile-table-wrapper) {
                    overflow-x: hidden;
                    max-width: 100%;
                }
                .mobile-table-wrapper {
                    overflow-x: auto;
                    overflow-y: hidden;
                    -webkit-overflow-scrolling: touch;
                    max-width: 100%;
                    width: 100%;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.375rem;
                    background: white;
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
                    position: relative;
                    margin: 0;
                    box-sizing: border-box;
                    /* Ensure scrolling works properly */
                    display: block;
                    white-space: nowrap;
                }
                .mobile-table-wrapper table {
                    font-size: 0.75rem; /* 12px - slightly larger for better readability */
                    min-width: 800px; /* Wider minimum width for better column display */
                    table-layout: fixed; /* Fixed layout for consistent column widths */
                    width: 100%;
                    max-width: none; /* Allow table to be wider than container */
                    display: table; /* Ensure proper table display */
                    white-space: normal; /* Allow text wrapping within cells */
                }
                .mobile-table-wrapper table td,
                .mobile-table-wrapper table th {
                    padding: 0.75rem 1rem; /* Even more generous padding */
                    word-wrap: break-word;
                    word-break: break-word;
                    hyphens: auto;
                    line-height: 1.4; /* Better line height for readability */
                    white-space: normal;
                    font-size: 0.875rem; /* 14px - larger, more readable text */
                    overflow-wrap: break-word;
                    vertical-align: top;
                    border-right: 1px solid #e2e8f0;
                    min-width: 150px; /* Wider minimum column width */
                }
                .mobile-table-wrapper table th {
                    font-size: 0.8rem; /* 12.8px - larger header text */
                    font-weight: 600;
                    background-color: #f8fafc;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                    min-height: 3rem;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                .mobile-table-wrapper table td {
                    background-color: white;
                    font-size: 0.875rem; /* 14px - larger cell text */
                    min-height: 2.5rem;
                }
                .mobile-table-wrapper table td strong,
                .mobile-table-wrapper table td b {
                    font-weight: 600;
                    font-size: 0.9rem; /* Larger for bold text like $Amount */
                }
                /* Better word breaking for readability */
                .mobile-table-wrapper table td *,
                .mobile-table-wrapper table th * {
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                /* Scrollbar styling for better UX */
                .mobile-table-wrapper::-webkit-scrollbar {
                    height: 8px;
                }
                .mobile-table-wrapper::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .mobile-table-wrapper::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .mobile-table-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                /* Ensure the table doesn't break out of its container */
                .mobile-table-wrapper {
                    contain: layout;
                }
                /* Add a subtle indicator that content is scrollable */
                .mobile-table-wrapper::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    width: 20px;
                    background: linear-gradient(to left, rgba(255,255,255,0.8), transparent);
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .mobile-table-wrapper:hover::after {
                    opacity: 1;
                }
            }
            @media (min-width: 769px) {
                .mobile-table-wrapper table {
                    table-layout: fixed;
                }
                .mobile-table-wrapper table td,
                .mobile-table-wrapper table th {
                    word-wrap: break-word;
                    word-break: break-word;
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    // Detect if content is code or rich text
    const detectContentType = useCallback((content) => {
        if (!content) return 'rich-text';
        
        // Make sure content is a string before calling trim()
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const trimmed = contentStr.trim();
        
        // Check if it's wrapped in our code wrapper
        if (trimmed.includes('code-content')) {
            return 'code';
        }
        // Check if it starts with a JSON-like structure
        if (trimmed.startsWith('{')) {
            return 'rich-text';
        }
        // Check if it starts with HTML tags
        if (trimmed.startsWith('<')) {
            return 'code';
        }
        // Default to rich text
        return 'rich-text';
    }, []);
    
    // Initialize content based on type
    useEffect(() => {
        if (initialContent) {
            const contentType = detectContentType(initialContent);
            setIsCodeMode(contentType === 'code');
            if (contentType === 'code') {
                setCodeContent(initialContent);
            }
        }
    }, [initialContent, detectContentType]);

    // Load table nodes on mount
    useEffect(() => {
        import('@lexical/table').then(tableModule => {
            setTableNodes([
                tableModule.TableNode,
                tableModule.TableCellNode,
                tableModule.TableRowNode
            ]);
            setIsTableNodesLoaded(true);
        }).catch(() => {
            setTableNodes([]);
            setIsTableNodesLoaded(true); // Still set to true to proceed without table nodes
        });
    }, []);

    const initialConfig = {
        namespace: 'MyEditor',
        theme: editorTheme,
        onError,
        nodes: [
            HeadingNode,
            QuoteNode,
            ListNode,
            ListItemNode,
            CodeNode,
            HashtagNode,
            AutoLinkNode,
            LinkNode,
            ImageNode, // Register the ImageNode
            YouTubeNode, // Register the YouTubeNode
            ...tableNodes
        ],
    };

    // Handle code editor save
    const handleCodeSave = (newCodeContent) => {
        setCodeContent(newCodeContent);
        setIsCodeMode(true);
        setIsCodeEditorOpen(false);
        
        // Notify parent component about the change
        if (onChange) {
            onChange(newCodeContent);
        }
    };
    
    // Handle switching back to rich text mode
    const handleEditCode = () => {
        setIsCodeEditorOpen(true);
    };
    
    // Handle confirmation dialog actions
    const handleConfirm = () => {
        if (confirmationAction) {
            confirmationAction();
        }
        setIsConfirmationOpen(false);
    };

    // Don't render the composer until table nodes are loaded (or failed to load)
    if (!isTableNodesLoaded) {
        return (
            <div className="relative border border-slate-300 rounded-md p-4 text-center text-gray-500">
                Loading editor...
            </div>
        );
    }

    // If we're in code mode, render the code content instead of the rich text editor
    if (isCodeMode && !isCodeEditorOpen) {
        return (
            <div className={`relative border border-slate-300 rounded-md ${!isEditable ? 'bg-slate-50/50' : 'bg-white'}`}>
                <CodeRenderer 
                    content={codeContent} 
                    onEdit={handleEditCode}
                    isEditable={isEditable}
                />
                
                {/* Code Editor Modal */}
                <CodeEditorModal
                    isOpen={isCodeEditorOpen}
                    onClose={() => setIsCodeEditorOpen(false)}
                    onSave={handleCodeSave}
                    initialContent={codeContent}
                />
                
                {/* Confirmation Dialog */}
                <ConfirmationDialog
                    isOpen={isConfirmationOpen}
                    onClose={() => setIsConfirmationOpen(false)}
                    onConfirm={handleConfirm}
                    title="Switch to Rich Text?"
                    message="Switching to rich text mode will lose your HTML/CSS/JS code. Are you sure you want to continue?"
                />
            </div>
        );
    }

    // Handler for switching to code mode
    const handleSwitchToCode = () => {
        setIsCodeEditorOpen(true);
    };

    // Handler for AI text edit
    const handleAIEdit = (currentLexicalContent) => {
        setCurrentTextForEdit(currentLexicalContent);
        setIsAITextEditModalOpen(true);
    };

    // Handler for saving AI-edited text
    const handleAISave = async (editedText) => {
        // Convert edited text to Lexical format if it's plain text
        let lexicalContent;
        try {
            // Try to parse as JSON first
            JSON.parse(editedText);
            lexicalContent = editedText;
        } catch (e) {
            // If not JSON, convert plain text to Lexical
            lexicalContent = toLexical(editedText);
        }

        // Update the editor directly using parseEditorState (like InitialContentPlugin does)
        if (editorRef?.current) {
            try {
                // Parse the Lexical JSON outside of update()
                let parsedJson;
                if (typeof lexicalContent === 'string') {
                    parsedJson = JSON.parse(lexicalContent);
                } else {
                    parsedJson = lexicalContent;
                }

                // Handle editorState wrapper if present
                if (parsedJson && parsedJson.editorState && parsedJson.editorState.root) {
                    parsedJson = parsedJson.editorState;
                }

                // Validate structure
                if (parsedJson && parsedJson.root) {
                    // Use parseEditorState to properly set the state (call outside update)
                    const parsedState = editorRef.current.parseEditorState(parsedJson);
                    editorRef.current.setEditorState(parsedState);
                } else {
                    // Fallback: convert plain text to Lexical
                    const fallbackLexical = toLexical(editedText);
                    const fallbackParsed = JSON.parse(fallbackLexical);
                    const parsedState = editorRef.current.parseEditorState(fallbackParsed);
                    editorRef.current.setEditorState(parsedState);
                }
            } catch (parseError) {
                // If parsing fails, treat as plain text and convert to Lexical
                console.warn('Could not parse AI-edited text as Lexical JSON, converting from plain text:', parseError);
                try {
                    const fallbackLexical = toLexical(editedText);
                    const fallbackParsed = JSON.parse(fallbackLexical);
                    const parsedState = editorRef.current.parseEditorState(fallbackParsed);
                    editorRef.current.setEditorState(parsedState);
                } catch (fallbackError) {
                    console.error('Error in fallback Lexical conversion:', fallbackError);
                }
            }
        }

        // Update via onChange - this will trigger the parent component to update
        if (onChange) {
            onChange(lexicalContent);
        }
    };

    return (
        <div className={`relative ${!hideContainer ? 'border border-slate-300 rounded-md' : ''} ${!isEditable && !hideContainer ? 'bg-slate-50/50' : hideContainer ? '' : 'bg-white'}`}>
            <LexicalComposer initialConfig={initialConfig}>
                {isEditable && <ToolbarPlugin 
                    onSwitchToCode={handleSwitchToCode}
                    setRichTextBackup={setRichTextBackup}
                    setConfirmationAction={setConfirmationAction}
                    setIsConfirmationOpen={setIsConfirmationOpen}
                    showCodeEditButton={showCodeEditButton}
                    onAIEdit={handleAIEdit}
                    sourceTable={sourceTable}
                    sourceRecordId={sourceRecordId}
                />}
                <div className="relative">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={`p-3 ${isEditable ? 'min-h-[60px] max-h-[200px] overflow-y-auto' : 'min-h-[20px]'} outline-none text-black prose max-w-none`}
                                style={{
                                    // Ensure tables are visible with explicit CSS
                                    '--table-border': '1px solid #94a3b8',
                                    '--table-cell-padding': '12px',
                                    fontSize: DEFAULT_FONT_SIZE
                                }}
                            />
                        }
                        placeholder={
                            isEditable ? (
                                <div className="absolute top-3 left-3 text-gray-400 pointer-events-none z-10">Enter some text...</div>
                            ) : (
                                !initialContent || initialContent === '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}' ?
                                <div className="absolute top-3 left-3 text-gray-500 pointer-events-none italic z-10">No content available.</div>
                                : null
                            )
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />
                <HashtagPlugin />
                <AutoLinkPlugin matchers={MATCHERS} />
                <LinkPlugin />
                {isEditable && <UnifiedPastePlugin sourceTable={sourceTable} sourceRecordId={sourceRecordId} />}
                <TablePluginComponent />
                <ClickableLinkPlugin isEditable={isEditable} />
                <SetEditablePlugin isEditable={isEditable} />
                <OnChangePlugin onChange={onChange} />
                <InitialContentPlugin initialContent={initialContent} />
                <SetRefPlugin editorRef={editorRef} /> {/* Add the new ref plugin */}
                <ConvertIframePlugin /> {/* Convert iframe text to YouTube nodes */}
                {isEditable && <ImageCursorPlugin />} {/* Handle cursor positioning around images */}
                {isEditable && <NestedListPlugin />}
                {isEditable && <AutoFocusPlugin />}
            </LexicalComposer>
            
            {/* Code Editor Modal */}
            <CodeEditorModal
                isOpen={isCodeEditorOpen}
                onClose={() => setIsCodeEditorOpen(false)}
                onSave={handleCodeSave}
                initialContent={codeContent}
            />
            
            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={isConfirmationOpen}
                onClose={() => setIsConfirmationOpen(false)}
                onConfirm={handleConfirm}
                title="Switch to Code Editor?"
                message="Switching to code editor will convert your content to HTML/CSS/JS. Your rich text formatting may be lost. Are you sure you want to continue?"
            />
            
            {/* AI Text Edit Modal */}
            {sourceTable && sourceRecordId && (
                <AITextEditModal
                    isOpen={isAITextEditModalOpen}
                    onClose={() => {
                        setIsAITextEditModalOpen(false);
                        setCurrentTextForEdit(null);
                    }}
                    onSave={handleAISave}
                    sourceTable={sourceTable}
                    sourceRecordId={sourceRecordId}
                    fieldName="description"
                    currentText={currentTextForEdit}
                />
            )}
        </div>
    );
}

export default RichTextEditor;