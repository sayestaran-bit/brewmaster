/**
 * Aportes iónicos por gramo de sal en 1 litro de agua (ppm o mg/L).
 * Valores estándar para productos químicos grado alimentario.
 */
const MINERAL_SALTS = {
    CaCl2: { Ca: 272, Cl: 483 }, // Cloruro de Calcio
    CaSO4: { Ca: 232, SO4: 558 }, // Gypsum / Sulfato de Calcio
    MgSO4: { Mg: 99, SO4: 390 }   // Sal de Epsom / Sulfato de Magnesio
};

/**
 * Calcula las adiciones de sales necesarias para alcanzar un perfil objetivo,
 * priorizando el balance Cloruro:Sulfato.
 * 
 * @param {object} baseProfile - Perfil de agua de red/base { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {object} targetProfile - Perfil objetivo { Ca, Mg, SO4, Cl, Na, HCO3 }
 * @param {number} volume - Volumen de agua en litros
 * @returns {object} - { salts, residualError, finalProfile }
 */
export const calculateRequiredSalts = (baseProfile, targetProfile, volume) => {
    if (!baseProfile || !targetProfile || !volume || volume <= 0) return null;

    const current = { ...baseProfile };
    const additions = {
        CaCl2: 0,
        CaSO4: 0,
        MgSO4: 0
    };

    // 1. Ajustar Cloruro primero usando Cloruro de Calcio (CaCl2)
    const neededCl = Math.max(0, targetProfile.Cl - current.Cl);
    if (neededCl > 0) {
        additions.CaCl2 = (neededCl / MINERAL_SALTS.CaCl2.Cl) * volume;
        current.Cl += (additions.CaCl2 * MINERAL_SALTS.CaCl2.Cl) / volume;
        current.Ca += (additions.CaCl2 * MINERAL_SALTS.CaCl2.Ca) / volume;
    }

    // 2. Ajustar Sulfato (SO4)
    // Usamos una combinación de Gypsum (CaSO4) y Epsom (MgSO4)
    let neededSO4 = Math.max(0, targetProfile.SO4 - current.SO4);
    
    if (neededSO4 > 0) {
        // Priorizamos Gypsum si aún falta Calcio
        const neededCa = Math.max(0, targetProfile.Ca - current.Ca);
        
        if (neededCa > 0) {
            // Calculamos cuánto SO4 aporta el Gypsum necesario para cubrir el Ca faltante
            const so4FromNeededCa = (neededCa / MINERAL_SALTS.CaSO4.Ca) * MINERAL_SALTS.CaSO4.SO4;
            
            // Si el Ca faltante requiere más SO4 del que necesitamos en total, limitamos por Ca
            if (so4FromNeededCa > neededSO4) {
                additions.CaSO4 = (neededSO4 / MINERAL_SALTS.CaSO4.SO4) * volume;
            } else {
                additions.CaSO4 = (neededCa / MINERAL_SALTS.CaSO4.Ca) * volume;
            }

            current.SO4 += (additions.CaSO4 * MINERAL_SALTS.CaSO4.SO4) / volume;
            current.Ca += (additions.CaSO4 * MINERAL_SALTS.CaSO4.Ca) / volume;
            neededSO4 = Math.max(0, targetProfile.SO4 - current.SO4);
        }

        // Si después de ajustar Ca (o si ya estaba bien) falta SO4, usamos Sal de Epsom (MgSO4)
        if (neededSO4 > 0) {
            additions.MgSO4 = (neededSO4 / MINERAL_SALTS.MgSO4.SO4) * volume;
            current.SO4 += (additions.MgSO4 * MINERAL_SALTS.MgSO4.SO4) / volume;
            current.Mg += (additions.MgSO4 * MINERAL_SALTS.MgSO4.Mg) / volume;
        }
    }

    // Formatear resultados
    const saltsResult = [
        { name: 'Cloruro de Calcio (CaCl2)', amount: Number(additions.CaCl2.toFixed(2)), unit: 'g' },
        { name: 'Sulfato de Calcio (CaSO4)', amount: Number(additions.CaSO4.toFixed(2)), unit: 'g' },
        { name: 'Sulfato de Magnesio (MgSO4)', amount: Number(additions.MgSO4.toFixed(2)), unit: 'g' }
    ].filter(s => s.amount > 0);

    const residualError = {
        Ca: Number((current.Ca - targetProfile.Ca).toFixed(1)),
        Mg: Number((current.Mg - targetProfile.Mg).toFixed(1)),
        SO4: Number((current.SO4 - targetProfile.SO4).toFixed(1)),
        Cl: Number((current.Cl - targetProfile.Cl).toFixed(1))
    };

    return {
        salts: saltsResult,
        residualError,
        finalProfile: {
            ...current,
            Ca: Number(current.Ca.toFixed(1)),
            Mg: Number(current.Mg.toFixed(1)),
            SO4: Number(current.SO4.toFixed(1)),
            Cl: Number(current.Cl.toFixed(1))
        }
    };
};
