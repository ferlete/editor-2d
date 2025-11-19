"use client"
import React, {useEffect, useRef, useState} from 'react';
import Link from 'next/link';

// Importando todos os tipos e dados necessários
import {IMaterial} from '@/interfaces/IMaterial';
import {IProjectPart} from '@/interfaces/IProjectPart';
import { Shape, Side, Unit, Vector} from '@/interfaces/IShape';
import {ProjectPartService} from '@/services/project-parts/ProjectPartService';


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

// --- Componente Principal ---
interface ShapeDrawerProps {
  material: IMaterial;
}

type Interaction =
    | { type: 'drag'; id: number; offset: Vector }
    | { type: 'rotate'; id: number; startAngle: number; initialRotation: number }
    | { type: 'scale'; id: number; initialShape: Shape; initialDistance: number }
    | null;

const ShapeDrawer: React.FC<ShapeDrawerProps> = ({material}) => {
  const planeWidth = material.width;
  const planeHeight = material.height;

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [projectParts, setProjectParts] = useState<IProjectPart[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [collisionMargin, setCollisionMargin] = useState(5); // Margem de 5mm por padrão
  const [interaction, setInteraction] = useState<Interaction>(null);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const shapesRef = useRef(shapes);
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
      }
    })
    .finally(() => setIsLoadingParts(false));
  }, []);

  const commitHistory = (newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newShapes]);
    setHistoryIndex(newHistory.length);
  };

  const handleAddPartFromProject = (partToAdd: IProjectPart) => {
    if (partToAdd.quantity <= 0) return;

    const newShapeInstance: Shape = {
      ...partToAdd.shape,
      // eslint-disable-next-line react-hooks/purity
      id: Date.now(), // Unique ID for this instance on canvas
      position: {x: planeWidth / 2, y: planeHeight / 2}, // Posição inicial centralizada
    };
    const updatedShapes = [...shapes, newShapeInstance];
    setShapes(updatedShapes);
    commitHistory(updatedShapes);

    setProjectParts(currentParts =>
        currentParts.map(p =>
            p.id === partToAdd.id ? {...p, quantity: p.quantity - 1} : p
        )
    );
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

  const onPointerDown = (e: React.PointerEvent<SVGElement>, shape: Shape) => {
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
  };

  const totalArea = planeWidth * planeHeight;
  const usedArea = shapes.reduce((acc, s) => acc + calculateArea(s), 0);

  return (
      <div className="flex flex-wrap gap-5 p-5 font-sans h-screen bg-gray-100">
        {/* PAINEL DE CONTROLE */}
        <aside className="w-96 flex-shrink-0 bg-white p-6 shadow-lg flex flex-col gap-5 rounded-lg">
          <Link href="/"
                className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            ← Voltar para Seleção de Materiais
          </Link>

          <div className="p-4 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-800">Plano de Corte: {material.name}</h4>
            <p className="text-sm text-gray-500">Dimensões: {material.width}mm
              x {material.height}mm</p>
            <label className="block mt-2.5">
              <span className="text-sm font-medium text-gray-700">Margem de Colisão (mm):</span>
              <input type="number" min={0} value={collisionMargin}
                     onChange={e => setCollisionMargin(Number(e.target.value))}
                     className="w-16 ml-2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"/>
            </label>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">Peças do Projeto</h4>
            <div className="border border-gray-200 rounded-lg p-2.5 max-h-72 overflow-y-auto">
              {isLoadingParts ? (
                  <p>Carregando peças...</p>
              ) : projectParts.length > 0 ? projectParts.map(part => (
                  <div key={part.id}
                       className={`flex justify-between items-center mb-2 p-3 rounded-md border ${part.quantity > 0 ? 'bg-white' : 'bg-gray-100'} border-gray-200`}>
                    <span className="text-black">{part.name} ({part.quantity}x)</span>
                    <button onClick={() => handleAddPartFromProject(part)}
                            disabled={part.quantity <= 0}
                            className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                      + Adicionar
                    </button>
                  </div>
              )) : <p>Nenhuma peça no projeto.</p>}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-800 mb-3">Ações</h4>
            <div className="flex gap-2.5">
              <button onClick={handleUndo} disabled={historyIndex <= 0}
                      className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Voltar
              </button>
              <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
                      className="flex-1 py-2 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Avançar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">💡 Dicas: Segure &#39;Alt&#39; + Arraste para
              rotacionar, &#39;Ctrl&#39; + Arraste para redimensionar.</p>
          </div>

          <div className="border border-gray-200 p-4 rounded-lg mt-auto">
            <h4 className="font-bold mb-2 text-gray-800">Resumo</h4>
            <div className="space-y-1 text-sm text-gray-700">
              <p>Aproveitamento: {totalArea > 0 ? ((usedArea / totalArea) * 100).toFixed(1) : 0}%</p>
              <p>Área Ocupada: {Math.round(usedArea / 100)} cm²</p>
              <p>Área Total: {Math.round(totalArea / 100)} cm²</p>
            </div>
          </div>
        </aside>

        {/* CANVAS SVG */}
        <main
            className="flex-grow border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative overflow-auto select-none">
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

              if (shape.type === 'polygon') {
                const localVertices = calculateLocalVertices(shape.sides.length, shape.sides);
                const points = localVertices.map(v => `${v.x},${v.y}`).join(' ');
                return (
                    <g key={shape.id}
                       transform={`translate(${shape.position.x},${shape.position.y}) rotate(${shape.rotation})`}
                       onPointerDown={e => onPointerDown(e, shape)}
                       className={isInteracting ? 'cursor-grabbing' : 'cursor-grab'}>
                      {/* Peça real */}
                      <polygon points={points} className="stroke-black" strokeWidth={2}
                               fill={isInteracting ? "#8ec5fc" : "#a0c4ff88"}/>
                    </g>
                );
              } else if (shape.type === 'circle') {
                const radius = unitToPx(shape.radius, shape.unit);
                return (
                    <g key={shape.id}
                       transform={`translate(${shape.position.x},${shape.position.y})`}
                       onPointerDown={e => onPointerDown(e, shape)}
                       className={isInteracting ? 'cursor-grabbing' : 'cursor-grab'}>
                      {/* Peça real */}
                      <circle cx={0} cy={0} r={radius} className="stroke-black" strokeWidth={2}
                              fill={isInteracting ? "#8ec5fc" : "#a0c4ff88"}/>
                    </g>
                );
              }
              return null;
            })}
          </svg>
        </main>
      </div>
  );
};

export default ShapeDrawer;
