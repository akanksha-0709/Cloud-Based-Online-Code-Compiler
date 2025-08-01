import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import CodeEditor from './components/CodeEditor';
import InputOutput from './components/InputOutput';
import { getLanguageById } from './constants/languages';
import { executeCode } from './services/api';
import { CodeExecutionResponse } from './types';

function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState(() => {
    const lang = getLanguageById('python');
    return lang?.template || '';
  });
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | undefined>();
  const [memoryUsed, setMemoryUsed] = useState<number | undefined>();

  const handleLanguageChange = useCallback((language: string) => {
    setSelectedLanguage(language);
    const lang = getLanguageById(language);
    if (lang) {
      setCode(lang.template);
    }
    // Clear previous results
    setOutput('');
    setError(undefined);
    setExecutionTime(undefined);
    setMemoryUsed(undefined);
  }, []);

  const handleRunCode = useCallback(async () => {
    if (!code.trim()) {
      setError('Please write some code before running.');
      setOutput('');
      return;
    }

    setIsExecuting(true);
    setOutput('');
    setError(undefined);
    setExecutionTime(undefined);
    setMemoryUsed(undefined);

    try {
      const result: CodeExecutionResponse = await executeCode({
        language: selectedLanguage,
        code,
        input: input || undefined,
      });

      if (result.success) {
        setOutput(result.output || '');
        setExecutionTime(result.executionTime);
        setMemoryUsed(result.memoryUsed);
      } else {
        setError(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute code');
    } finally {
      setIsExecuting(false);
    }
  }, [selectedLanguage, code, input]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        onRunCode={handleRunCode}
        isExecuting={isExecuting}
      />
      
      <main className="h-[calc(100vh-80px)] flex">
        {/* Code Editor */}
        <div className="flex-1 p-4">
          <div className="h-full">
            <h2 className="text-lg font-semibold mb-3 text-gray-300">Code Editor</h2>
            <CodeEditor
              language={selectedLanguage}
              code={code}
              onChange={setCode}
            />
          </div>
        </div>

        {/* Input/Output Panel */}
        <div className="w-96 border-l border-gray-700 p-4">
          <InputOutput
            input={input}
            output={output}
            error={error}
            onInputChange={setInput}
            isExecuting={isExecuting}
            executionTime={executionTime}
            memoryUsed={memoryUsed}
          />
        </div>
      </main>
    </div>
  );
}

export default App;