/**
 * Utility to parse BeerXML or JSON files into Brewmaster recipe objects.
 */

/**
 * Validates a Brewmaster recipe JSON structure.
 */
function validateBrewmasterJSON(json) {
    if (!json.name || !json.ingredients) {
        throw new Error("El archivo JSON no parece ser una receta de Brewmaster válida.");
    }
    return json;
}

/**
 * Parses BeerXML content into a Brewmaster-ready object.
 */
function parseBeerXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const errorNode = xmlDoc.querySelector('parsererror');
    if (errorNode) throw new Error("Error al procesar el archivo XML.");

    const recipes = xmlDoc.getElementsByTagName('RECIPE');
    if (recipes.length === 0) throw new Error("No se encontraron recetas en el archivo XML.");

    const r = recipes[0];

    const getString = (tag, parent = r) => parent.getElementsByTagName(tag)[0]?.textContent || '';
    const getFloat = (tag, parent = r) => parseFloat(parent.getElementsByTagName(tag)[0]?.textContent || 0);

    const recipe = {
        name: getString('NAME'),
        style: getString('NAME', r.getElementsByTagName('STYLE')[0] || r),
        subStyle: getString('CATEGORY', r.getElementsByTagName('STYLE')[0] || r),
        description: getString('NOTES'),
        targetVolume: getFloat('BATCH_SIZE'),
        og: getFloat('OG'),
        fg: getFloat('FG'),
        abv: getFloat('ABV') || ((getFloat('OG') - getFloat('FG')) * 131.25),
        ibu: getFloat('IBU'),
        colorSRM: getFloat('EST_COLOR'),
        malts: [],
        hops: [],
        others: [],
        yeast: '',
        steps: []
    };

    // Parse Fermentables (Malts)
    const fermentables = r.getElementsByTagName('FERMENTABLE');
    for (let f of fermentables) {
        recipe.malts.push({
            name: getString('NAME', f),
            amount: getFloat('AMOUNT', f),
            unit: 'kg',
            stepId: 'mashing'
        });
    }

    // Parse Hops
    const hops = r.getElementsByTagName('HOP');
    for (let h of hops) {
        const use = getString('USE', h);
        recipe.hops.push({
            name: getString('NAME', h),
            amount: getFloat('AMOUNT', h) * 1000, 
            unit: 'g',
            time: getFloat('TIME', h),
            additionTime: getFloat('TIME', h),
            use: use === 'Dry Hop' ? 'Dry Hop' : 'Hervor',
            phase: use === 'Dry Hop' ? 'fermenting' : 'cooking',
            stepId: use === 'Dry Hop' ? 'fermenting' : 'boiling'
        });
    }

    // Parse MISC (Salts & Clarifiers)
    const miscs = r.getElementsByTagName('MISC');
    for (let m of miscs) {
        const type = getString('TYPE', m);
        const use = getString('USE', m);
        recipe.others.push({
            name: getString('NAME', m),
            amount: getFloat('AMOUNT', m) * 1000, // Conversion if needed, BeerXML varies
            unit: 'g',
            category: type === 'Water Agent' ? 'Sales Minerales' : 'Aditivos',
            phase: use.includes('Mash') || use.includes('Boil') ? 'cooking' : 'fermenting',
            stepId: use.includes('Mash') ? 'mashing' : 'boiling'
        });
    }

    // Parse Yeast
    const yeast = r.getElementsByTagName('YEAST')[0];
    if (yeast) recipe.yeast = getString('NAME', yeast);

    // Parse Mash Steps
    const mashSteps = r.getElementsByTagName('MASH_STEP');
    if (mashSteps.length > 0) {
        for (let ms of mashSteps) {
            recipe.steps.push({
                id: `mash-${Math.random().toString(36).substr(2, 5)}`,
                stageId: 'mashing',
                title: getString('NAME', ms),
                duration: getFloat('STEP_TIME', ms),
                timeUnit: 'm',
                phase: 'cooking',
                temperature: getFloat('STEP_TEMP', ms)
            });
        }
    } else {
        recipe.steps.push({ id: 'mashing', stageId: 'mashing', title: 'Maceración', duration: 60, timeUnit: 'm', phase: 'cooking' });
    }

    recipe.steps.push(
        { id: 'boiling', stageId: 'boiling', title: 'Cocción', duration: getFloat('BOIL_TIME') || 60, timeUnit: 'm', phase: 'cooking' },
        { id: 'fermenting', stageId: 'fermenting', title: 'Fermentación', duration: 14, timeUnit: 'd', phase: 'fermenting' }
    );

    return recipe;
}

/**
 * Sanitizes an imported object to remove private data.
 */
function sanitizeImportedData(data) {
    const { id, modifications, createdAt, updatedAt, uid, ...sanitized } = data;
    return sanitized;
}

export async function processRecipeFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();

        reader.onload = (e) => {
            try {
                const content = e.target.result;
                if (extension === 'json') {
                    const parsed = JSON.parse(content);
                    resolve(sanitizeImportedData(validateBrewmasterJSON(parsed)));
                } else if (extension === 'xml' || extension === 'beerxml') {
                    resolve(parseBeerXML(content));
                } else {
                    reject(new Error("Formato de archivo no soportado. Usa .xml o .json"));
                }
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("Error al leer el archivo."));
        reader.readAsText(file);
    });
}
