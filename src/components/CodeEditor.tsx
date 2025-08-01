import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  code: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  code,
  onChange,
  readOnly = false,
}) => {
  const getMonacoLanguage = (lang: string): string => {
    switch (lang) {
      case 'cpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'python':
        return 'python';
      case 'c':
        return 'c';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="h-full border border-gray-600 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language={getMonacoLanguage(language)}
        value={code}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          readOnly,
          folding: true,
          cursorBlinking: 'blink',
          renderLineHighlight: 'all',
          selectOnLineNumbers: true,
          roundedSelection: false,
          smoothScrolling: true,
          contextmenu: true,
          mouseWheelZoom: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;