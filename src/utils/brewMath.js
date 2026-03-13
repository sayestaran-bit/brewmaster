/**
 * Utilería definitiva para cálculos matemáticos cerveceros.
 * Basado en estándares de la industria (BeerSmith/Braumeister).
 */

/**
 * Calcula los volúmenes de agua necesarios para una sesión de cocción.
 * 
 * @param {Object} params
 * @param {number} params.targetVolume - Volumen final deseado en el fermentador (L).
 * @param {number} params.boilTime - Tiempo de hervor en minutos.
 * @param {number} params.totalGrains - Peso total de granos en kg.
 * @param {Object} params.equipment - Perfil del equipo.
 * @param {number} params.equipment.evaporationRate - Tasa de evaporación (L/h).
 * @param {number} params.equipment.trubLoss - Pérdida en fondo de olla/mangueras (L).
 * @param {number} params.equipment.mashRatio - Relación agua/grano (L/kg).
 * @param {number} params.equipment.grainAbsorption - Factor de absorción (L/kg). Default: 1.0.
 * 
 * @returns {Object} { preBoilVolume, totalWater, strikeWater, spargeWater }
 */
export const calculateWater = ({ targetVolume, boilTime, totalGrains, equipment }) => {
    // Si equipment es un array, buscar el predeterminado
    let activeProfile = equipment;
    if (Array.isArray(equipment)) {
        activeProfile = equipment.find(e => e.isDefault) || equipment[0];
    }

    const {
        evaporationRate = 3.0,
        trubLoss = 2.0,
        mashRatio = 3.0,
        grainAbsorption = 1.0
    } = activeProfile || {};

    const boilHours = (Math.max(1, Number(boilTime) || 60)) / 60;
    const grains = Math.max(0, Number(totalGrains) || 0);
    const target = Math.max(0.1, Number(targetVolume) || 20);

    // 1. Volumen Pre-Hervor (V_pb)
    // Lo que debe haber en la olla antes de encender el fuego
    const preBoilVolume = target + Number(trubLoss) + (Number(evaporationRate) * boilHours);

    // 2. Agua Total Necesaria
    // V_pb + lo que se chupa el grano
    const totalWater = preBoilVolume + (grains * Number(grainAbsorption));

    // 3. Agua de Maceración (Strike Water)
    const strikeWater = grains * Number(mashRatio);

    // 4. Agua de Lavado (Sparge Water)
    const spargeWater = Math.max(0, totalWater - strikeWater);

    return {
        preBoilVolume: Number(preBoilVolume.toFixed(2)),
        totalWater: Number(totalWater.toFixed(2)),
        strikeWater: Number(strikeWater.toFixed(2)),
        spargeWater: Number(spargeWater.toFixed(2))
    };
};
