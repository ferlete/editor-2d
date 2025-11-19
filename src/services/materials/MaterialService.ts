// eslint-disable-next-line @typescript-eslint/no-unused-expressions
/!* eslint-disable space-before-function-paren *!/
import {IMaterial} from "@/interfaces/IMaterial";
import {mockMateriais} from "./MaterialService.mock";

let materiais: IMaterial[] = [...mockMateriais];

const getAll = async (): Promise<IMaterial[] | Error> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(materiais);
    }, 500);
  });
}

export const MaterialService = {
  getAll: async (): Promise<IMaterial[] | Error> => {
    try {
      // Simulating an API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([...mockMateriais]);
        }, 500);
      });
    } catch (error) {
      return new Error('Error fetching materials');
    }
  },

  add: async (newMaterialData: Omit<IMaterial, 'id' | 'totalArea'>): Promise<IMaterial> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = mockMateriais.length > 0 ? Math.max(...mockMateriais.map(m => m.id)) + 1 : 1;
        const newMaterial: IMaterial = {
          id: newId,
          ...newMaterialData,
          totalArea: newMaterialData.width * newMaterialData.height,
        };
        mockMateriais.push(newMaterial);
        resolve(newMaterial);
      }, 300);
    });
  },
};

