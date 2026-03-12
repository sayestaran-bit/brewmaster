/**
 * @file recipe.ts
 * @description Definición de tipos e interfaces para el sistema de recetas de BrewMaster.
 * Esta "interfaz" sirve como contrato entre el Frontend y Backend para asegurar la consistencia de los datos.
 */

/**
 * Unidades de tiempo permitidas en el proceso.
 */
export type TimeUnit = 'm' | 'h' | 'd';

/**
 * Estructura base para cualquier insumo (malta, lúpulo, aditivo, etc.)
 */
export interface RecipeIngredient {
    /** Identificador único opcional */
    id?: string;
    /** Nombre del insumo tal como aparece en el inventario */
    name: string;
    /** Cantidad numérica */
    amount: number;
    /** Unidad de medida (kg, g, sobre, ml, etc.) */
    unit: string;
    /** ID de la etapa del roadmap (milling, mashing, boiling, etc.) donde se agrega */
    stepId: string;
    /** Fase general de la receta (cooking, fermenting, bottling) */
    phase: 'cooking' | 'fermenting' | 'bottling';
    
    /** 
     * Tiempo de adición del insumo dentro de la etapa.
     * 
     * @rule_Boiling
     * En la etapa de 'Cocción' (Boiling), el tiempo funciona como una cuenta regresiva:
     * - Un valor igual a la duración total (ej. 60) significa "Al inicio del hervor".
     * - Un valor medio (ej. 15) significa "Cuando falten 15 minutos para terminar".
     * - Un valor de 0 significa "Al apagar el fuego / Flameout".
     */
    additionTime: number;
    
    /** Unidad de tiempo para la adición (minutos, horas, días) */
    additionTimeUnit: TimeUnit;
}

/**
 * Interfaz para Maltas
 */
export interface Malt extends RecipeIngredient {
    phase: 'cooking';
    stepId: 'mashing'; // Por defecto, pero puede variar
}

/**
 * Interfaz para Lúpulos
 */
export interface Hop extends RecipeIngredient {
    // Los lúpulos heredan todo de RecipeIngredient
}

/**
 * Interfaz para Levadura
 */
export interface Yeast {
    name: string;
    amount: number;
    unit: string;
    /** Etapa donde se inocula (normalmente 'fermenting') */
    stepId: string;
}

/**
 * Definición de un Paso/Etapa del Roadmap
 */
export interface RoadmapStep {
    id: string;
    /** ID de la etapa estándar (milling, mashing, boiling, etc.) */
    stageId: string;
    title: string;
    desc: string;
    details?: string;
    duration: number;
    timeUnit: TimeUnit;
    phase: 'cooking' | 'fermenting' | 'bottling';
}

/**
 * Estructura completa de una Receta
 */
export interface Recipe {
    id?: string;
    name: string;
    family: string;
    style: string;
    subStyle: string;
    description: string;
    targetVolume: number;
    og: number;
    fg: number;
    abv: number;
    ibu: number;
    colorSRM: number;
    ingredients: {
        malts: RecipeIngredient[];
        hops: RecipeIngredient[];
        others: RecipeIngredient[];
        yeast: Yeast;
    };
    steps: RoadmapStep[];
    skippedStages: string[];
}
