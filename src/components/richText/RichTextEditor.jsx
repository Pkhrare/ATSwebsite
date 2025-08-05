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

// --- Toolbar Plugin ---
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);

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
      if (!isLink) {
          editor.read(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                  const selectedText = selection.getTextContent();
                  if (!selectedText || selectedText.trim() === '') {
                      alert('Please select some text first, then click the Link button to make it clickable.');
                      return;
                  }
                  const url = prompt('Enter the URL:');
                  if (url) {
                      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
                  }
              } else {
                  alert('Please select some text first, then click the Link button to make it clickable.');
              }
          });
      } else {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      }
  }, [editor, isLink]);

  return (
      <div 
          className="flex items-center gap-2 p-2 bg-slate-100 border-b border-slate-300 rounded-t-md"
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
            onChange(JSON.stringify(editorState)); 
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
                const parsedState = editor.parseEditorState(initialContent);
                editor.setEditorState(parsedState);
            } catch (error) {
                // If parsing fails, treat as plain text.
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
            LinkNode
        ],
    };

    return (
        <div className="relative border border-slate-300 rounded-md">
            <LexicalComposer initialConfig={initialConfig}>
                {isEditable && <ToolbarPlugin />}
                <div className="relative">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable 
                                className={`p-2 ${isEditable ? 'min-h-[150px]' : ''} outline-none text-black`} 
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
                <SetEditablePlugin isEditable={isEditable} />
                <OnChangePlugin onChange={onChange} />
                <InitialContentPlugin initialContent={initialContent} />
                {isEditable && <AutoFocusPlugin />}
            </LexicalComposer>
        </div>
    );
}

export default RichTextEditor;