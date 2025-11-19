'use client';

import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
            onClick={() => changeLanguage('pt')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${i18n.language === 'pt' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          PT
        </button>
        <button
            onClick={() => changeLanguage('en')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          EN
        </button>
      </div>
  );
};

export default LanguageSwitcher;
