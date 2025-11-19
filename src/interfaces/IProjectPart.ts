import { Shape } from "./IShape";

export interface IProjectPart {
    id: number;
    name: string;
    shape: Shape;
    quantity: number;
}
