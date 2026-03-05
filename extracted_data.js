const initialRecipes = [
  {
    id: 'hazy-tamango-pro', category: 'Hazy IPA', name: "Jugosa Hazy IPA (Estilo Tamango)", 
    description: "Una explosi├│n tropical en tu boca. Esta Hazy IPA rinde tributo a las mejores cervezas de la costa oeste, con un cuerpo incre├¡blemente sedoso (gracias a la avena y el trigo) y un perfil arom├ítico donde el mango, la maracuy├í y el durazno bailan juntos. Amargor bajo, pero sabor infinito. Perfecta para tomar frente al mar o so├▒ar que est├ís en ├®l.",
    targetVolume: 20, og: 1.065, fg: 1.015, abv: 6.5, ibu: 42, colorSRM: 5,
    waterProfile: { Ca: 120, Mg: 15, SO4: 75, Cl: 200, HCO3: 50 },
    ingredients: {
      malts: [ { name: "Malta Pilsen", amount: 4.5, unit: "kg" }, { name: "Avena en hojuelas", amount: 1.0, unit: "kg" }, { name: "Trigo en hojuelas", amount: 0.8, unit: "kg" } ],
@@ -141,12 +152,12 @@ const initialRecipes = [
      yeast: { name: "Lallemand Verdant IPA", amount: 1, unit: "sobre" }, water: { strike: 22, sparge: 12 }
    },
    steps: [ 
      { id: 1, title: "Maceraci├│n y Ajuste de Agua", desc: "Macerar a 67┬░C por 60 min. Buscar sedosidad extrema.", details: "1. Calienta el agua en la Guten a 71┬░C.\n2. Agrega tus sales para llegar al perfil (├®nfasis en Cloruros).\n3. Incorpora los granos lentamente removiendo para evitar grumos, la avena tiende a apelmazarse.\n4. Mide el pH a los 10 min: el objetivo es 5.2 - 5.3.", duration: 60 }, 
      { id: 2, title: "Lavado (Sparge)", desc: "Lavar suavemente con 12L a 75┬░C.", details: "1. Realiza un lavado lento sobre la cama de granos.\n2. Es CR├ìTICO no superar los 76┬░C en el agua de lavado.\n3. Vigila que el pH no suba de 5.8 al final del proceso, o extraer├ís taninos astringentes de las c├íscaras.", duration: 15 }, 
      { id: 3, title: "Hervor Controlado", desc: "Hervir 60 min. Adici├│n de amargor limpio.", details: "1. Lleva el mosto a ebullici├│n vigorosa.\n2. Vigila el 'Hot Break' (espuma inicial) para evitar derrames.\n3. Al romper hervor, agrega los 10g de Magnum para dar la columna vertebral de amargor limpio y sin asperezas.", duration: 60 }, 
      { id: 4, title: "Whirlpool / Hop Stand Cr├¡tico", desc: "Enfriar a 80┬░C e incorporar l├║pulos de aroma.", details: "1. Apaga el fuego y enfr├¡a el mosto a 80┬░C exactos (┬íFase clave!).\n2. Agrega las cargas masivas de Citra y Mosaic.\n3. Mant├®n un remolino constante y suave por 20 minutos. A esta temperatura no sumar├ís IBUs, pero extraer├ís todos los aceites esenciales tropicales.", duration: 20 },
      { id: 5, title: "Fermentaci├│n y Biotransformaci├│n", desc: "Inocular a 18┬░C. Dry Hop activo.", details: "1. Enfr├¡a a 18┬░C y traspasa al fermentador oxigenando muy bien el mosto.\n2. Inocula la levadura Verdant IPA.\n3. D├ìA 2-3 (Alta actividad de burbujeo): Agrega el primer Dry Hop. Esto permite la 'biotransformaci├│n' de aceites.\n4. Deja subir la temperatura a 20┬░C hacia el final para el descanso de diacetilo.\n5. D├ìA 7: Agrega el segundo Dry Hop." },
      { id: 6, title: "Maduraci├│n y Envasado", desc: "Cold Crash extremo y purga de O2.", details: "1. Baja la temperatura a 2┬░C (Cold Crash) por al menos 48hrs para precipitar l├║pulo y levadura.\n2. Al envasar, purga todo equipo con CO2. El ox├¡geno destruir├í esta cerveza en d├¡as." }
    ],
    tips: [ 
      { title: "Miedo al Ox├¡geno", desc: "Las Hazy IPAs mueren en d├¡as si se exponen al ox├¡geno. Evita abrir la tapa del fermentador para mirar. Usa un sistema de purga de CO2." },
@@ -155,7 +166,9 @@ const initialRecipes = [
    ], modifications: []
  },
  {
    id: 'doble-hazy-ipa-pro', category: 'Hazy IPA', name: "Nebulosa DDH - Doble Hazy", 
    description: "El hermano mayor de la Jugosa. Elevamos el alcohol al 8.2% y aplicamos un Doble Dry Hop (DDH) obsceno con l├║pulo Galaxy australiano. El resultado es un n├®ctar de dioses, espeso, que nubla la copa y te golpea con un aroma resinoso y a frutas de carozo. Advertencia: No conducir maquinaria pesada despu├®s de probarla.",
    targetVolume: 20, og: 1.080, fg: 1.018, abv: 8.2, ibu: 55, colorSRM: 6,
    waterProfile: { Ca: 130, Mg: 15, SO4: 80, Cl: 220, HCO3: 50 },
    ingredients: { 
      malts: [{ name: "Malta Pilsen", amount: 6.0, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.0, unit: 'kg' }], 
@@ -163,11 +176,11 @@ const initialRecipes = [
      yeast: {name: 'Verdant', amount: 2, unit: 'sobres'}, water: {strike: 25, sparge: 12} 
    },
    steps: [
      { id: 1, title: "Maceraci├│n Densa", desc: "66┬░C por 60 min. Cuidado con atascos.", details: "1. Calienta 25L de agua a 70┬░C.\n2. Al tener una carga de granos masiva (8.5kg para 20L), la integraci├│n debe ser lent├¡sima.\n3. Remueve constantemente desde el fondo. Tienes alto riesgo de canalizaci├│n (stuck mash) por la avena y el trigo.\n4. Recircula a bajo caudal los primeros 15 minutos.", duration: 60 },
      { id: 2, title: "Lavado Controlado", desc: "Lavar con 12L a 75┬░C.", details: "1. No te apresures en abrir la v├ílvula a tope.\n2. Lava lentamente para darle tiempo al agua de arrastrar la tremenda cantidad de az├║cares atrapados.\n3. Det├®n el lavado si alcanzas tu volumen de pre-hervor deseado, no sobre-laves.", duration: 20 },
      { id: 3, title: "Hervor Denso", desc: "Hervir 60 min. A├▒adir Magnum.", details: "1. Alcanza ebullici├│n y a├▒ade el Magnum.\n2. Un mosto con densidad cercana a 1.080 es un alm├¡bar; vigila muy de cerca la olla porque los derrames (boil-overs) son violentos.\n3. Revuelve espor├ídicamente para evitar caramelizaci├│n en el fondo.", duration: 60 },
      { id: 4, title: "Whirlpool Masivo", desc: "Bajar a 78┬░C e incorporar Galaxy y Citra.", details: "1. Enfr├¡a r├ípidamente a 78┬░C.\n2. El Galaxy aporta notas intensas a maracuy├í y durazno, pero a altas temperaturas puede dar amargor vegetal.\n3. Mantenlo a 78┬░C durante 30 minutos enteros con remolino para saturar el mosto.", duration: 30 },
      { id: 5, title: "Fermentaci├│n Doble", desc: "Inocular a 18┬░C con DOS sobres.", details: "1. Enfr├¡a a 18┬░C e inyecta EL DOBLE de ox├¡geno que en una cerveza normal.\n2. Inocula obligatoriamente 2 sobres de levadura hidratada; un solo sobre sufrir├í estr├®s osm├│tico.\n3. Agrega el Dry Hop masivo de Galaxy al d├¡a 4 de fermentaci├│n activa." }
    ], 
    tips: [
      { title: "Tasa de Inoculaci├│n (Pitch Rate)", desc: "Es una cerveza de alta densidad (1.080). Un solo sobre de levadura sufrir├í estr├®s y generar├í alcoholes fusel (sabor a solvente o quemado). Aseg├║rate de usar 2 sobres bien hidratados." },
@@ -175,7 +188,9 @@ const initialRecipes = [
    ], modifications: []
  },
  {
    id: 'triple-hazy-ipa-pro', category: 'Hazy IPA', name: "Agujero Negro - Triple Hazy", 
    description: "Una aberraci├│n t├®cnica. Empujamos los l├¡mites de la f├¡sica cervecera macerando m├ís de 10 kilos de granos para apenas 20 litros. Con un brutal 10.5% de alcohol escondido tras capas y capas de avena, trigo, maltodextrina y l├║pulos Citra/Mosaic/Galaxy. Es un batido espeso, dulce y peligrosamente bebible. T├│mala a sorbos peque├▒os.",
    targetVolume: 20, og: 1.100, fg: 1.022, abv: 10.5, ibu: 65, colorSRM: 7,
    waterProfile: { Ca: 140, Mg: 15, SO4: 100, Cl: 250, HCO3: 50 },
    ingredients: { 
      malts: [{ name: "Malta Pale Ale", amount: 8.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 1.5, unit: 'kg' }, { name: "Trigo en hojuelas", amount: 1.0, unit: 'kg' }, { name: "Maltodextrina", amount: 0.5, unit: 'kg' }], 
@@ -183,35 +198,40 @@ const initialRecipes = [
      yeast: {name: 'Verdant', amount: 3, unit: 'sobres'}, water: {strike: 28, sparge: 10} 
    },
    steps: [
      { id: 1, title: "Maceraci├│n al L├¡mite", desc: "65┬░C por 90 min para alta fermentabilidad.", details: "1. Tu equipo estar├í al borde del colapso f├¡sico con casi 11kg de grano.\n2. Utiliza 28L de agua a 69┬░C para llegar a 65┬░C estables.\n3. Macera por 90 minutos para asegurar que las enzimas rompan todos los az├║cares complejos. Queremos que la levadura pueda comerlo todo.\n4. A├▒ade c├íscara de arroz si tienes, para evitar que se tape la bomba.", duration: 90 },
      { id: 2, title: "Lavado Corto", desc: "Lavar con solo 10L a 76┬░C", details: "1. Al buscar una densidad extrema de 1.100, NO podemos diluir el mosto.\n2. Lava solo con 10 litros o menos, sacrificando eficiencia por densidad.\n3. Mide la gravedad constantemente; el mosto debe caer a la olla grueso y oscuro.", duration: 15 },
      { id: 3, title: "Hervor Largo y Az├║cares", desc: "Hervir 90 min. A├▒adir Maltodextrina.", details: "1. Hierve por 90 minutos para concentrar el volumen y caramelizar ligeramente.\n2. Agrega el Columbus a los 60 min restantes.\n3. Al minuto 75 (15 min para terminar), a├▒ade la Maltodextrina disuelta previamente en mosto caliente. Esto le dar├í un cuerpo ultra pegajoso y sedoso.", duration: 90 },
      { id: 4, title: "Whirlpool Extremo", desc: "Remolino a 75┬░C por 30 minutos.", details: "1. Enfr├¡a el mosto a 75┬░C.\n2. A├▒ade 200g totales de Citra y Mosaic.\n3. Haz remolino. El mosto es tan denso que la absorci├│n de aceites ser├í m├ís lenta, dale los 30 minutos completos.", duration: 30 },
      { id: 5, title: "Fermentaci├│n T├®rmica", desc: "Inocular 3 sobres y domar la bestia a 18┬░C.", details: "1. Necesitas 3 sobres de levadura hidratados con nutriente.\n2. Oxigena por 2 minutos completos con piedra difusora.\n3. CR├ìTICO: La levadura generar├í calor violento. Controla la c├ímara a 18┬░C estrictos los primeros 5 d├¡as. Si sube a 22┬░C, sabr├í a alcohol puro e intomable.\n4. Doble Dry Hop masivo en los d├¡as 5 y 10." }
    ], tips: [ 
      { title: "Control de Temperatura Activo", desc: "A 10.5% ABV, la levadura genera una cantidad absurda de energ├¡a t├®rmica. Si no tienes un refrigerador controlado (Inkbird), no intentes esta receta en verano." },
      { title: "Nutrientes Obligatorios", desc: "A├▒adir nutrientes de levadura (Zinc, amino├ícidos) en los ├║ltimos 10 min de hervor es la diferencia entre una fermentaci├│n que termina limpia y una que se estanca en 1.040, dejando una cerveza dulce y empalagosa." }
    ], modifications: []
  },
  {
    id: 'oatmeal-stout-pro', category: 'Stout', name: "Expreso de Medianoche", 
    description: "Una Stout inglesa de manual, pero mejorada. El uso intensivo de avena le otorga una textura en boca tan suave como el terciopelo. Las maltas tostadas no se maceran desde el inicio, sino que se a├▒aden al final para extraer todo ese aroma a espresso reci├®n hecho y chocolate negro intenso sin nada de la aspereza ├ícida. Ideal para los d├¡as fr├¡os.",
    targetVolume: 20, og: 1.058, fg: 1.016, abv: 5.5, ibu: 32, colorSRM: 38,
    waterProfile: { Ca: 50, Mg: 10, SO4: 50, Cl: 50, HCO3: 150 },
    ingredients: { 
      malts: [{ name: "Malta Pale Ale", amount: 4.0, unit: 'kg' }, { name: "Avena en hojuelas", amount: 0.8, unit: 'kg' }, { name: "Cebada Tostada", amount: 0.3, unit: 'kg' }, { name: "Malta Chocolate", amount: 0.2, unit: 'kg' }], 
      hops: [{ name: "Fuggles", amount: 40, unit: 'g', time: "60 min", stage: "Hervor" }], 
      yeast: {name: 'S-04', amount: 1, unit: 'sobre'}, water: {strike: 18, sparge: 14} 
    },
    steps: [
      { id: 1, title: "Maceraci├│n Base", desc: "68┬░C por 50 min. Solo maltas claras y avena.", details: "1. Integra SOLO la Malta Pale y la Avena en el agua a 68┬░C.\n2. TRUCO PRO: Macera a esta temperatura alta para dejar az├║cares no fermentables que dar├ín cuerpo.\n3. NO agregues la malta Chocolate ni la Cebada Tostada todav├¡a. Su acidez destruir├¡a el pH ├│ptimo de conversi├│n de las maltas base.", duration: 50 },
      { id: 2, title: "Adici├│n de Maltas Oscuras", desc: "Minuto 50: A├▒adir oscuras por encima.", details: "1. Al minuto 50, espolvorea la malta Chocolate y la Cebada Tostada por encima de la cama de granos.\n2. Remueve solo la capa superior (1-2 cm), sin llegar al fondo.\n3. D├®jalo reposar 10-15 minutos m├ís. Esto extrae el color profundo y el rico aroma a caf├® y chocolate, pero deja la astringencia t├ínica atr├ís.", duration: 15 },
      { id: 3, title: "Hervor Cl├ísico Ingl├®s", desc: "Hervir 60 minutos con l├║pulo Fuggles.", details: "1. Lavado normal y llevar a ebullici├│n.\n2. A├▒ade los 40g de Fuggles al minuto 0.\n3. En una buena Stout, el l├║pulo no debe dar sabor ni aroma, solo amargor de soporte para equilibrar el dulzor de la malta.", duration: 60 },
      { id: 4, title: "Fermentaci├│n Inglesa", desc: "Fermentar a 19┬░C con levadura S-04.", details: "1. Enfr├¡a a 19┬░C y a├▒ade un sobre de S-04.\n2. Esta temperatura fomenta que la cepa inglesa genere ligeros ├®steres afrutados (como a mora o ciruela) que combinan perfecto con el chocolate de las maltas oscuras.\n3. Termina la fermentaci├│n a 21┬░C." }
    ], tips: [ 
      { title: "Cold Steeping (Infusi├│n en Fr├¡o)", desc: "Como alternativa pro al paso 2: Deja remojando la malta Chocolate y Tostada en agua fr├¡a por 24hs en el refrigerador. Filtra el l├¡quido negro y a├▒├ídelo en los ├║ltimos 5 minutos del hervor. Obtendr├ís un sabor a caf├® ultra suave." },
      { title: "Carbonataci├│n Baja", desc: "Apunta a una carbonataci├│n baja de estilo brit├ínico (1.8 a 2.0 vol├║menes de CO2). Ponerle mucho gas destruir├í la sensaci├│n cremosa en boca que tanto trabajo te cost├│ conseguir con la avena." } 
    ], modifications: []
  },
  { 
    id: 'lager-premium-pro', category: 'Lager', name: "Pilsner del Sur", 
    description: "Una obra maestra de paciencia y precisi├│n. Inspirada en las cl├ísicas lagers checas, esta cerveza es cristalina, s├║per refrescante y tiene ese toque floral inconfundible del l├║pulo noble Saaz. Maceraci├│n escalonada y semanas de maduraci├│n en fr├¡o (Lagering) la convierten en el premio final despu├®s de cortar el pasto.",
    targetVolume: 20, og: 1.048, fg: 1.010, abv: 5.0, ibu: 28, colorSRM: 4,
    waterProfile: { Ca: 50, Mg: 5, SO4: 50, Cl: 50, HCO3: 20 },
    ingredients: { 
      malts: [{name: 'Malta Pilsen', amount: 4.5, unit: 'kg'}, {name: 'Carapils', amount: 0.2, unit: 'kg'}], 
@@ -219,17 +239,20 @@ const initialRecipes = [
      yeast: {name: 'W-34/70', amount: 2, unit: 'sobres'}, water: {strike: 18, sparge: 14} 
    }, 
    steps: [
      { id: 1, title: "Maceraci├│n Escalonada", desc: "Escal├│n proteico y de sacarificaci├│n.", details: "1. Empieza la maceraci├│n a 52┬░C por 15 minutos. Esto descompone prote├¡nas medias mejorando dr├ísticamente la retenci├│n de espuma.\n2. Sube la temperatura a 64┬░C por 45 minutos. Esta temperatura baja crea un mosto muy fermentable, esencial para una Lager seca y crujiente.\n3. Sube a 75┬░C por 10 min para hacer el Mash Out.", duration: 70 },
      { id: 2, title: "Hervor Largo (Destapado)", desc: "Hervir 90 min para evaporar DMS.", details: "1. La malta Pilsen contiene precursores de DMS (que da un defecto de sabor a ma├¡z cocido o verdura hervida).\n2. DEBES hervir por 90 minutos vigorosamente y sin tapa para que este compuesto se evapore.\n3. Agrega el Magnum al min 60 (quedando 30 min de los 90) y el m├¡tico l├║pulo Saaz al minuto 15.", duration: 90 },
      { id: 3, title: "Inoculaci├│n en Fr├¡o", desc: "Bajar a 10┬░C y doble levadura.", details: "1. NO incules a 20┬░C para luego enfriar, eso generar├í sabores frutales que arruinan la Lager.\n2. Enfr├¡a el mosto hasta 10┬░C u 11┬░C.\n3. Oxigena al m├íximo e inocula DOS sobres de W-34/70. Las levaduras a baja temperatura son lentas y necesitan un ej├®rcito grande." },
      { id: 4, title: "Descanso de Diacetilo y Lagering", desc: "Subir a 16┬░C y luego madurar a 1┬░C.", details: "1. Fermenta a 12┬░C. Cuando queden unos 4 o 5 puntos para llegar a la densidad final (ej: en 1.015), sube el refrigerador a 16┬░C por 3 d├¡as. La levadura reabsorber├í la mol├®cula de la mantequilla (Diacetilo).\n2. Lagering: Baja la temperatura 2┬░C por d├¡a hasta llegar a 1┬░C y d├®jala madurar ah├¡ por 4 a 6 semanas. La paciencia hace al maestro." }
    ], 
    tips: [
      { title: "Tratamiento de Agua Ligera", desc: "Una Pilsner exige agua muy blanda. Si el agua de tu llave es dura (mucho sarro), dil├║yela con un 50% a 70% de agua desmineralizada o de ├│smosis inversa. Demasiado sulfato o bicarbonato har├í que el amargor raspe la lengua." },
      { title: "El Factor Claridad", desc: "A├▒ade musgo irland├®s (Irish Moss) o Whirlfloc 15 minutos antes de terminar el hervor. Junto con el 'Lagering' de 4 semanas, la cerveza saldr├í brillante como cristal sin necesidad de filtrar mec├ínicamente." }
    ], modifications: [] 
  },
  { 
    id: 'amber-ale-pro', category: 'Amber Ale', name: "Red Marzen Americana", 
    description: "Una oda al equilibrio perfecto entre malta y l├║pulo. Esta cerveza brilla con un color rub├¡ hipn├│tico. En boca, arranca con un dulzor a caramelo tostado y corteza de pan (gracias a la malta Melanoidina), y remata con un toque resinoso y a pomelo cl├ísico del l├║pulo americano Cascade. Una todoterreno infalible para cualquier ocasi├│n.",
    targetVolume: 20, og: 1.055, fg: 1.012, abv: 5.6, ibu: 32, colorSRM: 14,
    waterProfile: { Ca: 80, Mg: 10, SO4: 100, Cl: 80, HCO3: 80 },
    ingredients: { 
      malts: [{name: 'Malta Pale Ale', amount: 4.0, unit: 'kg'}, {name: 'Caramelo 60L', amount: 0.5, unit: 'kg'}, {name: 'Melanoidina', amount: 0.3, unit: 'kg'}, {name: 'Cebada Tostada', amount: 0.05, unit: 'kg'}], 
@@ -237,12 +260,13 @@ const initialRecipes = [
      yeast: {name: 'US-05', amount: 1, unit: 'sobre'}, water: {strike: 18, sparge: 14} 
    }, 
    steps: [
      { id: 1, title: "Maceraci├│n Balanceada", desc: "66┬░C por 60 min", details: "1. Calienta 18L de agua a 71┬░C.\n2. Integra los granos para asentar a 66┬░C exactos.\n3. Esta temperatura media es crucial: no queremos un mosto seco ni tampoco un alm├¡bar; buscamos un soporte de malta perfecto para contrarrestar el l├║pulo Cascade.\n4. Mide pH y mant├®n en 5.3.", duration: 60 },
      { id: 2, title: "Hervor y Sabor Americano", desc: "60 min. Adiciones de Cascade.", details: "1. Lleva a ebullici├│n viva.\n2. A├▒ade 20g de Cascade al inicio. Esto aportar├í un amargor c├¡trico muy limpio.\n3. A los 45 minutos (faltando 15 min), agrega los otros 30g de Cascade. Esta carga tard├¡a fijar├í el cl├ísico sabor a pino y pomelo t├¡pico de las cervezas craft americanas.", duration: 60 },
      { id: 3, title: "Fermentaci├│n Limpia", desc: "18┬░C con levadura Ale Neutra (US-05).", details: "1. Enfr├¡a el mosto a 18┬░C.\n2. Inocula la US-05. Es importante mantener la temperatura controlada; no queremos ├®steres afrutados de la levadura que confundan el paladar, queremos dejar brillar el caramelo de la malta y el pino del l├║pulo." }
    ], 
    tips: [
      { title: "El Truco del Color", desc: "Quiz├ís te preguntes qu├® hacen 50 gramos min├║sculos de Cebada Tostada en esta receta. No aportar├ín sabor a caf├®, su ├║nico prop├│sito es corregir el espectro visual para lograr ese caracter├¡stico tono Rojo Rub├¡ intenso, en lugar de un caf├® aguado." },
      { title: "Malta Melanoidina", desc: "La adici├│n de Melanoidina imita el complejo sabor a corteza de pan tostado que normalmente se logra mediante decocci├│n (un m├®todo alem├ín muy complejo). Es un atajo de Maestro Cervecero." }
    ], modifications: [] 
  }
];