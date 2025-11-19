"use client"
import React, {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

// Importando todos os tipos e dados necessários
import {IMaterial} from '@/interfaces/IMaterial';
import {IProjectPart} from '@/interfaces/IProjectPart';
import {CircleShape, PolygonShape, Projection, Shape, Side, Unit, Vector} from '@/interfaces/IShape';
import {ProjectPartService} from '@/services/project-parts/ProjectPartService';
import PartConfigModal from "@/components/PartConfigModal";


const unitToPx = (value: number, unit: Unit): number => {
  // A conversão mm para px é 1 para 1 neste contexto, para simplificar a escala.
  switch (unit) {
    case 'mm':
      return value;
    case 'cm':
      return value * 10;
    case 'm':
      return value * 1000;
    default:
      return value;
  }
};

function calculateLocalVertices(sidesCount: number, sidesLengths: Side[]): Vector[] {
  if (sidesCount < 3) return [];

  if (sidesCount === 4 && sidesLengths.length === 4) {
    const h = unitToPx(sidesLengths[0].length, sidesLengths[0].unit) / 2;
    const w = unitToPx(sidesLengths[1].length, sidesLengths[1].unit) / 2;
    return [
      {x: -w, y: -h}, // Top-left
      {x: w, y: -h},  // Top-right
      {x: w, y: h},   // Bottom-right
      {x: -w, y: h}   // Bottom-left
    ];
  }

  const avgLengthPx = sidesLengths.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / sidesCount;
  const radius = avgLengthPx / (2 * Math.sin(Math.PI / sidesCount));
  const points: Vector[] = [];
  for (let i = 0; i < sidesCount; i++) {
    const angle = (2 * Math.PI * i) / sidesCount - Math.PI / 2;
    points.push({x: radius * Math.cos(angle), y: radius * Math.sin(angle)});
  }
  return points;
}

function calculateArea(shape: Shape): number {
  if (shape.type === 'circle') {
    const radiusPx = unitToPx(shape.radius, shape.unit);
    return Math.PI * radiusPx * radiusPx;
  }
  // Para retângulos, a área é mais simples
  if (shape.type === 'polygon' && shape.sides.length === 4) {
    const height = unitToPx(shape.sides[0].length, shape.sides[0].unit);
    const width = unitToPx(shape.sides[1].length, shape.sides[1].unit);
    return width * height;
  }
  if (shape.type === 'polygon' && shape.sides.length < 3) return 0;
  if (shape.type === 'polygon') {
    const avgLengthPx = shape.sides.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / shape.sides.length;
    return (shape.sides.length * avgLengthPx * avgLengthPx) / (4 * Math.tan(Math.PI / shape.sides.length));
  }
  return 0; // Should not happen for known shapes
}

// Etapa A: O Algoritmo calcula a posicao exata de cada vertice dos poligonos no "mundo",
// aplicando a translacao (posicao x e y) e a rotacao da peca.
function getTransformedVertices(poly: PolygonShape): Vector[] {
  const localVertices = calculateLocalVertices(poly.sides.length, poly.sides);
  const angleRad = poly.rotation * (Math.PI / 180);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return localVertices.map(v => ({
    x: (v.x * cos - v.y * sin) + poly.position.x,
    y: (v.x * sin + v.y * cos) + poly.position.y,
  }));
}

// Etapa B: O Algoritmo determina todos os eixos que precisam ser testados. Estes sao os vetores
// normais (perpendiculares) a cada aresta de ambos os poligonos.
function getAxes(vertices: Vector[]): Vector[] {
  const axes: Vector[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[i + 1] || vertices[0];
    const edge = {x: p2.x - p1.x, y: p2.y - p1.y};
    const normal = {x: -edge.y, y: edge.x};
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
    if (length > 0) axes.push({x: normal.x / length, y: normal.y / length});
  }
  return axes;
}

// Etapa C: Projetar os poligonos e verificar a sobreposicao
// Para cada eixo calculado, o algoritmo "projeta" ambos os poligonos sobre ele. Isso 'e como
// "achatar" a forma em uma linha 1D. A funcao project retonar o intervalo (min e max) que a
// forma ocupa nesse eixo.
function project(vertices: Vector[], axis: Vector): Projection {
  let min = Infinity, max = -Infinity;
  for (const vertex of vertices) {
    const dotProduct = vertex.x * axis.x + vertex.y * axis.y;
    min = Math.min(min, dotProduct);
    max = Math.max(max, dotProduct);
  }
  return {min, max};
}

function projectCircle(circle: CircleShape, axis: Vector): Projection {
    const radius = unitToPx(circle.radius, circle.unit);
    const centerProjection = (circle.position.x * axis.x) + (circle.position.y * axis.y);
    return {
        min: centerProjection - radius,
        max: centerProjection + radius,
    };
}

// --- Componente Principal ---
interface ShapeDrawerProps {
  material: IMaterial;
}

type DrawableShape = Shape & {
    partId: number;
    borderType: 'linear' | 'dotted';
    borderColor: string;
    partColor: string;
};

type Interaction =
    | { type: 'drag'; id: number; offset: Vector }
    | { type: 'rotate'; id: number; startAngle: number; initialRotation: number }
    | { type: 'scale'; id: number; initialShape: Shape; initialDistance: number }
    | null;

const ShapeDrawer: React.FC<ShapeDrawerProps> = ({material}) => {
  const { t } = useTranslation('planner');
  const planeWidth = material.width;
  const planeHeight = material.height;

  const [shapes, setShapes] = useState<DrawableShape[]>([]);
  const [projectParts, setProjectParts] = useState<IProjectPart[]>([]);
  const [initialProjectParts, setInitialProjectParts] = useState<IProjectPart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [collisionMargin, setCollisionMargin] = useState(5); // Margem de 5mm por padrão
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [highlightedCollisionId, setHighlightedCollisionId] = useState<number | null>(null);
  const [history, setHistory] = useState<DrawableShape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [partToConfig, setPartToConfig] = useState<IProjectPart | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const shapesRef = useRef(shapes);
  // eslint-disable-next-line react-hooks/purity
  const nextId = useRef(Date.now());

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  // Buscando as pecas do projeto
  useEffect(() => {
    setIsLoadingParts(true);
    ProjectPartService.getAll()
    .then((result) => {
      if (result instanceof Error) {
        console.error("Error fetching project parts:", result.message);
      } else {
        setProjectParts(result);
        setInitialProjectParts(result);
      }
    })
    .finally(() => setIsLoadingParts(false));
  }, []);

  const commitHistory = (newShapes: DrawableShape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newShapes]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShapes(history[newIndex]);
    }
  };

  const handleClear = () => {
    setShapes([]);
    setProjectParts(initialProjectParts);
    commitHistory([]);
  };

  const onPointerDown = (e: React.PointerEvent<SVGElement>, shape: DrawableShape) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const viewbox = svgRef.current?.viewBox.baseVal;
    const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
    const scaleY = viewbox ? viewbox.height / svgRect.height : 1;

    const mouseX = (e.clientX - svgRect.left) * scaleX;
    const mouseY = (e.clientY - svgRect.top) * scaleY;
    const dx = mouseX - shape.position.x;
    const dy = mouseY - shape.position.y;

    if (e.ctrlKey || e.metaKey) {
      setInteraction({
        type: 'scale',
        id: shape.id,
        initialShape: shape,
        initialDistance: Math.sqrt(dx * dx + dy * dy)
      });
    } else if (e.altKey && shape.type === 'polygon') {
      setInteraction({
        type: 'rotate',
        id: shape.id,
        startAngle: Math.atan2(dy, dx) * (180 / Math.PI),
        initialRotation: shape.rotation
      });
    } else {
      setInteraction({type: 'drag', id: shape.id, offset: {x: dx, y: dy}});
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!interaction) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const viewbox = svgRef.current?.viewBox.baseVal;
    const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
    const scaleY = viewbox ? viewbox.height / svgRect.height : 1;

    const mouseX = (e.clientX - svgRect.left) * scaleX;
    const mouseY = (e.clientY - svgRect.top) * scaleY;

    setShapes(currentShapes => {
      const shapeIndex = currentShapes.findIndex(s => s.id === interaction.id);
      if (shapeIndex === -1) return currentShapes;

      const newShapes = [...currentShapes];
      const shapeToUpdate = {...newShapes[shapeIndex]};

      switch (interaction.type) {
        case 'scale': {
          const dx = mouseX - shapeToUpdate.position.x;
          const dy = mouseY - shapeToUpdate.position.y;
          const currentDistance = Math.sqrt(dx * dx + dy * dy);
          const scaleFactor = interaction.initialDistance > 0 ? currentDistance / interaction.initialDistance : 1;
          if (shapeToUpdate.type === 'polygon' && interaction.initialShape.type === 'polygon') {
            shapeToUpdate.sides = interaction.initialShape.sides.map(side => ({
              ...side,
              length: side.length * scaleFactor
            }));
          } else if (shapeToUpdate.type === 'circle' && interaction.initialShape.type === 'circle') {
            shapeToUpdate.radius = interaction.initialShape.radius * scaleFactor;
          }
          break;
        }
        case 'rotate': {
          if (shapeToUpdate.type === 'polygon') {
            const dx = mouseX - shapeToUpdate.position.x;
            const dy = mouseY - shapeToUpdate.position.y;
            const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            shapeToUpdate.rotation = interaction.initialRotation + (currentAngle - interaction.startAngle);
          }
          break;
        }

        case 'drag': {
          const newPos = {x: mouseX - interaction.offset.x, y: mouseY - interaction.offset.y};
          const draggedShape = {...shapeToUpdate, position: newPos};
          let isColliding = false;

          for (const otherShape of currentShapes) {
            if (otherShape.id === interaction.id) continue;

            let mtv: Vector | null = null;
            const shapeA = draggedShape;
            const shapeB = otherShape;

            if (shapeA.type === 'polygon' && shapeB.type === 'polygon') {
                const verticesA = getTransformedVertices(shapeA);
                const verticesB = getTransformedVertices(shapeB);
                const axes = [...getAxes(verticesA), ...getAxes(verticesB)];
                let minOverlap = Infinity;
                for (const axis of axes) {
                    const projA = project(verticesA, axis);
                    const projB = project(verticesB, axis);
                    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
                    if (overlap < collisionMargin) {
                        minOverlap = -1;
                        break;
                    }
                    if (overlap < minOverlap) {
                        minOverlap = overlap;
                        mtv = { x: axis.x * (minOverlap - collisionMargin), y: axis.y * (minOverlap - collisionMargin) };
                    }
                }
                if (minOverlap === -1) mtv = null;
            } else if ((shapeA.type === 'polygon' && shapeB.type === 'circle') || (shapeA.type === 'circle' && shapeB.type === 'polygon')) {
                const polygon = (shapeA.type === 'polygon' ? shapeA : shapeB) as PolygonShape;
                const circle = (shapeA.type === 'circle' ? shapeA : shapeB) as CircleShape;

                const polygonVertices = getTransformedVertices(polygon);
                const polygonAxes = getAxes(polygonVertices);

                let closestVertexDist = Infinity;
                let closestVertex: Vector | null = null;
                for (const vertex of polygonVertices) {
                    const dist = Math.sqrt(Math.pow(vertex.x - circle.position.x, 2) + Math.pow(vertex.y - circle.position.y, 2));
                    if (dist < closestVertexDist) {
                        closestVertexDist = dist;
                        closestVertex = vertex;
                    }
                }

                if (closestVertex) {
                    const axisToCircleCenter = { x: closestVertex.x - circle.position.x, y: closestVertex.y - circle.position.y };
                    const axisLength = Math.sqrt(axisToCircleCenter.x * axisToCircleCenter.x + axisToCircleCenter.y * axisToCircleCenter.y);
                    if (axisLength > 0) {
                        const normalizedAxisToCircle = { x: axisToCircleCenter.x / axisLength, y: axisToCircleCenter.y / axisLength };
                        const axes = [...polygonAxes, normalizedAxisToCircle];
                        let minOverlap = Infinity;

                        for (const axis of axes) {
                            const projA = project(polygonVertices, axis);
                            const projB = projectCircle(circle, axis);
                            const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);

                            if (overlap < collisionMargin) {
                                minOverlap = -1;
                                break;
                            }
                            if (overlap < minOverlap) {
                                minOverlap = overlap;
                                mtv = { x: axis.x * (minOverlap - collisionMargin), y: axis.y * (minOverlap - collisionMargin) };
                            }
                        }
                        if (minOverlap === -1) mtv = null;
                    }
                }
            } else if (shapeA.type === 'circle' && shapeB.type === 'circle') {
                const circleA = shapeA;
                const circleB = shapeB;

                const radiusA = unitToPx(circleA.radius, circleA.unit);
                const radiusB = unitToPx(circleB.radius, circleB.unit);
                const totalRadius = radiusA + radiusB + collisionMargin;

                const dx = circleB.position.x - circleA.position.x;
                const dy = circleB.position.y - circleA.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < totalRadius) {
                    const overlap = totalRadius - distance;
                    if (distance > 0) {
                        const axis = { x: dx / distance, y: dy / distance };
                        mtv = { x: axis.x * overlap, y: axis.y * overlap };
                    } else {
                        mtv = { x: overlap, y: 0 };
                    }
                }
            }

            if (mtv) {
              isColliding = true;
              setHighlightedCollisionId(otherShape.id);
              const direction = {
                x: newPos.x - otherShape.position.x,
                y: newPos.y - otherShape.position.y
              };
              if ((direction.x * mtv.x + direction.y * mtv.y) < 0) {
                mtv.x = -mtv.x;
                mtv.y = -mtv.y;
              }
              newPos.x += mtv.x;
              newPos.y += mtv.y;
              draggedShape.position = newPos;
            }
          }
          if (!isColliding) setHighlightedCollisionId(null);
          shapeToUpdate.position = draggedShape.position;
          break;
        }
      }
      newShapes[shapeIndex] = shapeToUpdate;
      return newShapes;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (interaction) {
      commitHistory(shapesRef.current);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {
    }
    setInteraction(null);
    setHighlightedCollisionId(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, part: IProjectPart) => {
    e.dataTransfer.setData('application/json', JSON.stringify(part));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault(); // This is necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const partDataString = e.dataTransfer.getData('application/json');
    if (!partDataString) return;

    const partToAdd: IProjectPart = JSON.parse(partDataString);

    if (partToAdd.quantity <= 0) return;

    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const viewbox = svgRef.current?.viewBox.baseVal;
    const scaleX = viewbox ? viewbox.width / svgRect.width : 1;
    const scaleY = viewbox ? viewbox.height / svgRect.height : 1;

    const dropX = (e.clientX - svgRect.left) * scaleX;
    const dropY = (e.clientY - svgRect.top) * scaleY;

    const newShapeInstance: DrawableShape = {
      ...partToAdd.shape,
      id: ++nextId.current,
      partId: partToAdd.id,
      position: { x: dropX, y: dropY },
      borderType: partToAdd.borderType,
      borderColor: partToAdd.borderColor,
      partColor: partToAdd.partColor,
    };

    const updatedShapes = [...shapes, newShapeInstance];
    setShapes(updatedShapes);
    commitHistory(updatedShapes);

    setProjectParts(currentParts =>
        currentParts.map(p =>
            p.id === partToAdd.id ? { ...p, quantity: p.quantity - 1 } : p
        )
    );
  };

  const handleOpenConfigModal = (part: IProjectPart) => {
    setPartToConfig(part);
    setIsConfigModalOpen(true);
  };

  const handleSavePartConfig = async (updatedPart: IProjectPart) => {
    await ProjectPartService.update(updatedPart);

    setProjectParts(currentParts =>
        currentParts.map(p => (p.id === updatedPart.id ? updatedPart : p))
    );

    setShapes(currentShapes =>
        currentShapes.map(s => {
            if (s.partId === updatedPart.id) {
                return {
                    ...s,
                    borderType: updatedPart.borderType,
                    borderColor: updatedPart.borderColor,
                    partColor: updatedPart.partColor,
                };
            }
            return s;
        })
    );

    setIsConfigModalOpen(false);
  };

  const totalArea = planeWidth * planeHeight;
  const usedArea = shapes.reduce((acc, s) => acc + calculateArea(s), 0);

  return (
      <div className="flex flex-wrap gap-5 p-5 font-sans h-screen bg-gray-100">
        {/* PAINEL DE CONTROLE */}
        <aside className="w-96 flex-shrink-0 bg-white p-6 shadow-lg flex flex-col gap-5 rounded-lg">
          <Link href="/"
                className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            ← {t('back_to_material_selection')}
          </Link>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-800">{t('cutting_plan')}: {material.name}</h4>
            <p className="text-sm text-gray-500">{t('dimensions')}: {material.width}mm
              x {material.height}mm</p>
            <label className="block mt-2.5">
              <span className="text-sm font-medium text-gray-700">{t('collision_margin_mm')}:</span>
              <input type="number" min={0} value={collisionMargin}
                     onChange={e => setCollisionMargin(Number(e.target.value))}
                     className="w-16 ml-2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"/>
            </label>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">{t('project_parts')}</h4>
            <div className="border border-gray-200 rounded-lg p-2.5 max-h-72 overflow-y-auto">
              {isLoadingParts ? (
                  <p>{t('loading_parts')}</p>
              ) : projectParts.length > 0 ? projectParts.map(part => (
                  <div key={part.id}
                       draggable={part.quantity > 0}
                       onDragStart={(e) => handleDragStart(e, part)}
                       className={`flex justify-between items-center mb-2 p-3 rounded-md border ${part.quantity > 0 ? 'bg-white cursor-grab' : 'bg-gray-100 cursor-not-allowed'} border-gray-200`}>
                    <div className="flex flex-col">
                      <span className="text-black">{part.name} ({part.quantity}x)</span>
                      <span className="text-gray-500 text-sm">
                        {t('type')}: {part.shape.type === 'polygon' ? t('polygon') : t('circle')}
                        {part.shape.type === 'polygon' && ` (${t('sides')}: ${part.shape.sides.length})`}
                      </span>
                    </div>
                    <button onClick={() => handleOpenConfigModal(part)} className="p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500"
                           fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.876 2.42 2.42a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.876 3.31-2.42 2.42a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.876-2.42-2.42a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.876-3.31 2.42-2.42.996.574 2.245.095 2.572-1.065z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>


                    </button>
                  </div>
              )) : <p>{t('no_parts_in_project')}</p>}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">{t('actions')}</h4>
            <div className="flex gap-2.5">
              <button onClick={handleClear}
                        className="flex-1 py-2 px-3 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">{t('clear')}
                </button>
              <button onClick={handleUndo} disabled={historyIndex <= 0}
                      className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{t('undo')}
              </button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
                      className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">{t('redo')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">{t('tips_drag_rotate_scale')}</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg mt-auto">
            <h4 className="font-bold mb-2 text-gray-800">{t('summary')}</h4>
            <div className="space-y-1 text-sm text-gray-700">
              <p>{t('utilization')}: {totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : 0}%</p>
              <p>{t('occupied_area')}: {Math.round(usedArea / 100)} cm²</p>
              <p>{t('total_area')}: {Math.round(totalArea / 100)} cm²</p>
            </div>
          </div>
        </aside>

        {/* CANVAS SVG */}
        <main
            className="flex-grow border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative overflow-auto select-none"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
          <svg
              ref={svgRef}
              viewBox={`0 0 ${planeWidth} ${planeHeight}`}
              width="100%"
              height="100%"
              className="touch-none block"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
          >
            {shapes.map((shape) => {
              const isInteracting = interaction?.id === shape.id;
              const isHighlighted = isInteracting || shape.id === highlightedCollisionId;
              const strokeColor = isHighlighted ? "rgba(255,0,0,0.9)" : "transparent";

              if (shape.type === 'polygon') {
                const localVertices = calculateLocalVertices(shape.sides.length, shape.sides);
                const points = localVertices.map(v => `${v.x},${v.y}`).join(' ');
                return (
                    <g key={shape.id}
                       transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`}
                       onPointerDown={e => onPointerDown(e, shape)}
                       className={isInteracting ? 'cursor-grabbing' : 'cursor-grab'}>
                      {/* Barreira de colisão visual */}
                      <polygon points={points} fill="none" stroke={strokeColor}
                               strokeWidth={collisionMargin * 2} strokeLinejoin="round"/>
                      {/* Peça real */}
                      <polygon points={points} className="stroke-black" stroke={shape.borderColor} strokeDasharray={shape.borderType === 'dotted' ? '5,5' : 'none'} strokeWidth={2}
                               fill={isInteracting ? "#8ec5fc" : shape.partColor}/>
                    </g>
                );
              } else if (shape.type === 'circle') {
                const radius = unitToPx(shape.radius, shape.unit);
                return (
                    <g key={shape.id}
                       transform={`translate(${shape.position.x},${shape.position.y})`}
                       onPointerDown={e => onPointerDown(e, shape)}
                       className={isInteracting ? 'cursor-grabbing' : 'cursor-grab'}>
                      {/* Barreira de colisão visual */}
                      <circle cx={0} cy={0} r={radius} fill="none" stroke={strokeColor}
                              strokeWidth={collisionMargin * 2}/>
                      {/* Peça real */}
                      <circle cx={0} cy={0} r={radius} className="stroke-black" stroke={shape.borderColor} strokeDasharray={shape.borderType === 'dotted' ? '5,5' : 'none'} strokeWidth={2}
                              fill={isInteracting ? "#8ec5fc" : shape.partColor}/>
                    </g>
                );
              }
              return null;
            })}
          </svg>
        </main>
        <PartConfigModal
            part={partToConfig}
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            onSave={handleSavePartConfig}
        />
      </div>
  );
};

export default ShapeDrawer;
