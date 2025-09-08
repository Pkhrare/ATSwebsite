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
} from 'lexical';
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
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [selectedImageNode, setSelectedImageNode] = useState(null);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [hasTableSupport, setHasTableSupport] = useState(false);

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
        }
      });
    });
  }, [editor]);

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

      if (numRows > 0 && numCols > 0 && numRows <= 60 && numCols <= 10) {
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
        alert('Please enter valid numbers (rows: 1-20, columns: 1-10)');
      }
    }
  }, [editor, hasTableSupport]);

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

const editorTheme = {
  link: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
  table: 'border-collapse my-4 w-full border border-slate-400',
  tableRow: 'border-b border-slate-300',
  tableCell: 'border border-slate-400 p-3 min-w-[100px] relative bg-white',
  tableCellHeader: 'border border-slate-400 p-3 min-w-[100px] bg-slate-100 font-semibold relative',
  youtube: 'my-4 w-full max-w-4xl mx-auto',
  image: 'inline-block align-middle', // Add image theme
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

function RichTextEditor({ isEditable, initialContent, onChange, editorRef, sourceTable, sourceRecordId }) {
    const [tableNodes, setTableNodes] = useState([]);
    const [isTableNodesLoaded, setIsTableNodesLoaded] = useState(false);

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

    // Don't render the composer until table nodes are loaded (or failed to load)
    if (!isTableNodesLoaded) {
        return (
            <div className="relative border border-slate-300 rounded-md p-4 text-center text-gray-500">
                Loading editor...
            </div>
        );
    }

    return (
        <div className={`relative border border-slate-300 rounded-md ${!isEditable ? 'bg-slate-50/50' : 'bg-white'}`}>
            <LexicalComposer initialConfig={initialConfig}>
                {isEditable && <ToolbarPlugin />}
                <div className="relative">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={`p-3 ${isEditable ? 'min-h-[150px]' : 'min-h-[120px]'} outline-none text-black prose max-w-none`}
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
                {isEditable && <AutoFocusPlugin />}
            </LexicalComposer>
        </div>
    );
}

export default RichTextEditor;