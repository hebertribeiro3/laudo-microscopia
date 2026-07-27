/**
 * auth-store.js - Sistema de Autenticação, Banco de Dados (IndexedDB) e Controle de Acesso por Hierarquia
 * Solubio On Farm - Gerenciador de Laudos
 */

const LaudoDB = (function () {
    const DB_NAME = 'SolubioLaudosDB_v6';
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
            coordinatorId: null
        },
        {
            id: 'usr_coord_bruna',
            name: 'Bruna Carneiro',
            email: 'bruna.carneiro@solubio.agr.br',
            password: '123',
            role: 'coordenador',
            coordinatorId: null
        },
        {
            id: 'usr_cons_joao',
            name: 'João Silva',
            email: 'joao.consultor@solubio.agr.br',
            password: '123',
            role: 'consultor',
            coordinatorId: 'usr_coord_bruna'
        },
        {
            id: 'usr_cons_maria',
            name: 'Maria Santos',
            email: 'maria.consultor@solubio.agr.br',
            password: '123',
            role: 'consultor',
            coordinatorId: 'usr_coord_bruna'
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

    // Laudos Iniciais de Exemplo para Demonstração de Hierarquia
    const DEFAULT_LAUDOS = [
        {
            id: 'laudo_demo_1',
            relatorio_num: '041.2025',
            cliente_fazenda: 'Gilson Adriano Bomfim - Fazenda Sagrada Fámilia',
            nome_produto: 'Bio Balance',
            microrganismo: 'Bacillus amyloliquefaciens',
            data_emissao: '2025-02-10',
            data_analise: '2025-02-09',
            authorId: 'usr_cons_joao',
            authorName: 'João Silva',
            authorRole: 'consultor',
            coordinatorId: 'usr_coord_bruna',
            coordinatorName: 'Bruna Carneiro',
            createdAt: '2025-02-10T10:00:00.000Z',
            formData: {
                relatorio_num: '041.2025',
                data_emissao: '2025-02-10',
                cliente_fazenda: 'Gilson Adriano Bomfim - Fazenda Sagrada Fámilia',
                tipo_amostra: 'Multiplicado',
                nome_produto: 'Bio Balance',
                microrganismo: 'Bacillus amyloliquefaciens',
                meio_cultura: 'BAC',
                tipo_compressor: 'Odontológico',
                lote_produto: 'LT-2025-A',
                lote_meio: 'LM-992',
                temperatura: '28',
                ph: '6.8',
                data_multiplicacao: '2025-02-08',
                data_coleta: '2025-02-08',
                responsavel_coleta: 'João Silva',
                data_recebimento: '2025-02-09',
                data_analise: '2025-02-09',
                tecnica_plaqueamento: 'NA',
                diluicoes: 'NA',
                temp_incubacao: 'NA',
                tempo_incubacao: 'NA',
                choque_termico: 'NÃO',
                coloracao_gram: 'Bastonetes gram-positivos com endósporos',
                responsavel_analise: 'João Silva',
                resultado_qualitativo: 'EXCELENTE',
                outros_microrganismos: 'AUSENTE',
                observacoes: 'Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e não apresentou outros microrganismos'
            }
        },
        {
            id: 'laudo_demo_2',
            relatorio_num: '042.2025',
            cliente_fazenda: 'Marcelo Isoton - Fazenda Reaconquista II',
            nome_produto: 'Solubio Raiz Performance',
            microrganismo: 'Bacillus subtilis',
            data_emissao: '2025-02-12',
            data_analise: '2025-02-11',
            authorId: 'usr_cons_maria',
            authorName: 'Maria Santos',
            authorRole: 'consultor',
            coordinatorId: 'usr_coord_bruna',
            coordinatorName: 'Bruna Carneiro',
            createdAt: '2025-02-12T14:30:00.000Z',
            formData: {
                relatorio_num: '042.2025',
                data_emissao: '2025-02-12',
                cliente_fazenda: 'Marcelo Isoton - Fazenda Reaconquista II',
                tipo_amostra: 'Multiplicado',
                nome_produto: 'Solubio Raiz Performance',
                microrganismo: 'Bacillus subtilis',
                meio_cultura: 'BAC',
                tipo_compressor: 'Parafuso',
                lote_produto: 'LT-2025-B',
                lote_meio: 'LM-993',
                temperatura: '27',
                ph: '7.0',
                data_multiplicacao: '2025-02-10',
                data_coleta: '2025-02-10',
                responsavel_coleta: 'Maria Santos',
                data_recebimento: '2025-02-11',
                data_analise: '2025-02-11',
                tecnica_plaqueamento: 'NA',
                diluicoes: 'NA',
                temp_incubacao: 'NA',
                tempo_incubacao: 'NA',
                choque_termico: 'NÃO',
                coloracao_gram: 'Bastonetes isolados e em pares',
                responsavel_analise: 'Maria Santos',
                resultado_qualitativo: 'PADRÃO',
                outros_microrganismos: 'AUSENTE',
                observacoes: 'Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e não apresentou outros microrganismos'
            }
        },
        {
            id: 'laudo_demo_3',
            relatorio_num: '043.2025',
            cliente_fazenda: 'SLC- Fazenda Pamplona I',
            nome_produto: 'Bio Release',
            microrganismo: 'Pseudomonas fluorescens',
            data_emissao: '2025-02-14',
            data_analise: '2025-02-13',
            authorId: 'usr_coord_bruna',
            authorName: 'Bruna Carneiro',
            authorRole: 'coordenador',
            coordinatorId: null,
            coordinatorName: null,
            createdAt: '2025-02-14T09:15:00.000Z',
            formData: {
                relatorio_num: '043.2025',
                data_emissao: '2025-02-14',
                cliente_fazenda: 'SLC- Fazenda Pamplona I',
                tipo_amostra: 'Multiplicado',
                nome_produto: 'Bio Release',
                microrganismo: 'Pseudomonas fluorescens',
                meio_cultura: 'BAC',
                tipo_compressor: 'Radial',
                lote_produto: 'LT-2025-C',
                lote_meio: 'LM-994',
                temperatura: '26',
                ph: '6.9',
                data_multiplicacao: '2025-02-12',
                data_coleta: '2025-02-12',
                responsavel_coleta: 'Bruna Carneiro',
                data_recebimento: '2025-02-13',
                data_analise: '2025-02-13',
                tecnica_plaqueamento: 'NA',
                diluicoes: 'NA',
                temp_incubacao: 'NA',
                tempo_incubacao: 'NA',
                choque_termico: 'NÃO',
                coloracao_gram: 'Bastonetes gram-negativos móveis',
                responsavel_analise: 'Bruna Carneiro',
                resultado_qualitativo: 'EXCELENTE',
                outros_microrganismos: 'AUSENTE',
                observacoes: 'Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e não apresentou outros microrganismos'
            }
        },
        {
            id: 'laudo_demo_4',
            relatorio_num: '044.2025',
            cliente_fazenda: 'Lauri Pooz - Fazenda Sete Irmão',
            nome_produto: 'Tec Bug',
            microrganismo: 'Chromobacterium subtsugae',
            data_emissao: '2025-02-15',
            data_analise: '2025-02-15',
            authorId: 'usr_admin',
            authorName: 'Hebert Souza',
            authorRole: 'admin',
            coordinatorId: null,
            coordinatorName: null,
            createdAt: '2025-02-15T16:20:00.000Z',
            formData: {
                relatorio_num: '044.2025',
                data_emissao: '2025-02-15',
                cliente_fazenda: 'Lauri Pooz - Fazenda Sete Irmão',
                tipo_amostra: 'Multiplicado',
                nome_produto: 'Tec Bug',
                microrganismo: 'Chromobacterium subtsugae',
                meio_cultura: 'BUG',
                tipo_compressor: 'Odontológico',
                lote_produto: 'LT-2025-D',
                lote_meio: 'LM-995',
                temperatura: '28',
                ph: '6.7',
                data_multiplicacao: '2025-02-14',
                data_coleta: '2025-02-14',
                responsavel_coleta: 'Hebert Souza',
                data_recebimento: '2025-02-15',
                data_analise: '2025-02-15',
                tecnica_plaqueamento: 'NA',
                diluicoes: 'NA',
                temp_incubacao: 'NA',
                tempo_incubacao: 'NA',
                choque_termico: 'NÃO',
                coloracao_gram: 'Cocos-bastonetes violáceos característicos',
                responsavel_analise: 'Hebert Souza',
                resultado_qualitativo: 'EXCELENTE',
                outros_microrganismos: 'PRESENTE',
                observacoes: 'Por meio da análise qualitativa por microscopia, foi possível verificar que o processo de multiplicação resultou alta concentração do microrganismo de interesse, e não apresentou outros microrganismos'
            }
        }
    ];

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
        const users = await getAll('users');
        if (users.length === 0) {
            for (const user of DEFAULT_USERS) {
                await put('users', user);
            }
        }

        const laudos = await getAll('laudos');
        if (laudos.length === 0) {
            for (const laudo of DEFAULT_LAUDOS) {
                await put('laudos', laudo);
            }
        }

        const clients = await getAll('clients');
        if (clients.length === 0) {
            for (const client of DEFAULT_CLIENTS) {
                await put('clients', client);
            }
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
        getUsers: () => getAll('users'),
        saveUser: (user) => put('users', user),
        deleteUser: (id) => remove('users', id),
        getLaudos: () => getAll('laudos'),
        saveLaudo: (laudo) => put('laudos', laudo),
        deleteLaudo: (id) => remove('laudos', id),
        getClients: () => getAll('clients'),
        saveClient: (client) => put('clients', client),
        deleteClient: (id) => remove('clients', id)
    };
})();

/**
 * Gerenciador de Autenticação e Sessão
 */
const AuthManager = (function () {
    const CURRENT_USER_KEY = 'solubio_current_user_v6';
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
