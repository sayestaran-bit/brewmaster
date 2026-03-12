// /src/hooks/useEquipment.js
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { onEquipmentSnapshot, addEquipmentProfile, updateEquipmentProfile, deleteEquipmentProfile, setDefaultEquipment } from '../services/firestore/equipment';

export function useEquipment() {
    const { currentUser } = useAuth();
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setEquipment([]);
            setLoading(false);
            return;
        }

        const unsubscribe = onEquipmentSnapshot(
            currentUser.uid,
            (data) => {
                setEquipment(data);
                setLoading(false);
            },
            (err) => {
                console.error("Error loading equipment profiles:", err);
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const addProfile = async (data) => {
        if (!currentUser) return;
        return await addEquipmentProfile(currentUser.uid, data);
    };

    const updateProfile = async (id, data) => {
        if (!currentUser) return;
        return await updateEquipmentProfile(currentUser.uid, id, data);
    };

    const deleteProfile = async (id) => {
        if (!currentUser) return;
        return await deleteEquipmentProfile(currentUser.uid, id);
    };

    const setAsDefault = async (id) => {
        if (!currentUser) return;
        return await setDefaultEquipment(currentUser.uid, id);
    };

    return {
        equipment,
        loading,
        error,
        addProfile,
        updateProfile,
        deleteProfile,
        setAsDefault
    };
}
