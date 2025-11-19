import { IProjectPart } from '@/interfaces/IProjectPart';
import { projectCuttingList, createRectangle } from './ProjectPartService.mock';

let nextPartId = 105; // Start from a value higher than existing mock data

const getAll = async (): Promise<IProjectPart[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(projectCuttingList);
    }, 500);
  });
};

const getById = async (id: number): Promise<IProjectPart | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const part = projectCuttingList.find(p => p.id === id);
            resolve(part);
        }, 300);
    });
};

const update = async (updatedPart: IProjectPart): Promise<IProjectPart> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = projectCuttingList.findIndex(p => p.id === updatedPart.id);
            if (index !== -1) {
                projectCuttingList[index] = { ...projectCuttingList[index], ...updatedPart };
                resolve(projectCuttingList[index] as IProjectPart);
            } else {
                reject(new Error("Part not found"));
            }
        }, 300);
    });
};

const add = async (name: string, quantity: number): Promise<IProjectPart> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = nextPartId++; // Use and increment the counter
        const defaultShape = createRectangle(newId, 100, 100);
        const newPart: IProjectPart = {
          id: newId,
          name,
          shape: defaultShape,
          quantity,
          borderType: 'linear',
          borderColor: '#000000',
          partColor: '#a0c4ff',
        };
        projectCuttingList.push(newPart);
        resolve(newPart);
      }, 300);
    });
};

const addFromCsv = async (csvData: { name: string; quantity: number }[]): Promise<IProjectPart[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newParts: IProjectPart[] = [];
            csvData.forEach(item => {
                const newId = nextPartId++;
                const defaultShape = createRectangle(newId, 100, 100);
                const newPart: IProjectPart = {
                    id: newId,
                    name: item.name,
                    shape: defaultShape,
                    quantity: item.quantity,
                    borderType: 'linear',
                    borderColor: '#000000',
                    partColor: '#a0c4ff',
                };
                projectCuttingList.push(newPart);
                newParts.push(newPart);
            });
            resolve(newParts);
        }, 500);
    });
};

export const ProjectPartService = {
  getAll,
  getById,
  update,
  add,
  addFromCsv,
};
