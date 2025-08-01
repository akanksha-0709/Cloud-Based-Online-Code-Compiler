import React from 'react';
import { Terminal, FileText } from 'lucide-react';

interface InputOutputProps {
  input: string;
  output: string;
  error?: string;
  onInputChange: (input: string) => void;
  isExecuting: boolean;
  executionTime?: number;
  memoryUsed?: number;
}

const InputOutput: React.FC<InputOutputProps> = ({
  input,
  output,
  error,
  onInputChange,
  isExecuting,
  executionTime,
  memoryUsed,
}) => {
  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Input Section */}
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-300">Input (stdin)</h3>
        </div>
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Enter input for your program here..."
          className="w-full h-24 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none font-mono text-sm"
          disabled={isExecuting}
        />
      </div>

      {/* Output Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-medium text-gray-300">Output</h3>
          </div>
          {(executionTime !== undefined || memoryUsed !== undefined) && (
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              {executionTime !== undefined && (
                <span>Time: {executionTime}ms</span>
              )}
              {memoryUsed !== undefined && (
                <span>Memory: {memoryUsed}KB</span>
              )}
            </div>
          )}
        </div>
        <div
          className={`w-full h-32 bg-gray-900 p-3 rounded-lg border font-mono text-sm overflow-auto ${
            error ? 'border-red-500/50 text-red-300' : 'border-gray-600 text-green-300'
          }`}
        >
          {isExecuting ? (
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span>Executing code...</span>
            </div>
          ) : error ? (
            <div className="text-red-300">
              <strong>Error:</strong>
              <pre className="mt-1 whitespace-pre-wrap">{error}</pre>
            </div>
          ) : output ? (
            <pre className="whitespace-pre-wrap">{output}</pre>
          ) : (
            <span className="text-gray-500 italic">Output will appear here...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputOutput;