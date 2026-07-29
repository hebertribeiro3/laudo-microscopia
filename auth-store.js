/**
 * auth-store.js - Sistema de Autenticação, Banco de Dados (IndexedDB) e Controle de Acesso por Hierarquia
 * Solubio On Farm - Gerenciador de Laudos
 */

const LaudoDB = (function () {
    const DB_NAME = 'SolubioLaudosDB_v8';
    const DB_VERSION = 1;
    let dbInstance = null;


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

            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            request.onerror = (e) => {
                console.error("Erro ao abrir IndexedDB:", e);
                reject(e);
            };
        });
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
            if (dbFirebase) {
                try {
                    const snapshot = await dbFirebase.collection('users').get();
                    const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    for (const u of users) {
                        await put('users', u);
                    }
                    return users;
                } catch (e) {
                    console.warn('[Firestore] Erro ao buscar usuários, usando cache local:', e);
                }
            }
            return await getAll('users');
        },
        saveUser: async (user) => {
            const res = await put('users', user);
            FirebaseSync.pushItem('users', user);
            return res;
        },
        deleteUser: async (id) => {
            const res = await remove('users', id);
            FirebaseSync.removeItem('users', id);
            return res;
        },
        getLaudos: async () => {
            const local = await getAll('laudos');
            return local;
        },
        saveLaudo: async (laudo) => {
            const res = await put('laudos', laudo);
            FirebaseSync.pushItem('laudos', laudo);
            return res;
        },
        deleteLaudo: async (id) => {
            const res = await remove('laudos', id);
            FirebaseSync.removeItem('laudos', id);
            return res;
        },
        getClients: async () => {
            const local = await getAll('clients');
            return local;
        },
        saveClient: async (client) => {
            const res = await put('clients', client);
            FirebaseSync.pushItem('clients', client);
            return res;
        },
        deleteClient: async (id) => {
            const res = await remove('clients', id);
            FirebaseSync.removeItem('clients', id);
            return res;
        }
    };
})();

/**
 * Firebase Firestore Sync Engine - Projeto: laudo-a366a
 */
const firebaseConfig = {
  apiKey: "AIzaSyBFw_8RxOOJ-ZoV62CtYOi44PWFle6bTIo",
  authDomain: "laudo-a366a.firebaseapp.com",
  projectId: "laudo-a366a",
  storageBucket: "laudo-a366a.firebasestorage.app",
  messagingSenderId: "387088380527",
  appId: "1:387088380527:web:8ec0cfcf10c95f6ad8539a",
  measurementId: "G-BCY108CPE2"
};

let dbFirebase = null;
try {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        dbFirebase = firebase.firestore();
        window.dbFirebase = dbFirebase;
        console.log('[Firebase] Conectado com sucesso ao projeto:', firebaseConfig.projectId);
    }
} catch (e) {
    console.warn('[Firebase] Aviso de inicialização:', e);
}

const FirebaseSync = (function () {
    let isListening = false;

    function initListeners() {
        if (!dbFirebase || isListening) return;
        isListening = true;

        // Escutar usuários cadastrados em tempo real em qualquer celular/computador
        dbFirebase.collection('users').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const u = change.doc.data();
                    if (u && u.id) {
                        await LaudoDB.putLocal('users', u);
                    }
                } else if (change.type === 'removed') {
                    const id = change.doc.id;
                    await LaudoDB.removeLocal('users', id);
                }
            });
        }, err => console.warn('[Firebase] Listener usuários:', err));

        // Escutar laudos em tempo real
        dbFirebase.collection('laudos').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const l = change.doc.data();
                    if (l && l.id) {
                        await LaudoDB.putLocal('laudos', l);
                    }
                } else if (change.type === 'removed') {
                    const id = change.doc.id;
                    await LaudoDB.removeLocal('laudos', id);
                }
            });
        }, err => console.warn('[Firebase] Listener laudos:', err));

        // Escutar clientes
        dbFirebase.collection('clients').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const c = change.doc.data();
                    if (c && c.id) {
                        await LaudoDB.putLocal('clients', c);
                    }
                } else if (change.type === 'removed') {
                    const id = change.doc.id;
                    await LaudoDB.removeLocal('clients', id);
                }
            });
        }, err => console.warn('[Firebase] Listener clientes:', err));
    }

    async function pushItem(collectionName, item) {
        if (!dbFirebase || !item || !item.id) return;
        try {
            await dbFirebase.collection(collectionName).doc(item.id).set(item, { merge: true });
        } catch (e) {
            console.warn(`[Firebase] Erro ao enviar ${collectionName}:`, e);
        }
    }

    async function removeItem(collectionName, id) {
        if (!dbFirebase || !id) return;
        try {
            await dbFirebase.collection(collectionName).doc(id).delete();
        } catch (e) {
            console.warn(`[Firebase] Erro ao remover de ${collectionName}:`, e);
        }
    }

    async function pushAllLocalToFirebase() {
        if (!dbFirebase) return;
        try {
            const users = await LaudoDB.getUsersLocal();
            for (const u of users) {
                if (u && u.id) {
                    await dbFirebase.collection('users').doc(u.id).set(u, { merge: true });
                }
            }
            const laudos = await LaudoDB.getLaudosLocal();
            for (const l of laudos) {
                if (l && l.id) {
                    await dbFirebase.collection('laudos').doc(l.id).set(l, { merge: true });
                }
            }
            const clients = await LaudoDB.getClientsLocal();
            for (const c of clients) {
                if (c && c.id) {
                    await dbFirebase.collection('clients').doc(c.id).set(c, { merge: true });
                }
            }
        } catch (e) {
            console.warn('[Firebase] Erro ao sincronizar dados iniciais:', e);
        }
    }

    setTimeout(() => {
        initListeners();
        pushAllLocalToFirebase();
    }, 1000);

    return {
        pushItem,
        removeItem,
        pushAllLocalToFirebase
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
            const cleanEmail = email.trim().toLowerCase();

            if (!dbFirebase) {
                return { success: false, message: 'Firebase não disponível. Verifique sua conexão.' };
            }

            try {
                const cred = await firebase.auth().signInWithEmailAndPassword(cleanEmail, password);
                const uid = cred.user.uid;

                const userDoc = await dbFirebase.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userData.id = userDoc.id;
                    await LaudoDB.putLocal('users', userData);
                    AuthManager.setCurrentUser(userData);
                    return { success: true, user: userData };
                }

                const emailSnapshot = await dbFirebase.collection('users').where('email', '==', cleanEmail).get();
                if (!emailSnapshot.empty) {
                    const userData = emailSnapshot.docs[0].data();
                    const oldId = emailSnapshot.docs[0].id;
                    const { password, ...safeData } = userData;

                    await dbFirebase.collection('users').doc(uid).set({ ...safeData, id: uid, firebaseUid: uid, previousId: oldId });
                    await dbFirebase.collection('users').doc(oldId).delete();

                    const refs = [
                        { collection: 'users', field: 'coordinatorId', oldVal: oldId, newVal: uid },
                        { collection: 'laudos', field: 'authorId', oldVal: oldId, newVal: uid },
                        { collection: 'laudos', field: 'coordinatorId', oldVal: oldId, newVal: uid },
                        { collection: 'clients', field: 'userId', oldVal: oldId, newVal: uid },
                    ];
                    for (const ref of refs) {
                        const snap = await dbFirebase.collection(ref.collection).where(ref.field, '==', ref.oldVal).get();
                        for (const d of snap.docs) {
                            await d.ref.update({ [ref.field]: ref.newVal });
                        }
                    }

                    userData.id = uid;
                    await LaudoDB.putLocal('users', userData);
                    AuthManager.setCurrentUser(userData);
                    return { success: true, user: userData };
                }

                return { success: false, message: 'Seu e-mail não foi encontrado no sistema. Contate o administrador.' };
            } catch (err) {
                const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
                    ? 'E-mail ou senha incorretos.'
                    : err.message || 'Erro ao fazer login.';
                return { success: false, message: msg };
            }
        },

        registerConsultant: async (name, email, password, coordinatorId) => {
            const cleanEmail = email.trim().toLowerCase();

            if (!dbFirebase) {
                return { success: false, message: 'Firebase não disponível. Verifique sua conexão.' };
            }

            try {
                const cred = await firebase.auth().createUserWithEmailAndPassword(cleanEmail, password);
                const uid = cred.user.uid;

                const newUser = {
                    id: uid,
                    name: name.trim(),
                    email: cleanEmail,
                    role: 'consultor',
                    coordinatorId: coordinatorId || null,
                    mustChangePassword: false
                };

                await dbFirebase.collection('users').doc(uid).set(newUser);
                await LaudoDB.putLocal('users', newUser);
                AuthManager.setCurrentUser(newUser);
                return { success: true, user: newUser };
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    return { success: false, message: 'Já existe um usuário cadastrado com este e-mail.' };
                }
                return { success: false, message: err.message || 'Erro ao cadastrar.' };
            }
        },

        resetPasswordByEmail: async (email) => {
            const cleanEmail = (email || '').trim().toLowerCase();
            if (!cleanEmail) {
                return { success: false, message: 'Por favor, digite o seu e-mail no campo acima.' };
            }

            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    await firebase.auth().sendPasswordResetEmail(cleanEmail);
                    return { success: true, message: `E-mail de redefinição de senha enviado para ${cleanEmail}!` };
                } catch (err) {
                    return { success: false, message: 'Não foi possível enviar o e-mail: ' + (err.message || 'Verifique o e-mail.') };
                }
            }
            return { success: false, message: 'Serviço de e-mail temporariamente indisponível.' };
        },

        changePassword: async (userId, newPassword) => {
            const cleanPass = (newPassword || '').trim();
            if (cleanPass.length < 3) {
                return { success: false, message: 'A nova senha deve ter no mínimo 3 caracteres.' };
            }
            if (cleanPass === '123') {
                return { success: false, message: 'Escolha uma nova senha diferente da senha padrão (123).' };
            }

            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                try {
                    await firebase.auth().currentUser.updatePassword(cleanPass);
                } catch (e) {
                    return { success: false, message: 'Erro ao alterar senha: ' + (e.message || 'Tente fazer login novamente.' ) };
                }
            }

            if (dbFirebase && userId) {
                try {
                    await dbFirebase.collection('users').doc(userId).update({
                        mustChangePassword: false
                    });
                } catch (e) {
                    console.warn('[Firestore] Erro ao atualizar mustChangePassword:', e);
                }
            }

            if (currentUser && currentUser.id === userId) {
                currentUser.mustChangePassword = false;
                AuthManager.setCurrentUser(currentUser);
            }

            return { success: true, user: currentUser };
        },

        logout: () => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                try {
                    firebase.auth().signOut();
                } catch (e) {}
            }
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

            const userIds = [user.id];
            if (user.previousId) userIds.push(user.previousId);

            if (user.role === 'coordenador') {
                const allUsers = await LaudoDB.getUsers();
                const myConsultantIds = allUsers
                    .filter(u => u.role === 'consultor' && userIds.includes(u.coordinatorId))
                    .map(u => u.id);

                return laudos.filter(l => userIds.includes(l.authorId) || myConsultantIds.includes(l.authorId) || userIds.includes(l.coordinatorId));
            }

            if (user.role === 'consultor') {
                return laudos.filter(l => l.authorId === user.id);
            }

            return [];
        },

        filterAccessibleUsers: async (users, currentUser) => {
            if (!currentUser) return [];

            const userIds = [currentUser.id];
            if (currentUser.previousId) userIds.push(currentUser.previousId);

            if (currentUser.role === 'admin') {
                return users;
            }

            if (currentUser.role === 'coordenador') {
                return users.filter(u => userIds.includes(u.id) || (u.role === 'consultor' && userIds.includes(u.coordinatorId)));
            }

            if (currentUser.role === 'consultor') {
                return users.filter(u => u.id === currentUser.id);
            }

            return [];
        }
    };
})();
