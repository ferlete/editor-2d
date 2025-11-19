'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AddPartModalProps {
  onClose: () => void;
  onSave: (name: string, quantity: number) => void;
}

export default function AddPartModal({ onClose, onSave }: AddPartModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSave = () => {
    if (!name || quantity <= 0) {
        alert(t('fill_all_fields_error'));
        return;
    }
    onSave(name, quantity);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">{t('add_new_part')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('part_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              placeholder={t('part_name_placeholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('quantity')}</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
            />
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
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
