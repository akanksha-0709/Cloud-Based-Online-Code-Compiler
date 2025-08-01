import React from 'react';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="appearance-none bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 cursor-pointer min-w-[120px]"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id} className="bg-gray-800">
            {lang.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

export default LanguageSelector;