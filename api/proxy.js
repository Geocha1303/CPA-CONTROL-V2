
export default async function handler(req, res) {
    // 1. Configura Headers de CORS (Permite que seu front fale com esse back)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // 2. Responde rápido para pre-flight requests do navegador
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. Extrai o endpoint desejado da query string
    // Ex: /api/proxy?endpoint=/services&country=73
    const { endpoint, ...otherQueryParams } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint não especificado' });
    }

    // 4. Monta a URL final da SMS Rush
    const BASE_URL = 'https://api.smsrush.com.br/api/v1';
    
    // Reconstrói a query string (ex: country_id=73&server_id=1)
    const queryString = new URLSearchParams(otherQueryParams).toString();
    const finalUrl = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

    try {
        // 5. Faz a requisição "Server-to-Server" (Sem bloqueio CORS)
        const response = await fetch(finalUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': req.headers.authorization || '' // Repassa o Token do usuário
            },
            body: req.method !== 'GET' && req.method !== 'DELETE' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.text();

        // Tenta fazer parse do JSON, se falhar devolve texto
        try {
            const json = JSON.parse(data);
            return res.status(response.status).json(json);
        } catch (e) {
            return res.status(response.status).send(data);
        }

    } catch (error) {
        console.error('Erro no Proxy Vercel:', error);
        return res.status(500).json({ error: 'Falha na comunicação com a API', details: error.message });
    }
}
