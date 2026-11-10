import React from 'react';
import { useApp } from '../context/AppContext';
import { Globe } from 'lucide-react';

export const LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
];

export const LanguageSelector = ({ compact = false }) => {
  const { currentLanguage, setCurrentLanguage, showToast } = useApp();

  const handleChange = (e) => {
    const newLang = e.target.value;
    setCurrentLanguage(newLang);
    const item = LANGUAGES.find((l) => l.code === newLang);
    showToast(`Language set to ${item?.label || newLang} (${item?.native || ''})`, 'info');
  };

  return (
    <div className={`relative flex items-center ${compact ? 'text-xs' : 'text-sm'}`}>
      <Globe className="w-4 h-4 text-charcoal-muted absolute left-2.5 pointer-events-none" />
      <select
        value={currentLanguage}
        onChange={handleChange}
        className={`bg-white border border-warm-300 text-charcoal font-medium rounded-lg pl-8 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-sm appearance-none hover:border-charcoal-subtle transition-colors ${
          compact ? 'py-1 text-xs pl-7 pr-6' : ''
        }`}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native} ({lang.label})
          </option>
        ))}
      </select>
      <div className="absolute right-2.5 pointer-events-none text-charcoal-subtle text-xs">▼</div>
    </div>
  );
};
