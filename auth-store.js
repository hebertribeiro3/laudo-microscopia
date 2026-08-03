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
                    const current = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
                    let docs = [];
                    if (current && AuthManager.isAdmin(current)) {
                        const snapshot = await dbFirebase.collection('users').get();
                        docs = snapshot.docs;
                    } else if (current?.role === 'coordenador') {
                        const [selfDoc, teamSnapshot] = await Promise.all([
                            dbFirebase.collection('users').doc(current.id).get(),
                            dbFirebase.collection('users').where('coordinatorId', '==', current.id).get()
                        ]);
                        docs = [...teamSnapshot.docs];
                        if (selfDoc.exists) docs.push(selfDoc);
                    } else if (current?.id) {
                        const selfDoc = await dbFirebase.collection('users').doc(current.id).get();
                        if (selfDoc.exists) docs = [selfDoc];
                    }
                    const users = [...new Map(docs.map(doc => [doc.id, { ...doc.data(), id: doc.id }])).values()];
                    for (const u of users) {
                        await put('users', u);
                    }
                    return users.length ? users : await getAll('users');
                } catch (e) {
                    console.warn('[Firestore] Erro ao buscar usuários, usando cache local:', e);
                }
            }
            return await getAll('users');
        },
        saveUser: async (user) => {
            await FirebaseSync.pushItem('users', user);
            return await put('users', user);
        },
        deleteUser: async (id) => {
            const users = await getAll('users');
            const user = users.find(item => item.id === id);
            if (!user) return false;
            const inactive = { ...user, active: false, deactivatedAt: new Date().toISOString() };
            await FirebaseSync.pushItem('users', inactive);
            return await put('users', inactive);
        },
        getLaudos: async () => {
            const local = await getAll('laudos');
            return local;
        },
        saveLaudo: async (laudo) => {
            const pending = { ...laudo, syncStatus: 'pending' };
            await put('laudos', pending);
            try {
                const remote = { ...laudo };
                delete remote.syncStatus;
                delete remote.syncError;
                await FirebaseSync.pushItem('laudos', remote);
                const synced = { ...laudo, syncStatus: 'synced' };
                await put('laudos', synced);
                return synced;
            } catch (error) {
                await put('laudos', { ...pending, syncError: error.message || 'Falha ao sincronizar' });
                throw error;
            }
        },
        deleteLaudo: async (id, actor) => {
            const laudos = await getAll('laudos');
            const laudo = laudos.find(l => l.id === id);
            if (!laudo) return false;
            if (!AuthManager.canDeleteLaudo(laudo, actor)) throw new Error('Você não tem permissão para excluir este laudo.');
            laudo.deletedAt = new Date().toISOString();
            laudo.deletedBy = actor.id;
            laudo.deletedByName = actor.name;
            return await LaudoDB.saveLaudo(laudo);
        },
        restoreLaudo: async (id, actor) => {
            if (!AuthManager.isAdmin(actor)) throw new Error('Somente o administrador pode restaurar laudos.');
            const laudos = await getAll('laudos');
            const laudo = laudos.find(l => l.id === id);
            if (!laudo) return false;
            delete laudo.deletedAt;
            delete laudo.deletedBy;
            delete laudo.deletedByName;
            laudo.restoredAt = new Date().toISOString();
            laudo.restoredBy = actor.id;
            return await LaudoDB.saveLaudo(laudo);
        },
        getClients: async () => {
            const local = await getAll('clients');
            return local;
        },
        saveClient: async (client) => {
            await FirebaseSync.pushItem('clients', client);
            return await put('clients', client);
        },
        deleteClient: async (id) => {
            await FirebaseSync.removeItem('clients', id);
            return await remove('clients', id);
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
    let unsubscribers = [];
    let activeUserId = null;

    function stopListeners() {
        unsubscribers.forEach(unsubscribe => {
            try { unsubscribe(); } catch (e) {}
        });
        unsubscribers = [];
        activeUserId = null;
    }

    function listen(query, storeName) {
        const unsubscribe = query.onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                const id = change.doc.id;
                if (change.type === 'removed') {
                    await LaudoDB.removeLocal(storeName, id);
                    return;
                }
                const value = { ...change.doc.data(), id, syncStatus: 'synced' };
                await LaudoDB.putLocal(storeName, value);
            });
            window.dispatchEvent(new CustomEvent('firebase-data-synced', { detail: { storeName } }));
        }, err => console.warn(`[Firebase] Listener ${storeName}:`, err));
        unsubscribers.push(unsubscribe);
    }

    function initListeners(user) {
        if (!dbFirebase || !user || activeUserId === user.id) return;
        stopListeners();
        activeUserId = user.id;

        if (AuthManager.isAdmin(user)) {
            listen(dbFirebase.collection('users'), 'users');
            listen(dbFirebase.collection('laudos'), 'laudos');
            listen(dbFirebase.collection('clients'), 'clients');
        } else if (user.role === 'coordenador') {
            listen(dbFirebase.collection('users').where('coordinatorId', '==', user.id), 'users');
            listen(dbFirebase.collection('users').where(firebase.firestore.FieldPath.documentId(), '==', user.id), 'users');
            listen(dbFirebase.collection('laudos').where('coordinatorId', '==', user.id), 'laudos');
            listen(dbFirebase.collection('laudos').where('authorId', '==', user.id), 'laudos');
            listen(dbFirebase.collection('clients').where('userId', '==', user.id), 'clients');
        } else {
            listen(dbFirebase.collection('users').where(firebase.firestore.FieldPath.documentId(), '==', user.id), 'users');
            listen(dbFirebase.collection('laudos').where('authorId', '==', user.id), 'laudos');
            listen(dbFirebase.collection('clients').where('userId', '==', user.id), 'clients');
        }
    }

    async function pushItem(collectionName, item) {
        if (!dbFirebase || !item || !item.id) throw new Error('Firebase indisponível. O registro ficou pendente neste aparelho.');
        await dbFirebase.collection(collectionName).doc(item.id).set(item, { merge: true });
        return true;
    }

    async function removeItem(collectionName, id) {
        if (!dbFirebase || !id) throw new Error('Firebase indisponível.');
        await dbFirebase.collection(collectionName).doc(id).delete();
        return true;
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

    async function uploadLaudoImage(laudoId, authorId, type, source) {
        if (!source || !source.startsWith('data:image/')) return source || '';
        if (!dbFirebase) throw new Error('Firebase não está disponível para enviar as fotos.');
        const imagesRef = dbFirebase.collection('laudos').doc(laudoId).collection('images');
        const existing = await imagesRef.get();
        const batch = dbFirebase.batch();

        // Mantém cada documento confortavelmente abaixo do limite de 1 MiB do Firestore.
        const chunkSize = 600000;
        const total = Math.ceil(source.length / chunkSize);
        const newIds = new Set(Array.from({ length: total }, (_, index) => `${type}_${String(index).padStart(3, '0')}`));
        existing.docs
            .filter(doc => doc.data().type === type && !newIds.has(doc.id))
            .forEach(doc => batch.delete(doc.ref));
        for (let index = 0; index < total; index++) {
            const content = source.slice(index * chunkSize, (index + 1) * chunkSize);
            const id = `${type}_${String(index).padStart(3, '0')}`;
            batch.set(imagesRef.doc(id), { authorId, type, index, total, content });
        }
        await batch.commit();
        return `firestore-image://${laudoId}/${type}`;
    }

    async function getLaudoImage(source) {
        if (!source || !source.startsWith('firestore-image://')) return source || '';
        const match = source.match(/^firestore-image:\/\/([^/]+)\/(40x|100x)$/);
        if (!match || !dbFirebase) return '';
        const [, laudoId, type] = match;
        const snapshot = await dbFirebase.collection('laudos').doc(laudoId).collection('images').get();
        return snapshot.docs
            .map(doc => doc.data())
            .filter(part => part.type === type)
            .sort((a, b) => a.index - b.index)
            .map(part => part.content)
            .join('');
    }

    async function syncPendingForUser(user) {
        if (!user) return { synced: 0, failed: 0 };
        const localLaudos = await LaudoDB.getLaudosLocal();
        const candidates = localLaudos.filter(l => l.authorId === user.id && (l.syncStatus === 'pending' || l.syncStatus == null));
        let synced = 0;
        let failed = 0;
        for (const original of candidates) {
            try {
                const laudo = { ...original, formData: { ...(original.formData || {}) } };
                delete laudo.syncError;
                delete laudo.syncStatus;
                if (laudo.formData.image40x?.startsWith('data:image/')) {
                    laudo.formData.image40x = await uploadLaudoImage(laudo.id, user.id, '40x', laudo.formData.image40x);
                }
                if (laudo.formData.image100x?.startsWith('data:image/')) {
                    laudo.formData.image100x = await uploadLaudoImage(laudo.id, user.id, '100x', laudo.formData.image100x);
                }
                await pushItem('laudos', laudo);
                await LaudoDB.putLocal('laudos', { ...laudo, syncStatus: 'synced' });
                synced++;
            } catch (error) {
                failed++;
                await LaudoDB.putLocal('laudos', { ...original, syncStatus: 'pending', syncError: error.message || 'Falha ao sincronizar' });
            }
        }
        return { synced, failed };
    }

    return {
        pushItem,
        removeItem,
        pushAllLocalToFirebase,
        startForUser: initListeners,
        stop: stopListeners,
        uploadLaudoImage,
        getLaudoImage,
        syncPendingForUser
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

    function normalizeUser(user) {
        if (!user) return null;
        const normalized = { ...user };
        if (normalized.role === 'admin') {
            normalized.role = 'consultor';
            normalized.isAdmin = true;
        }
        normalized.isAdmin = normalized.isAdmin === true;
        normalized.name = sanitizeName(normalized.name);
        return normalized;
    }

    function init() {
        const stored = localStorage.getItem(CURRENT_USER_KEY);
        if (stored) {
            try {
                currentUser = normalizeUser(JSON.parse(stored));
            } catch (e) {
                currentUser = null;
            }
        }
    }

    init();

    return {
        getCurrentUser: () => currentUser,
        isAdmin: (user = currentUser) => !!user && (user.isAdmin === true || user.role === 'admin'),
        canDeleteLaudo: (laudo, user = currentUser) => {
            if (!laudo || !user) return false;
            if (user.isAdmin === true || user.role === 'admin') return true;
            if (laudo.authorId === user.id) return true;
            return user.role === 'coordenador' && laudo.coordinatorId === user.id;
        },
        canEditLaudo: (laudo, user = currentUser) => {
            if (!laudo || !user || laudo.deletedAt) return false;
            return laudo.authorId === user.id;
        },

        setCurrentUser: (user) => {
            const normalized = normalizeUser(user);
            currentUser = normalized;
            if (normalized) {
                localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized));
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
                let userData;

                if (userDoc.exists) {
                    userData = userDoc.data();
                    userData.id = userDoc.id;
                } else {
                    const emailSnapshot = await dbFirebase.collection('users').where('email', '==', cleanEmail).get();
                    if (!emailSnapshot.empty) {
                        userData = emailSnapshot.docs[0].data();
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
                            try {
                                const snap = await dbFirebase.collection(ref.collection).where(ref.field, '==', ref.oldVal).get();
                                for (const d of snap.docs) {
                                    await d.ref.update({ [ref.field]: ref.newVal });
                                }
                            } catch (errRef) {
                                console.warn('[AuthManager] Erro ao atualizar referências antigas:', errRef);
                            }
                        }
                        userData.id = uid;
                    } else {
                        // Perfil fallback caso usuário exista no Auth mas ainda não no Firestore
                        userData = {
                            id: uid,
                            email: cleanEmail,
                            name: cleanEmail.split('@')[0].toUpperCase(),
                            role: 'consultor',
                            coordinatorId: null,
                            mustChangePassword: false,
                            active: true
                        };
                        await dbFirebase.collection('users').doc(uid).set(userData);
                    }
                }

                // Tentar vincular coordenadores de forma segura (sem travar o login em caso de falha de permissão)
                try {
                    const allUsers = await dbFirebase.collection('users').get();
                    const validIds = new Set(allUsers.docs.map(d => d.id));
                    const emailPrefix = cleanEmail.split('@')[0].split('.')[0];
                    for (const doc of allUsers.docs) {
                        const user = doc.data();
                        if (user.coordinatorId && !validIds.has(user.coordinatorId) && user.coordinatorId.includes(emailPrefix)) {
                            await doc.ref.update({ coordinatorId: uid });
                        }
                    }
                } catch (errSync) {
                    console.warn('[AuthManager] Sincronização secundária de usuários ignorada:', errSync);
                }

                if (userData.role === 'admin') {
                    userData = { ...userData, role: 'consultor', isAdmin: true };
                    await dbFirebase.collection('users').doc(uid).set({ role: 'consultor', isAdmin: true }, { merge: true });
                }
                userData = normalizeUser(userData);
                if (userData.active === false) {
                    await firebase.auth().signOut();
                    return { success: false, message: 'Este usuário foi desativado. Procure o administrador.' };
                }
                await LaudoDB.putLocal('users', userData);
                AuthManager.setCurrentUser(userData);
                FirebaseSync.startForUser(userData);
                return { success: true, user: userData };
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
                    mustChangePassword: false,
                    active: true
                };

                await dbFirebase.collection('users').doc(uid).set(newUser);
                await LaudoDB.putLocal('users', newUser);
                AuthManager.setCurrentUser(newUser);
                FirebaseSync.startForUser(newUser);
                return { success: true, user: newUser };
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    return { success: false, message: 'Já existe um usuário cadastrado com este e-mail.' };
                }
                return { success: false, message: err.message || 'Erro ao cadastrar.' };
            }
        },

        createManagedUser: async (profile, password) => {
            if (!AuthManager.isAdmin(currentUser)) {
                return { success: false, message: 'Somente o administrador pode criar usuários.' };
            }
            let secondaryApp;
            try {
                secondaryApp = firebase.apps.find(app => app.name === 'user-creator') || firebase.initializeApp(firebaseConfig, 'user-creator');
                const credential = await secondaryApp.auth().createUserWithEmailAndPassword(profile.email.trim().toLowerCase(), password);
                const newUser = {
                    ...profile,
                    id: credential.user.uid,
                    email: profile.email.trim().toLowerCase(),
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser.id
                };
                await dbFirebase.collection('users').doc(newUser.id).set(newUser);
                await secondaryApp.auth().signOut();
                await LaudoDB.putLocal('users', newUser);
                return { success: true, user: newUser };
            } catch (error) {
                try { await secondaryApp?.auth().signOut(); } catch (e) {}
                return { success: false, message: error.message || 'Erro ao criar usuário.' };
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
            FirebaseSync.stop();
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

            if (AuthManager.isAdmin(user)) {
                return laudos;
            }

            const userIds = [user.id];
            if (user.previousId) userIds.push(user.previousId);

            const active = laudos.filter(l => !l.deletedAt);

            if (user.role === 'coordenador') {
                const allUsers = await LaudoDB.getUsers();
                const teamIds = allUsers
                    .filter(u => (u.role === 'consultor' || u.role === 'admin') && userIds.includes(u.coordinatorId))
                    .map(u => u.id);

                return active.filter(l => userIds.includes(l.authorId) || teamIds.includes(l.authorId) || userIds.includes(l.coordinatorId));
            }

            if (user.role === 'consultor') {
                return active.filter(l => l.authorId === user.id);
            }

            return [];
        },

        filterAccessibleUsers: async (users, currentUser) => {
            if (!currentUser) return [];

            const userIds = [currentUser.id];
            if (currentUser.previousId) userIds.push(currentUser.previousId);

            if (AuthManager.isAdmin(currentUser)) {
                return users;
            }

            if (currentUser.role === 'coordenador') {
                return users.filter(u => userIds.includes(u.id) || ((u.role === 'consultor' || u.role === 'admin') && userIds.includes(u.coordinatorId)));
            }

            if (currentUser.role === 'consultor') {
                return users.filter(u => u.id === currentUser.id);
            }

            return [];
        }
    };
})();

// Restaura a sessão do Firebase ao abrir o sistema em outro aparelho ou após recarregar a página.
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async firebaseUser => {
        if (!firebaseUser) {
            FirebaseSync.stop();
            AuthManager.setCurrentUser(null);
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: null } }));
            return;
        }
        try {
            const snapshot = await dbFirebase.collection('users').doc(firebaseUser.uid).get();
            if (!snapshot.exists) return;
            let profile = { ...snapshot.data(), id: snapshot.id };
            if (profile.role === 'admin') {
                profile = { ...profile, role: 'consultor', isAdmin: true };
                await dbFirebase.collection('users').doc(firebaseUser.uid).set({ role: 'consultor', isAdmin: true }, { merge: true });
            }
            AuthManager.setCurrentUser(profile);
            FirebaseSync.startForUser(AuthManager.getCurrentUser());
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: AuthManager.getCurrentUser() } }));
        } catch (error) {
            console.warn('[AuthManager] Não foi possível restaurar o perfil:', error);
        }
    });
}
