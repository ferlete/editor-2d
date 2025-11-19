'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectPartService } from '@/services/project-parts/ProjectPartService';
import { IProjectPart } from '@/interfaces/IProjectPart';
import { Side, Unit } from '@/interfaces/IShape';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { createRectangle } from '@/services/project-parts/ProjectPartService.mock';

// Helper function for unit conversion (local to this file)
const unitToPx = (value: number, unit: Unit): number => {
    switch (unit) {
        case 'mm': return value;
        case 'cm': return value * 10;
        case 'm': return value * 1000;
        default: return value;
    }
};

// Componente para renderizar o polígono SVG
const PolygonPreview: React.FC<{ sides: number; sideLengths: Side[]; borderColor: string; borderType: 'linear' | 'dotted'; partColor: string }> = ({ sides, sideLengths, borderColor, borderType, partColor }) => {
    if (sides < 3) return null;

    const size = 200; // Tamanho do contêiner do SVG
    const center = size / 2;

    let points: string[] = [];

    if (sides === 4 && sideLengths.length === 4) {
        // Draw a rectangle
        const height = sideLengths[0] ? unitToPx(sideLengths[0].length, sideLengths[0].unit) : 0;
        const width = sideLengths[1] ? unitToPx(sideLengths[1].length, sideLengths[1].unit) : 0;

        const scaleFactor = Math.min((size - 40) / width, (size - 40) / height, 1); // Scale to fit
        const scaledWidth = width * scaleFactor;
        const scaledHeight = height * scaleFactor;

        const x1 = center - scaledWidth / 2;
        const y1 = center - scaledHeight / 2;
        const x2 = center + scaledWidth / 2;
        const y2 = center + scaledHeight / 2;

        points = [
            `${x1},${y1}`,
            `${x2},${y1}`,
            `${x2},${y2}`,
            `${x1},${y2}`,
        ];

    } else {
        // Draw a regular polygon based on average side length
        const avgLengthPx = sideLengths.reduce((acc, s) => acc + unitToPx(s.length, s.unit), 0) / sides;
        const radius = avgLengthPx / (2 * Math.sin(Math.PI / sides));

        const scaleFactor = Math.min((size - 40) / (2 * radius), 1); // Scale to fit
        const scaledRadius = radius * scaleFactor;

        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * 2 * Math.PI - Math.PI / 2;
            const x = center + scaledRadius * Math.cos(angle);
            const y = center + scaledRadius * Math.sin(angle);
            points.push(`${x},${y}`);
        }
    }

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g>
                <polygon
                    points={points.join(' ')}
                    fill={partColor}
                    stroke={borderColor}
                    strokeWidth="2"
                    strokeDasharray={borderType === 'dotted' ? '5,5' : 'none'}
                />
            </g>
        </svg>
    );
};

const CirclePreview: React.FC<{ radius: number; unit: Unit; borderColor: string; borderType: 'linear' | 'dotted'; partColor: string }> = ({ radius, unit, borderColor, borderType, partColor }) => {
    const size = 200;
    const center = size / 2;
    const radiusPx = unitToPx(radius, unit);
    const scaleFactor = Math.min((size - 40) / (2 * radiusPx), 1);
    const scaledRadius = radiusPx * scaleFactor;

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <g>
                <circle
                    cx={center}
                    cy={center}
                    r={scaledRadius}
                    fill={partColor}
                    stroke={borderColor}
                    strokeWidth="2"
                    strokeDasharray={borderType === 'dotted' ? '5,5' : 'none'}
                />
            </g>
        </svg>
    );
};


export default function ConfigPage() {
    const { t } = useTranslation('config');
    const searchParams = useSearchParams();
    const router = useRouter();
    const partId = searchParams.get('partId');

    const [part, setPart] = useState<IProjectPart | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado para o formulário
    const [shapeType, setShapeType] = useState<'polygon' | 'circle'>('polygon');
    const [numSides, setNumSides] = useState(5);
    const [sideLengths, setSideLengths] = useState<Side[]>([]);
    const [radius, setRadius] = useState(10);
    const [radiusUnit, setRadiusUnit] = useState<Unit>('cm');
    const [quantity, setQuantity] = useState(1); // New state for quantity
    const [partName, setPartName] = useState(''); // New state for part name
    const [borderType, setBorderType] = useState<'linear' | 'dotted'>('linear');
    const [borderColor, setBorderColor] = useState('#000000');
    const [partColor, setPartColor] = useState('#a0c4ff');

    useEffect(() => {
        if (!partId) {
            setError(t('no_part_selected'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        ProjectPartService.getById(Number(partId)).then((partResult) => {
            if (!partResult) {
                setError(t('part_not_found', { partId }));
            } else {
                setPart(partResult);
                setShapeType(partResult.shape.type);
                setQuantity(partResult.quantity); // Initialize quantity
                setPartName(partResult.name); // Initialize part name
                setBorderType(partResult.borderType);
                setBorderColor(partResult.borderColor);
                setPartColor(partResult.partColor);
                if (partResult.shape.type === 'polygon') {
                    setNumSides(partResult.shape.sides.length);
                    if (partResult.shape.sides.length === 4) {
                        const width = partResult.shape.sides[1].length;
                        const height = partResult.shape.sides[0].length;
                        const newRectangle = createRectangle(partResult.id, width, height);
                        setSideLengths(newRectangle.sides);
                    } else {
                        setSideLengths(partResult.shape.sides);
                    }
                } else if (partResult.shape.type === 'circle') {
                    setRadius(partResult.shape.radius);
                    setRadiusUnit(partResult.shape.unit);
                }
            }
        }).finally(() => setIsLoading(false));
    }, [partId, t]);

    useEffect(() => {
        if (shapeType === 'polygon') {
            setSideLengths(prevSideLengths => {
                const newSideLengths = Array.from({ length: numSides });
                for (let i = 0; i < numSides; i++) {
                    newSideLengths[i] = prevSideLengths[i] || { length: 5.0, unit: 'cm' };
                }
                return newSideLengths as Side[];
            });
        }
    }, [numSides, shapeType]);

    const handleSideLengthChange = (index: number, value: string) => {
        const newLengths = [...sideLengths];
        newLengths[index] = { ...newLengths[index], length: parseFloat(value) || 0 };
        setSideLengths(newLengths);
    };

    const handleSideUnitChange = (index: number, value: Unit) => {
        const newLengths = [...sideLengths];
        newLengths[index] = { ...newLengths[index], unit: value };
        setSideLengths(newLengths);
    };

    const handleSave = async () => {
        if (!part) return;

        setIsSaving(true);
        let updatedPart: IProjectPart;

        if (shapeType === 'polygon') {
            updatedPart = {
                ...part,
                name: partName, // Include name
                quantity: quantity, // Include quantity
                borderType: borderType,
                borderColor: borderColor,
                partColor: partColor,
                shape: {
                    id: part.shape.id,
                    position: part.shape.position,
                    type: 'polygon',
                    sides: sideLengths,
                    rotation: part.shape.type === 'polygon' ? part.shape.rotation : 0, // Preserve rotation if it exists
                },
            };
        } else { // circle
            updatedPart = {
                ...part,
                name: partName, // Include name
                quantity: quantity, // Include quantity
                borderType: borderType,
                borderColor: borderColor,
                partColor: partColor,
                shape: {
                    id: part.shape.id,
                    position: part.shape.position,
                    type: 'circle',
                    radius: radius,
                    unit: radiusUnit,
                },
            };
        }

        try {
            await ProjectPartService.update(updatedPart);
            router.push('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('save_failed'));
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <p className="text-lg text-gray-600">{t('loading_config')}</p>
            </div>
        );
    }

    if (error || !part) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
                <p className="text-lg text-red-600 mb-4">{error || t('error_loading_part')}</p>
                <Link href="/" className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700">
                    {t('back_to_home')}
                </Link>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen relative">
            <LanguageSwitcher />
            <h1 className="text-3xl font-bold text-gray-800 mb-8">{t('part_config')} {part.name}</h1>
            <div className="flex gap-8">
                {/* Painel de Configuração */}
                <div className="w-1/3 bg-white p-6 rounded-lg shadow-md">
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-3 text-gray-900">{t('create_shape')}</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <label className="text-gray-900">
                                <input type="radio" name="shapeType" value="polygon" checked={shapeType === 'polygon'} onChange={() => setShapeType('polygon')} className="mr-2" />
                                {t('polygon')}
                            </label>
                            <label className="text-gray-900">
                                <input type="radio" name="shapeType" value="circle" checked={shapeType === 'circle'} onChange={() => setShapeType('circle')} className="mr-2" />
                                {t('circle')}
                            </label>
                        </div>

                        {shapeType === 'polygon' && (
                            <div>
                                <label className="block mb-4">
                                    <span className="text-gray-900">{t('num_sides')}:</span>
                                    <input
                                        type="number"
                                        value={numSides}
                                        onChange={(e) => setNumSides(parseInt(e.target.value, 10) || 0)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-gray-900"
                                    />
                                </label>

                                {sideLengths.map((side, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <label className="flex-grow">
                                            <span className="text-gray-900 text-sm">{t('side')} {index + 1}:</span>
                                            <input
                                                type="number"
                                                value={side.length ?? 0}
                                                onChange={(e) => handleSideLengthChange(index, e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900"
                                            />
                                        </label>
                                        <select value={side.unit} onChange={(e) => handleSideUnitChange(index, e.target.value as Unit)} className="mt-7 rounded-md border-gray-300 text-gray-900">
                                            <option value="mm">mm</option>
                                            <option value="cm">cm</option>
                                            <option value="m">m</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}

                        {shapeType === 'circle' && (
                            <div className="flex items-center gap-2 mb-2">
                                <label className="flex-grow">
                                    <span className="text-gray-900 text-sm">{t('radius')}:</span>
                                    <input
                                        type="number"
                                        value={radius}
                                        onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-gray-900"
                                    />
                                </label>
                                <select value={radiusUnit} onChange={(e) => setRadiusUnit(e.target.value as Unit)} className="mt-7 rounded-md border-gray-300 text-gray-900">
                                    <option value="mm">mm</option>
                                    <option value="cm">cm</option>
                                    <option value="m">m</option>
                                </select>
                            </div>
                        )}
                        {/* New name input */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">{t('part_name')}</label>
                            <input
                                type="text"
                                value={partName}
                                onChange={(e) => setPartName(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                            />
                        </div>
                        {/* Quantity input */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">{t('quantity')}</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                            />
                        </div>
                        <div className="mt-4">
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
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Cor da Borda</label>
                            <input
                                type="color"
                                value={borderColor}
                                onChange={(e) => setBorderColor(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Cor da Peça</label>
                            <input
                                type="color"
                                value={partColor}
                                onChange={(e) => setPartColor(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-6">
                        <Link href="/" className="flex-1 text-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50">
                            {t('back')}
                        </Link>
                        <button onClick={handleSave} disabled={isSaving} className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-blue-700 disabled:opacity-50">
                            {isSaving ? t('saving') : t('save')}
                        </button>
                    </div>
                </div>

                {/* Painel de Preview */}
                <div className="w-2/3 bg-white p-6 rounded-lg shadow-md flex items-center justify-center">
                    {shapeType === 'polygon' ? (
                        <PolygonPreview sides={numSides} sideLengths={sideLengths} borderColor={borderColor} borderType={borderType} partColor={partColor} />
                    ) : (
                        <CirclePreview radius={radius} unit={radiusUnit} borderColor={borderColor} borderType={borderType} partColor={partColor} />
                    )}
                </div>
            </div>
        </div>
    );
}
