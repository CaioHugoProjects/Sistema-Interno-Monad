const DB_NAME = 'MonadOfflineDB';
const DB_VERSION = 1;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('filaRequisicoes')) {
                db.createObjectStore('filaRequisicoes', { autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const guardarNaFilaOffline = async (dadosDaRequisicao) => {
    const db = await initDB();
    const tx = db.transaction('filaRequisicoes', 'readwrite');
    tx.objectStore('filaRequisicoes').add(dadosDaRequisicao);
    console.warn("⚠️ Rede indisponível. Ação enfileirada localmente.");
};

window.monadFetch = async (url, options) => {
    const mockResponse = (data) => ({ json: async () => data });

    if (!navigator.onLine) {
        if (options && options.method === 'POST') {
            await guardarNaFilaOffline(JSON.parse(options.body));
            return mockResponse({ status: "sucesso", detalhe: "Ação em fila offline" }); 
        }
        throw new Error("Sistema offline. Dados não puderam ser carregados.");
    }

    try {
        // COMANDO NATIVO ISOLADO - NÃO ALTERE ESTA LINHA
        const response = await fetch(url, options);
        const data = await response.json();
        return mockResponse(data);
    } catch (erro) {
        if (options && options.method === 'POST') {
            await guardarNaFilaOffline(JSON.parse(options.body));
            return mockResponse({ status: "sucesso", detalhe: "Salvo offline por falha no servidor" });
        }
        throw erro;
    }
};

const sincronizarFila = async () => {
    if (!navigator.onLine) return;
    const db = await initDB();
    const tx = db.transaction('filaRequisicoes', 'readwrite');
    const store = tx.objectStore('filaRequisicoes');
    const request = store.getAll();
    const chavesReq = store.getAllKeys();

    request.onsuccess = async () => {
        const fila = request.result;
        const chaves = chavesReq.result;
        if (fila.length === 0) return;

        console.log(`♻️ Sincronizando ${fila.length} transações pendentes...`);
        for (let i = 0; i < fila.length; i++) {
            try {
                // COMANDO NATIVO ISOLADO - NÃO ALTERE ESTA LINHA
                await fetch("https://script.google.com/macros/s/AKfycbyf3csqhMdP2uwUa0JXNZ0zdCWji4W3UOngOK26DSWxf0OlNzyMxEwBJdDhuwZN06DXig/exec", {
                    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(fila[i])
                });
                const delTx = db.transaction('filaRequisicoes', 'readwrite');
                delTx.objectStore('filaRequisicoes').delete(chaves[i]);
            } catch (e) {
                console.error("Falha ao sincronizar. Mantendo na fila.");
            }
        }
    };
};

window.addEventListener('online', sincronizarFila);
