'use client';

import React, { useState, useEffect } from 'react';
import { IProjectPart } from '@/interfaces/IProjectPart';

interface PartConfigModalProps {
  part: IProjectPart | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPart: IProjectPart) => void;
}

const PartConfigModal: React.FC<PartConfigModalProps> = ({ part, isOpen, onClose, onSave }) => {
  const [borderType, setBorderType] = useState<'linear' | 'dotted'>('linear');
  const [borderColor, setBorderColor] = useState('#000000');
  const [partColor, setPartColor] = useState('#a0c4ff');

  useEffect(() => {
    if (part) {
      setBorderType(part.borderType);
      setBorderColor(part.borderColor);
      setPartColor(part.partColor);
    }
  }, [part]);

  if (!isOpen || !part) {
    return null;
  }

  const handleSave = () => {
    const updatedPart: IProjectPart = {
      ...part,
      borderType,
      borderColor,
      partColor,
    };
    onSave(updatedPart);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Configurar Atributos: {part.name}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo de Borda</label>
            <select
              value={borderType}
              onChange={(e) => setBorderType(e.target.value as 'linear' | 'dotted')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
            >
              <option value="linear">Linear</option>
              <option value="dotted">Pontilhada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cor da Borda</label>
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cor da Peça</label>
            <input
              type="color"
              value={partColor}
              onChange={(e) => setPartColor(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartConfigModal;
