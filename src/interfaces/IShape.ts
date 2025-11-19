// src/interfaces/IShape.ts

export type Unit = 'mm' | 'cm' | 'm';
export type ShapeType = 'polygon' | 'circle';

export interface Vector {
  x: number;
  y: number;
}

export interface BaseShape {
  id: number;
  type: ShapeType;
  position: Vector;
}

export interface Side {
  length: number;
  unit: Unit;
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  sides: Side[];
  rotation: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  radius: number;
  unit: Unit;
}

export interface Projection {
  min: number;
  max: number;
}

export type Shape = PolygonShape | CircleShape;
