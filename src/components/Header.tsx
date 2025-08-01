import React from 'react';
import { Play, Loader2, Code2 } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

interface HeaderProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  onRunCode: () => void;
  isExecuting: boolean;
}

const Header: React.FC<HeaderProps> = ({
  selectedLanguage,
  onLanguageChange,
  onRunCode,
  isExecuting,
}) => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Code2 className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Cloud Code Compiler</h1>
          </div>
          <div className="h-6 w-px bg-gray-600"></div>
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={onLanguageChange}
          />
        </div>
        
        <button
          onClick={onRunCode}
          disabled={isExecuting}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;