export default async function handler(req, res) {
    // 1. Configurar CORS (Permitir llamadas desde el frontend)
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    // Manejar preflights de CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    // 2. Solo permitir requests POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        // 3. Obtener la Key *del Servidor* de Vercel (No exponer al cliente)
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('SERVER ERROR: Variables de entorno GEMINI_API_KEY faltantes en Vercel.');
            return res.status(500).json({ error: 'El servidor no tiene configurada la llave de IA GEMINI_API_KEY.' });
        }

        // 4. Recibir el body del cliente
        const { prompt, systemInstruction = "", isJson = false } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'El prompt de texto es obligatorio.' });
        }

        // 5. Preparar petición a Google Gemini
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        };

        // 6. Hacer Proxy: Enviar a Google y devolver la misma respuesta al frontend
        const googleResponse = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await googleResponse.json();

        // Si la api de google devuelve un error 400+, pasarlo completo o el status code.
        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json(data);
        }

        // Devolver respuesta JSON pura sin ser parseada del lado del proxy, el frontend manejará the logic textResponse/json.
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Gemini Proxy Error:", error);
        return res.status(500).json({ error: 'Fallo interno en el proxy de Gemini (Vercel API).' });
    }
}
