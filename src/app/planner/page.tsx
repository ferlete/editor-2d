'use client';

import {useSearchParams} from 'next/navigation';
import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {MaterialService} from '@/services/materials/MaterialService';
import {IMaterial} from '@/interfaces/IMaterial';
import ShapeDrawer from '@/components/ShapeDrawer';
import Link from 'next/link';
import {useIsMounted} from '@/hooks/useIsMounted';

export default function PlannerPage() {
    const isMounted = useIsMounted();
    const { t } = useTranslation('planner');
    const searchParams = useSearchParams();
    const materialId = searchParams.get('materialId');

    const [material, setMaterial] = useState<IMaterial | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!materialId) {
            setError(t('no_material_selected'));
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        MaterialService.getAll().then((materialsResult) => {
            if (materialsResult instanceof Error) {
                setError(materialsResult.message);
                return;
            }

            const foundMaterial = materialsResult.find(m => m.id === Number(materialId));
            if (foundMaterial) {
                setMaterial(foundMaterial);
            } else {
                setError(t('material_not_found', { materialId }));
            }
        }).finally(() => setIsLoading(false));
    }, [materialId, t]);

    if (!isMounted || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <p className="text-lg text-gray-600">{isMounted ? t('loading_planner') : 'Loading...'}</p>
            </div>
        );
    }

    if (error || !material) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
                <p className="text-lg text-red-600 mb-4">{error || t('error_loading_material')}</p>
                <Link href="/" className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-blue-700">
                    {t('back_to_selection')}
                </Link>
            </div>
        );
    }

    // O componente ShapeDrawer controla toda a lógica e layout da página.
    return (
        <div className="min-h-screen bg-gray-100 relative">
        </div>
    );
}
