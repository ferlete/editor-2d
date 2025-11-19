import { IProjectPart } from '@/interfaces/IProjectPart';
import { PolygonShape, Side, CircleShape, Unit } from '@/interfaces/IShape';

// Função auxiliar para criar um retângulo
export const createRectangle = (id: number, width: number, height: number): PolygonShape => {
    const sides: Side[] = [
        { length: height, unit: 'mm' },
        { length: width, unit: 'mm' },
        { length: height, unit: 'mm' },
        { length: width, unit: 'mm' },
    ];
    return {
        id,
        type: 'polygon',
        sides,
        rotation: 0,
        position: { x: 10, y: 10 } // Posição inicial
    };
};

// Função auxiliar para criar um círculo
export const createCircle = (id: number, radius: number, unit: Unit): CircleShape => {
    return {
        id,
        type: 'circle',
        radius,
        unit,
        position: { x: 0, y: 0 } // Posição inicial
    };
};

// Lista de peças que formam um projeto de corte exemplo.
export let projectCuttingList: IProjectPart[] = [
    { id: 101, name: 'Peça A', shape: createCircle(101, 600, 'mm'), quantity: 2 },
    { id: 102, name: 'Peça B', shape: createRectangle(102, 564, 480), quantity: 4 },
    { id: 103, name: 'Peça C', shape: createRectangle(103, 564, 150), quantity: 4 },
];
