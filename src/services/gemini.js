// /src/services/gemini.js
// Servicio de integración con la API proxy de Google Gemini.
// Incluye reintentos con exponential backoff y timeout por solicitud.

// --- CONFIGURACIÓN ---
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 segundo base
const REQUEST_TIMEOUT_MS = 30000; // 30 segundos por intento
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Calcula el delay con exponential backoff + jitter aleatorio.
 * @param {number} attempt - Número de intento (0-indexed)
 * @returns {number} - Milisegundos de espera
 */
const getBackoffDelay = (attempt) => {
    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * BASE_DELAY_MS * 0.5;
    return exponentialDelay + jitter;
};

/**
 * Espera un tiempo determinado.
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Realiza un fetch con reintentos automáticos y exponential backoff.
 * Solo reintenta en errores de red o códigos HTTP retryables (429, 5xx).
 *
 * @param {string} url - URL a la que hacer la petición
 * @param {RequestInit} options - Opciones del fetch
 * @param {number} [maxRetries=MAX_RETRIES] - Máximo de reintentos
 * @returns {Promise<Response>} - La respuesta del fetch exitoso
 * @throws {Error} - Si se agotan todos los reintentos
 */
async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Si la respuesta es exitosa o es un error del cliente (4xx) que NO sea 429,
            // retornamos inmediatamente (no tiene sentido reintentar un 400 o 403).
            if (response.ok || (!RETRYABLE_STATUS_CODES.includes(response.status) && response.status < 500)) {
                return response;
            }

            // Error retryable (429 o 5xx)
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            console.warn(
                `⚠️ Gemini API: Intento ${attempt + 1}/${maxRetries + 1} falló con HTTP ${response.status}. ` +
                (attempt < maxRetries ? `Reintentando...` : `Sin reintentos restantes.`)
            );

        } catch (err) {
            clearTimeout(timeoutId);

            // Error de red o timeout (AbortError)
            lastError = err;
            const isTimeout = err.name === 'AbortError';
            console.warn(
                `⚠️ Gemini API: Intento ${attempt + 1}/${maxRetries + 1} falló — ` +
                (isTimeout ? `Timeout (${REQUEST_TIMEOUT_MS / 1000}s)` : err.message) +
                (attempt < maxRetries ? `. Reintentando...` : `. Sin reintentos restantes.`)
            );
        }

        // Si quedan reintentos, esperar con backoff
        if (attempt < maxRetries) {
            const delay = getBackoffDelay(attempt);
            await sleep(delay);
        }
    }

    throw new Error(
        `Gemini API: Se agotaron los ${maxRetries + 1} intentos. Último error: ${lastError?.message || 'Desconocido'}`
    );
}

/**
 * Llama a la API de Google Gemini enviando un prompt y retornando la respuesta.
 * Ya NO se conecta directo a Google. Llama al endpoint Proxy en '/api/gemini'.
 *
 * @param {string} prompt - El prompt a enviar a Gemini
 * @param {string} [systemInstruction=""] - Instrucción de sistema opcional
 * @param {boolean} [isJson=false] - Si true, fuerza respuesta JSON
 * @returns {Promise<string|object|null>} - Texto o JSON parseado, null si isJson y falla
 */
export async function callGemini(prompt, systemInstruction = "", isJson = false) {
    // Si estamos en VITE corriendo local ('npm run dev'),
    // llamamos directamente a http://localhost:3000 o relativo (vercel dev usa 3000 usualmente)
    // Pero asumiendo standard Vite proxy no configurado, para prod es relativo.
    // Usamos el hostname completo si estamos en localhost Vite (port 5173/4173), sino relativo prod.
    const isDevVite = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Nota: Para probar el backend proxy localmente, el usuario DEBE correr la app con `vercel dev`.
    // Si corren con `npm run dev`, no van a existir las rutas /api/.
    const url = `/api/gemini`;

    try {
        const response = await fetchWithRetry(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, systemInstruction, isJson }),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("El proxy backend (/api/gemini) no responde. Si estás desarrollando en tu PC, asegúrate de correr el proyecto con 'vercel dev' o revisar la URL.");
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || data.error || "Error al conectar con la API Proxy de Gemini");
        }

        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error("Respuesta vacía de la Inteligencia Artificial");
        }

        if (isJson) {
            textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(textResponse);
        }

        return textResponse;

    } catch (err) {
        console.error("❌ Gemini Error:", err.message);
        throw err;
    }
}

/**
 * Obtiene recomendaciones profesionales para una receta de cerveza.
 *
 * @param {object} recipe - Objeto con los datos de la receta
 * @returns {Promise<string>} - Texto con las recomendaciones del IA
 */
export async function getRecipeAdvice(recipe) {
    const prompt = `Analiza detalladamente esta receta de cerveza y dame recomendaciones profesionales de mejora, posibles riesgos y consejos de fermentación. Sé muy conciso y directo.\nReceta: ${JSON.stringify(recipe)}`;
    return await callGemini(prompt, "Eres un Maestro Cervecero experto.");
}
