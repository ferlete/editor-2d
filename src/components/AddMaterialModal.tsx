'use client';

import { useState } from 'react';
import { IMaterial } from '@/interfaces/IMaterial';

interface AddMaterialModalProps {
  onClose: () => void;
  onSave: (newMaterial: Omit<IMaterial, 'id' | 'totalArea'>) => void;
}

export default function AddMaterialModal({ onClose, onSave }: AddMaterialModalProps) {
  const [name, setName] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  const handleSave = () => {
    if (!name || !dimensions || width <= 0 || height <= 0) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }
    onSave({ name, dimensions, width, height });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">Adicionar Novo Material</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do Material</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              placeholder={'Ex: Chapa de MDF 18mm'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dimensões (ex: 2750mm x 1850mm)</label>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              placeholder="e.g., 2750mm x 1850mm"
            />
          </div>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">Largura (mm)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-sm font-medium text-gray-700">Altura (mm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
