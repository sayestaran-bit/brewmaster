// /src/services/firestore/equipment.js
import {
    collection, doc, addDoc, updateDoc, deleteDoc, setDoc,
    onSnapshot, query, orderBy, serverTimestamp, getDoc,
    writeBatch, getDocs, where, limit
} from 'firebase/firestore';
import { db } from '../firebase';

const equipmentRef = (uid) =>
    collection(db, 'users', uid, 'equipmentProfiles');

const equipmentDocRef = (uid, id) =>
    doc(db, 'users', uid, 'equipmentProfiles', id);

/**
 * Se suscribe a los perfiles de equipo del usuario.
 */
export function onEquipmentSnapshot(uid, onData, onError) {
    if (!uid) return () => { };
    const q = query(equipmentRef(uid), orderBy('name'));
    return onSnapshot(
        q,
        (snap) => onData(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        onError
    );
}

/**
 * Agrega un nuevo perfil de equipo.
 */
export async function addEquipmentProfile(uid, data) {
    const ref = await addDoc(equipmentRef(uid), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Obtiene un perfil específico.
 */
export async function getEquipmentProfile(uid, id) {
    const snap = await getDoc(equipmentDocRef(uid, id));
    return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

/**
 * Actualiza un perfil.
 */
export async function updateEquipmentProfile(uid, id, data) {
    await updateDoc(equipmentDocRef(uid, id), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Elimina un perfil.
 */
export async function deleteEquipmentProfile(uid, id) {
    await deleteDoc(equipmentDocRef(uid, id));
}
/**
 * Establece un equipo como predeterminado, desactivando los demás.
 * @param {string} uid
 * @param {string} id
 */
export async function setDefaultEquipment(uid, id) {
    const batch = writeBatch(db);
    const profilesSnap = await getDocs(equipmentRef(uid));
    
    profilesSnap.docs.forEach(profileDoc => {
        const isTarget = profileDoc.id === id;
        batch.update(profileDoc.ref, {
            isDefault: isTarget,
            updatedAt: serverTimestamp()
        });
    });

    return await batch.commit();
}

/**
 * Obtiene el equipo predeterminado del usuario.
 */
export async function getDefaultEquipment(uid) {
    const q = query(equipmentRef(uid), where('isDefault', '==', true), limit(1));
    const snap = await getDocs(q);
    return !snap.empty ? { ...snap.docs[0].data(), id: snap.docs[0].id } : null;
}
