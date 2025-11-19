'use client';

import Link from "next/link";
import {useEffect, useState} from "react";
import {MaterialService} from "@/services/materials/MaterialService";
import {IMaterial} from "@/interfaces/IMaterial";
import {IProjectPart} from "@/interfaces/IProjectPart";
import {ProjectPartService} from "@/services/project-parts/ProjectPartService";
import {useIsMounted} from "@/hooks/useIsMounted";
import AddMaterialModal from "@/components/AddMaterialModal";
import AddPartModal from "@/components/AddPartModal";
import UploadCsvModal from "@/components/UploadCsvModal";

export default function Home() {
  const isMounted = useIsMounted();
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [projectParts, setProjectParts] = useState<IProjectPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([MaterialService.getAll(), ProjectPartService.getAll()])
    .then(([materialsResult, partsResult]) => {
      if (materialsResult instanceof Error) {
        console.error(materialsResult.message);
      } else {
        setMaterials(materialsResult);
      }

      if (partsResult instanceof Error) {
        console.error(partsResult.message);
      } else {
        setProjectParts(partsResult);
      }
    })
    .finally(() => setIsLoading(false));
  }, []);

  const handleAddMaterial = async (newMaterialData: Omit<IMaterial, 'id' | 'totalArea'>) => {
    const newMaterial = await MaterialService.add(newMaterialData);
    setMaterials((prevMaterials) => [...prevMaterials, newMaterial]);
    setIsMaterialModalOpen(false);
  };

  const handleAddPart = async (name: string, quantity: number) => {
    await ProjectPartService.add(name, quantity);
    const updatedParts = await ProjectPartService.getAll();
    if (!(updatedParts instanceof Error)) {
      setProjectParts(updatedParts);
    }
    setIsPartModalOpen(false);
  };

  const handleUploadCsv = async () => {
    // Simulate parsing a CSV file
    const csvData = [
      { name: 'Fundo de Armário - importado', quantity: 2 },
      { name: 'Tampo de Mesa - importado', quantity: 1 },
    ];
    await ProjectPartService.addFromCsv(csvData);
    const updatedParts = await ProjectPartService.getAll();
    if (!(updatedParts instanceof Error)) {
      setProjectParts(updatedParts);
    }
    setIsUploadModalOpen(false);
    // Mostrar notificação de sucesso por alguns segundos
    setToastMessage('Upload realizado com sucesso');
  };
  if (!isMounted || isLoading) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
    )
  }

  return (
      <div className="min-h-screen bg-gray-50 relative">
        <main className="mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <svg
                  className="h-8 w-8 text-gray-500"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z"/>
                <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
                <line x1="9" y1="9" x2="10" y2="9"/>
                <line x1="9" y1="13" x2="15" y2="13"/>
                <line x1="9" y1="17" x2="15" y2="17"/>
              </svg>
              <h1 className="text-3xl font-bold text-gray-800">
                Seleção de Material
              </h1>
            </div>
            <button
                onClick={() => setIsMaterialModalOpen(true)}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Adicionar Material
            </button>

          </div>

          <p className="mb-8 text-gray-600">
            Escolha uma chapa de material para começar a planejar seu layout de corte.
          </p>

          <div className="space-y-4">
            {materials.map((material) => (
                <div
                    key={material.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {material.name}
                    </h2>
                    <p className="text-sm text-gray-500">{material.dimensions}</p>
                  </div>
                  <Link
                      href={`/planner?materialId=${material.id}`}
                      className="transform transition-transform duration-200 hover:scale-105 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Usar Chapa
                  </Link>
                </div>
            ))}
          </div>


          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <svg
                    className="h-8 w-8 text-gray-500"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                  <path stroke="none" d="M0 0h24v24H0z"/>
                  <path d="M12 3l-4 4l4 4m-4 -4h11"/>
                  <path d="M20 17l-4 4l4 4m-4 -4h11"/>
                  <path d="M3 12l4 -4l-4 -4"/>
                  <path d="M7 12h-4"/>
                  <path d="M21 12l-4 4l4 4"/>
                  <path d="M17 12h4"/>
                </svg>
                <h1 className="text-3xl font-bold text-gray-800">
                  Peças do Projeto
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
                >
                  Upload CSV
                </button>
                <button
                    onClick={() => setIsPartModalOpen(true)}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  Adicionar Peça
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {projectParts.map((part, index) => (
                  <div
                      key={`${part.id}-${index}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                  >
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {part.name}
                      </h2>
                    </div>
                    <Link
                        href={`/config?partId=${part.id}`}
                        className="transform transition-transform duration-200 hover:scale-105 rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Configurar
                    </Link>
                  </div>
              ))}
            </div>
          </div>

        </main>
        {isMaterialModalOpen && (
            <AddMaterialModal
                onClose={() => setIsMaterialModalOpen(false)}
                onSave={handleAddMaterial}
            />
        )}
        {isPartModalOpen && (
            <AddPartModal
                onClose={() => setIsPartModalOpen(false)}
                onSave={handleAddPart}
            />
        )}
        {isUploadModalOpen && (
            <UploadCsvModal
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleUploadCsv}
            />
        )}
        {toastMessage && (
            <div className="fixed right-6 top-6 z-50">
              <div className="rounded-md bg-green-600 px-4 py-2 text-white shadow-md">
                {toastMessage}
              </div>
            </div>
        )}

      </div>
  );
}
