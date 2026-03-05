// /src/services/gemini.js

// Llama a la API Key usando la sintaxis de Vite
const getApiKey = () => {
    return import.meta.env.VITE_GEMINI_API_KEY;
};

/**
 * Llama a la API de Google Gemini enviando un prompt y retornando la respuesta.
 * Puede forzar que la respuesta sea un objeto JSON.
 */
export async function callGemini(prompt, systemInstruction = "", isJson = false) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn("⚠️ Advertencia: No se ha configurado VITE_GEMINI_API_KEY en el .env.");
        return isJson ? null : "Error local: API_KEY de Gemini no configurada en .env";
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || "Error al conectar con la IA de Gemini");

        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) throw new Error("Respuesta vacía de la Inteligencia Artificial");

        if (isJson) {
            textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(textResponse);
        }

        return textResponse;

    } catch (err) {
        console.error("Gemini Error:", err);
        if (isJson) return null;
        throw err;
    }
}

export async function getRecipeAdvice(recipe) {
    const prompt = `Analiza detalladamente esta receta de cerveza y dame recomendaciones profesionales de mejora, posibles riesgos y consejos de fermentación. Sé muy conciso y directo.\nReceta: ${JSON.stringify(recipe)}`;
    return await callGemini(prompt, "Eres un Maestro Cervecero experto.");
}
