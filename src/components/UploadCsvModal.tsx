'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UploadCsvModalProps {
  onClose: () => void;
  onUpload: () => void;
}

export default function UploadCsvModal({ onClose, onUpload }: UploadCsvModalProps) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState('');

  const handleFileChange = () => {
    // Simulate file selection
    setFileName('parts.csv');
  };

  const handleUpload = () => {
    if (!fileName) {
      alert(t('select_csv_file_error'));
      return;
    }
    onUpload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('upload_csv_title')}</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('upload_csv_description')}</p>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              {t('choose_file_button')}
              <input type="file" className="hidden" onChange={handleFileChange} accept=".csv" />
            </label>
            {fileName && <span className="text-gray-900">{fileName}</span>}
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleUpload}
            disabled={!fileName}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('upload_button')}
          </button>
        </div>
      </div>
    </div>
  );
}
