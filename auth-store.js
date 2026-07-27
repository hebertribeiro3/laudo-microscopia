/**
 * auth-store.js - Sistema de Autenticação, Banco de Dados (IndexedDB) e Controle de Acesso por Hierarquia
 * Solubio On Farm - Gerenciador de Laudos
 */

const LaudoDB = (function () {
    const DB_NAME = 'SolubioLaudosDB_v8';
    const DB_VERSION = 1;
    let dbInstance = null;

    // Usuários Padrão para Iniciar o Sistema
    const DEFAULT_USERS = [
        {
            id: 'usr_admin',
            name: 'Hebert Souza',
            email: 'hebert.souza@solubio.agr.br',
            password: '123',
            role: 'admin',
            coordinatorId: null,
            mustChangePassword: true
        },
        {
            id: 'usr_coord_bruna',
            name: 'Bruna Carneiro',
            email: 'bruna.carneiro@solubio.agr.br',
            password: '123',
            role: 'coordenador',
            coordinatorId: null,
            mustChangePassword: true
        },
        {
            id: 'usr_cons_joao',
            name: 'João Silva',
            email: 'joao.consultor@solubio.agr.br',
            password: '123',
            role: 'consultor',
            coordinatorId: 'usr_coord_bruna',
            mustChangePassword: true
        },
        {
            id: 'usr_cons_maria',
            name: 'Maria Santos',
            email: 'maria.consultor@solubio.agr.br',
            password: '123',
            role: 'consultor',
            coordinatorId: 'usr_coord_bruna',
            mustChangePassword: true
        }
    ];

    // Clientes/Fazendas Iniciais da Planilha (Atribuídos exclusivamente ao Admin Hebert Souza)
    const DEFAULT_CLIENTS = [
        { id: 'cli_1', userId: 'usr_admin', name: 'Gilson Adriano Bomfim - Fazenda Sagrada Fámilia' },
        { id: 'cli_2', userId: 'usr_admin', name: 'Marcelo Isoton - Fazenda Reaconquista II' },
        { id: 'cli_3', userId: 'usr_admin', name: 'SLC- Fazenda Pamplona I' },
        { id: 'cli_4', userId: 'usr_admin', name: 'Lauri Pooz - Fazenda Sete Irmão' },
        { id: 'cli_5', userId: 'usr_admin', name: 'Marcus Vinicius - Fazenda Aroeira' },
        { id: 'cli_6', userId: 'usr_admin', name: 'Flávio Gilberto Kist - Fazenda Cupim' },
        { id: 'cli_7', userId: 'usr_admin', name: 'Irineu Renato - Fazenda Pérola do Sul' },
        { id: 'cli_8', userId: 'usr_admin', name: 'Agrícola Werhmann' },
        { id: 'cli_9', userId: 'usr_admin', name: 'Willian Matté - Grupo MEC' }
    ];

    // Sem laudos de exemplo inseridos automaticamente (Usuário começa limpo)
    const DEFAULT_LAUDOS = [];

    function openDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('laudos')) {
                    const laudoStore = db.createObjectStore('laudos', { keyPath: 'id' });
                    laudoStore.createIndex('authorId', 'authorId', { unique: false });
                    laudoStore.createIndex('coordinatorId', 'coordinatorId', { unique: false });
                }
                if (!db.objectStoreNames.contains('clients')) {
                    const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
                    clientStore.createIndex('userId', 'userId', { unique: false });
                }
            };

            request.onsuccess = async (e) => {
                dbInstance = e.target.result;
                await seedInitialData();
                resolve(dbInstance);
            };

            request.onerror = (e) => {
                console.error("Erro ao abrir IndexedDB:", e);
                reject(e);
            };
        });
    }

    async function seedInitialData() {
        const SEED_KEY = 'solubio_db_seeded_v8';
        const isSeeded = localStorage.getItem(SEED_KEY);

        const users = await getAll('users');
        if (users.length === 0) {
            for (const user of DEFAULT_USERS) {
                await put('users', user);
            }
        }

        const clients = await getAll('clients');
        if (clients.length === 0) {
            for (const client of DEFAULT_CLIENTS) {
                await put('clients', client);
            }
        }

        if (!isSeeded) {
            const laudos = await getAll('laudos');
            if (laudos.length === 0) {
                for (const laudo of DEFAULT_LAUDOS) {
                    await put('laudos', laudo);
                }
            }
            localStorage.setItem(SEED_KEY, 'true');
        }
    }

    function getAll(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await openDB();
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = (e) => reject(e);
            } catch (err) {
                reject(err);
            }
        });
    }

    function put(storeName, item) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await openDB();
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(item);
                request.onsuccess = () => resolve(item);
                request.onerror = (e) => reject(e);
            } catch (err) {
                reject(err);
            }
        });
    }

    function remove(storeName, id) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await openDB();
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(e);
            } catch (err) {
                reject(err);
            }
        });
    }

    return {
        getUsersLocal: () => getAll('users'),
        getLaudosLocal: () => getAll('laudos'),
        getClientsLocal: () => getAll('clients'),
        putLocal: (storeName, item) => put(storeName, item),
        removeLocal: (storeName, id) => remove(storeName, id),

        getUsers: async () => {
            const local = await getAll('users');
            CloudSync.syncAll();
            return local;
        },
        saveUser: async (user) => {
            const res = await put('users', user);
            CloudSync.syncAll();
            return res;
        },
        deleteUser: async (id) => {
            const res = await remove('users', id);
            CloudSync.syncAll();
            return res;
        },
        getLaudos: async () => {
            const local = await getAll('laudos');
            CloudSync.syncAll();
            return local;
        },
        saveLaudo: async (laudo) => {
            const res = await put('laudos', laudo);
            CloudSync.syncAll();
            return res;
        },
        deleteLaudo: async (id) => {
            const res = await remove('laudos', id);
            CloudSync.syncAll();
            return res;
        },
        getClients: async () => {
            const local = await getAll('clients');
            CloudSync.syncAll();
            return local;
        },
        saveClient: async (client) => {
            const res = await put('clients', client);
            CloudSync.syncAll();
            return res;
        },
        deleteClient: async (id) => {
            const res = await remove('clients', id);
            CloudSync.syncAll();
            return res;
        },
        syncCloud: () => CloudSync.syncAll()
    };
})();

/**
 * CloudSync - Sincronização em Nuvem em Tempo Real
 * Sincroniza usuários, laudos e clientes entre qualquer computador ou celular.
 */
const CloudSync = (function () {
    const CLOUD_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fa560322f35d3';
    let isSyncing = false;

    async function fetchCloudData() {
        try {
            const res = await fetch(CLOUD_URL);
            if (!res.ok) return null;
            const body = await res.json();
            return body.data || { users: [], laudos: [], clients: [] };
        } catch (e) {
            console.warn('[CloudSync] Erro de busca na nuvem:', e);
            return null;
        }
    }

    async function updateCloudData(data) {
        try {
            await fetch(CLOUD_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'solubio_laudos_sync_store',
                    data: data
                })
            });
        } catch (e) {
            console.warn('[CloudSync] Erro ao salvar na nuvem:', e);
        }
    }

    async function syncAll() {
        if (isSyncing) return;
        isSyncing = true;

        try {
            const cloudData = await fetchCloudData();
            const localUsers = await LaudoDB.getUsersLocal();
            const localLaudos = await LaudoDB.getLaudosLocal();
            const localClients = await LaudoDB.getClientsLocal();

            let hasNewLocalData = false;

            // 1. Sincronizar Usuários
            const cloudUsers = (cloudData && Array.isArray(cloudData.users)) ? cloudData.users : [];
            const mergedUsers = [...localUsers];

            for (const cUser of cloudUsers) {
                const index = mergedUsers.findIndex(u => u.id === cUser.id || (u.email && cUser.email && u.email.toLowerCase() === cUser.email.toLowerCase()));
                if (index === -1) {
                    mergedUsers.push(cUser);
                    await LaudoDB.putLocal('users', cUser);
                } else {
                    mergedUsers[index] = { ...mergedUsers[index], ...cUser };
                    await LaudoDB.putLocal('users', mergedUsers[index]);
                }
            }

            for (const lUser of localUsers) {
                if (!cloudUsers.some(u => u.id === lUser.id || (u.email && lUser.email && u.email.toLowerCase() === lUser.email.toLowerCase()))) {
                    hasNewLocalData = true;
                }
            }

            // 2. Sincronizar Laudos
            const cloudLaudos = (cloudData && Array.isArray(cloudData.laudos)) ? cloudData.laudos : [];
            const mergedLaudos = [...localLaudos];

            for (const cLaudo of cloudLaudos) {
                const index = mergedLaudos.findIndex(l => l.id === cLaudo.id);
                if (index === -1) {
                    mergedLaudos.push(cLaudo);
                    await LaudoDB.putLocal('laudos', cLaudo);
                }
            }

            for (const lLaudo of localLaudos) {
                if (!cloudLaudos.some(l => l.id === lLaudo.id)) {
                    hasNewLocalData = true;
                }
            }

            // 3. Sincronizar Clientes
            const cloudClients = (cloudData && Array.isArray(cloudData.clients)) ? cloudData.clients : [];
            const mergedClients = [...localClients];

            for (const cClient of cloudClients) {
                const index = mergedClients.findIndex(c => c.id === cClient.id);
                if (index === -1) {
                    mergedClients.push(cClient);
                    await LaudoDB.putLocal('clients', cClient);
                }
            }

            for (const lClient of localClients) {
                if (!cloudClients.some(c => c.id === lClient.id)) {
                    hasNewLocalData = true;
                }
            }

            // Se houver novos itens locais ou mesclados, atualizar nuvem
            if (hasNewLocalData || cloudUsers.length < mergedUsers.length || cloudLaudos.length < mergedLaudos.length || cloudClients.length < mergedClients.length) {
                await updateCloudData({
                    users: mergedUsers,
                    laudos: mergedLaudos,
                    clients: mergedClients
                });
            }
        } catch (err) {
            console.warn('[CloudSync] Erro na sincronização:', err);
        } finally {
            isSyncing = false;
        }
    }

    // Iniciar sincronização automática ao carregar e a cada 15 segundos
    setTimeout(() => syncAll(), 500);
    setInterval(() => syncAll(), 15000);

    return {
        syncAll
    };
})();

/**
 * Gerenciador de Autenticação e Sessão
 */
const AuthManager = (function () {
    const CURRENT_USER_KEY = 'solubio_current_user_v8';
    let currentUser = null;

    function sanitizeName(name) {
        if (!name) return '';
        return name.replace(/\s*\([^)]*\)/g, '').trim();
    }

    function init() {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        if (stored) {
            try {
                currentUser = JSON.parse(stored);
                if (currentUser && currentUser.name) {
                    currentUser.name = sanitizeName(currentUser.name);
                }
            } catch (e) {
                currentUser = null;
            }
        }
    }

    init();

    return {
        getCurrentUser: () => currentUser,

        setCurrentUser: (user) => {
            if (user && user.name) {
                user.name = sanitizeName(user.name);
            }
            currentUser = user;
            if (user) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            } else {
                localStorage.removeItem(CURRENT_USER_KEY);
            }
        },

        login: async (email, password) => {
            const users = await LaudoDB.getUsers();
            const cleanEmail = email.trim().toLowerCase();
            const found = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);
            
            if (found) {
                AuthManager.setCurrentUser(found);
                return { success: true, user: found };
            }
            return { success: false, message: 'E-mail ou senha incorretos.' };
        },

        registerConsultant: async (name, email, password, coordinatorId) => {
            const users = await LaudoDB.getUsers();
            const cleanEmail = email.trim().toLowerCase();

            const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
            if (existing) {
                return { success: false, message: 'Já existe um usuário cadastrado com este e-mail.' };
            }

            const newUser = {
                id: 'usr_cons_' + Date.now(),
                name: name.trim(),
                email: cleanEmail,
                password: password,
                role: 'consultor',
                coordinatorId: coordinatorId || null
            };

            await LaudoDB.saveUser(newUser);
            AuthManager.setCurrentUser(newUser);
            return { success: true, user: newUser };
        },

        changePassword: async (userId, newPassword) => {
            const users = await LaudoDB.getUsers();
            const user = users.find(u => u.id === userId);
            if (!user) {
                return { success: false, message: 'Usuário não encontrado.' };
            }
            const cleanPass = (newPassword || '').trim();
            if (cleanPass.length < 3) {
                return { success: false, message: 'A nova senha deve ter no mínimo 3 caracteres.' };
            }
            if (cleanPass === '123') {
                return { success: false, message: 'Escolha uma nova senha diferente da senha padrão (123).' };
            }

            user.password = cleanPass;
            user.mustChangePassword = false;
            await LaudoDB.saveUser(user);

            if (currentUser && currentUser.id === userId) {
                currentUser.password = cleanPass;
                currentUser.mustChangePassword = false;
                AuthManager.setCurrentUser(currentUser);
            }

            return { success: true, user: user };
        },

        logout: () => {
            AuthManager.setCurrentUser(null);
        },

        /**
         * Filtra os laudos acessíveis conforme a hierarquia do usuário logado:
         * - Admin (Nível 1): Acesso a TODOS os laudos
         * - Coordenador (Nível 2): Acesso aos laudos criados por ele e por sua equipe (consultores vinculados)
         * - Consultor (Nível 3): Acesso apenas aos SEUS próprios laudos
         */
        filterAccessibleLaudos: async (laudos, user) => {
            if (!user) return [];

            if (user.role === 'admin') {
                return laudos;
            }

            if (user.role === 'coordenador') {
                const allUsers = await LaudoDB.getUsers();
                const myConsultantIds = allUsers
                    .filter(u => u.role === 'consultor' && u.coordinatorId === user.id)
                    .map(u => u.id);

                return laudos.filter(l => l.authorId === user.id || myConsultantIds.includes(l.authorId) || l.coordinatorId === user.id);
            }

            if (user.role === 'consultor') {
                return laudos.filter(l => l.authorId === user.id);
            }

            return [];
        },

        filterAccessibleUsers: async (users, currentUser) => {
            if (!currentUser) return [];

            if (currentUser.role === 'admin') {
                return users;
            }

            if (currentUser.role === 'coordenador') {
                return users.filter(u => u.id === currentUser.id || (u.role === 'consultor' && u.coordinatorId === currentUser.id));
            }

            if (currentUser.role === 'consultor') {
                return users.filter(u => u.id === currentUser.id);
            }

            return [];
        }
    };
})();
