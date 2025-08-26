import React, { useEffect, useState, useCallback } from 'react';
import { 
    $getSelection, 
    $isRangeSelection,
    $createParagraphNode, 
    $createTextNode,
    $getRoot,
    FORMAT_TEXT_COMMAND,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';

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
  const [hasTableSupport, setHasTableSupport] = useState(false);

  // Check if table support is available
  useEffect(() => {
      import('@lexical/table').then(() => {
          setHasTableSupport(true);
      }).catch(() => {
          setHasTableSupport(false);
      });
  }, []);

  const updateToolbar = useCallback(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
          setIsBold(selection.hasFormat('bold'));
          setIsItalic(selection.hasFormat('italic'));
          setIsUnderline(selection.hasFormat('underline'));
          
          // Check if current selection is a link
          const node = selection.getNodes()[0];
          const parent = node.getParent();
          setIsLink($isLinkNode(parent) || $isLinkNode(node));
      }
  }, []);

  useEffect(() => {
      return editor.registerUpdateListener(({editorState}) => {
          editorState.read(() => {
              updateToolbar();
          });
      });
  }, [editor, updateToolbar]);

  const insertLink = useCallback(() => {
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
        alert('Please select some text first, then click the Link button to make it clickable.');
        return;
    }

    const url = prompt('Enter the URL:');
    if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
  }, [editor, isLink]);

  const insertTable = useCallback(async () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    
    if (rows && cols) {
      const numRows = parseInt(rows, 10);
      const numCols = parseInt(cols, 10);
      
      if (numRows > 0 && numCols > 0 && numRows <= 20 && numCols <= 10) {
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
          // By preventing the default mousedown action, you stop the toolbar from
          // taking focus away from the editor.
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
              className={`px-3 py-1 rounded-md text-sm font-medium ${isLink ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'}`}
              aria-label="Insert Link"
          >
              {isLink ? 'Unlink' : 'Link'}
          </button>
          
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          
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
    useEffect(() => {
        if (!onChange) return;
        return editor.registerUpdateListener(({ editorState }) => {
            const editorStateJSON = editorState.toJSON();
            onChange(JSON.stringify(editorStateJSON)); 
        });
    }, [editor, onChange]);
    return null;
}

// Plugin to load initial content from a prop
function InitialContentPlugin({ initialContent }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        if (!initialContent) {
            return;
        }
        editor.update(() => {
            try {
                let content = initialContent;
                // Check if the content is a doubly-stringified JSON and parse it once.
                if (typeof content === 'string') {
                    try {
                        const parsed = JSON.parse(content);
                        if (typeof parsed === 'string') {
                            content = parsed;
                        }
                    } catch (e) {
                        // Not a valid JSON string, treat as plain text below.
                    }
                }

                const parsedState = editor.parseEditorState(content);
                editor.setEditorState(parsedState);
            } catch (error) {
                // If parsing fails after all attempts, it's likely plain text.
                // Create a valid editor state from this plain text.
                const root = $getRoot();
                root.clear();
                const paragraphNode = $createParagraphNode();
                paragraphNode.append($createTextNode(initialContent));
                root.append(paragraphNode);
            }
        });
    }, [editor, initialContent]);
    return null;
}

const editorTheme = {
  link: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
  table: 'border-collapse my-4 w-full border border-slate-400',
  tableRow: 'border-b border-slate-300',
  tableCell: 'border border-slate-400 p-3 min-w-[100px] relative bg-white',
  tableCellHeader: 'border border-slate-400 p-3 min-w-[100px] bg-slate-100 font-semibold relative',
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

function RichTextEditor({ isEditable, initialContent, onChange }) {
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
        <div className="relative border border-slate-300 rounded-md">
            <LexicalComposer initialConfig={initialConfig}>
                {isEditable && <ToolbarPlugin />}
                <div className="relative">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable 
                                className={`p-2 ${isEditable ? 'min-h-[150px]' : ''} outline-none text-black prose max-w-none`} 
                                style={{
                                    // Ensure tables are visible with explicit CSS
                                    '--table-border': '1px solid #94a3b8',
                                    '--table-cell-padding': '12px'
                                }}
                            />
                        }
                        placeholder={<div className="absolute top-2 left-2 text-gray-400 pointer-events-none">Enter some text...</div>}
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />    
                <HashtagPlugin />
                <AutoLinkPlugin matchers={MATCHERS} />
                <LinkPlugin />
                <TablePluginComponent />
                <ClickableLinkPlugin isEditable={isEditable} />
                <SetEditablePlugin isEditable={isEditable} />
                <OnChangePlugin onChange={onChange} />
                <InitialContentPlugin initialContent={initialContent} />
                {isEditable && <AutoFocusPlugin />}
            </LexicalComposer>
        </div>
    );
}

export default RichTextEditor;