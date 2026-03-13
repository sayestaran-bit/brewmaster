/**
 * /src/utils/beerXMLParser.js
 * 
 * Utilidad para exportar recetas de BrewMaster al estándar BeerXML.
 * BeerXML es el estándar de la industria (XML) para intercambio de recetas entre software.
 */

/**
 * Exporta una receta a formato BeerXML 1.0.
 * @param {Object} recipe - Objeto de receta interno de BrewMaster.
 * @returns {string} - String XML formateado.
 */
export function exportToBeerXML(recipe) {
    if (!recipe) return '';

    const xmlParts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<RECIPES>',
        '  <RECIPE>',
        `    <NAME>${escapeXML(recipe.name)}</NAME>`,
        '    <VERSION>1</VERSION>',
        `    <TYPE>${mapType(recipe.style)}</TYPE>`,
        `    <STYLE>`,
        `      <NAME>${escapeXML(recipe.style)}</NAME>`,
        `      <CATEGORY>${escapeXML(recipe.category || '')}</CATEGORY>`,
        `      <STYLE_LETTER>A</STYLE_LETTER>`,
        `      <STYLE_GUIDE>BJCP 2021</STYLE_GUIDE>`,
        `      <VERSION>1</VERSION>`,
        `    </STYLE>`,
        `    <BREWER>${escapeXML(recipe.author || 'BrewMaster User')}</BREWER>`,
        `    <BATCH_SIZE>${recipe.targetVolume || 20}</BATCH_SIZE>`,
        `    <BOIL_SIZE>${recipe.waterVolumes?.preBoilVolume || (recipe.targetVolume * 1.2)}</BOIL_SIZE>`,
        `    <BOIL_TIME>${recipe.boilTime || 60}</BOIL_TIME>`,
        `    <EFFICIENCY>${recipe.efficiency || 75}</EFFICIENCY>`,
        '    <FERMENTABLES>',
        ...(recipe.ingredients?.malts || []).map(m => mapMalt(m)),
        '    </FERMENTABLES>',
        '    <HOPS>',
        ...(recipe.ingredients?.hops || []).map(h => mapHop(h)),
        '    </HOPS>',
        '    <YEASTS>',
        mapYeast(recipe.ingredients?.yeast),
        '    </YEASTS>',
        '    <MISCS>',
        ...(recipe.ingredients?.others || []).map(o => mapMisc(o)),
        '    </MISCS>',
        `    <OG>${recipe.og || 1.050}</OG>`,
        `    <FG>${recipe.fg || 1.010}</FG>`,
        `    <ABV>${recipe.abv || 5.0}</ABV>`,
        `    <NOTES>${escapeXML(recipe.notes || '')}</NOTES>`,
        '  </RECIPE>',
        '</RECIPES>'
    ];

    return xmlParts.join('\n');
}

// ── Helpers de Mapeo ─────────────────────────────────────────────────────────

function escapeXML(str) {
    if (!str) return '';
    return str.toString().replace(/[<>&"']/g, function (m) {
        switch (m) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return m;
        }
    });
}

function mapType(style) {
    // Básicamente todo en BrewMaster es All Grain o Extract si se definiera
    return 'All Grain';
}

function mapMalt(malt) {
    return [
        '      <FERMENTABLE>',
        `        <NAME>${escapeXML(malt.name)}</NAME>`,
        '        <VERSION>1</VERSION>',
        `        <AMOUNT>${Number(malt.amount) || 0}</AMOUNT>`,
        '        <TYPE>Grain</TYPE>',
        '        <YIELD>75.0</YIELD>',
        '        <COLOR>5.0</COLOR>',
        '      </FERMENTABLE>'
    ].join('\n');
}

function mapHop(hop) {
    return [
        '      <HOP>',
        `        <NAME>${escapeXML(hop.name)}</NAME>`,
        '        <VERSION>1</VERSION>',
        `        <ALPHA>${hop.alpha || 5.0}</ALPHA>`,
        `        <AMOUNT>${(Number(hop.amount) || 0) / 1000}</AMOUNT>`, // BeerXML usa KG para lúpulo
        `        <USE>${mapHopUse(hop.stage || hop.time)}</USE>`,
        `        <TIME>${hop.time || 60}</TIME>`,
        '      </HOP>'
    ].join('\n');
}

function mapHopUse(stage) {
    const s = (stage || '').toLowerCase();
    if (s.includes('hervor') || s.includes('boil')) return 'Boil';
    if (s.includes('dry') || s.includes('ferment')) return 'Dry Hop';
    if (s.includes('whirlpool') || s.includes('aroma')) return 'Aroma';
    return 'Boil';
}

function mapYeast(yeast) {
    if (!yeast) return '';
    const name = typeof yeast === 'string' ? yeast : yeast.name;
    return [
        '      <YEAST>',
        `        <NAME>${escapeXML(name)}</NAME>`,
        '        <VERSION>1</VERSION>',
        '        <TYPE>Ale</TYPE>',
        '        <FORM>Dry</FORM>',
        `        <AMOUNT>0.011</AMOUNT>`, // Estándar 11g = 0.011kg
        '      </YEAST>'
    ].join('\n');
}

function mapMisc(misc) {
    return [
        '      <MISC>',
        `        <NAME>${escapeXML(misc.name)}</NAME>`,
        '        <VERSION>1</VERSION>',
        `        <TYPE>${misc.category || 'Other'}</TYPE>`,
        `        <USE>Boil</USE>`,
        `        <AMOUNT>${Number(misc.amount) || 0}</AMOUNT>`,
        '      </MISC>'
    ].join('\n');
}
