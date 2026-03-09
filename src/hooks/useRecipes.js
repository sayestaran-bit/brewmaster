// /src/hooks/useRecipes.js
//
// Hook que gestiona el estado de recetas en tiempo real desde Firestore.
// Las vistas simplemente llaman { recipes, addRecipe, updateRecipe, deleteRecipe }
// sin saber nada de Firestore.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    onRecipesSnapshot,
    addRecipe as _addRecipe,
    updateRecipe as _updateRecipe,
    deleteRecipe as _deleteRecipe,
} from '../services/firestore/recipes';
import { validateRecipe } from '../utils/validators';

export function useRecipes() {
    const { currentUser } = useAuth();
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Suscripción en tiempo real
    useEffect(() => {
        if (!currentUser) {
            setRecipes([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onRecipesSnapshot(
            currentUser.uid,
            (data) => { setRecipes(data); setLoading(false); setError(null); },
            (err) => { console.error('useRecipes:', err); setError(err.message); setLoading(false); }
        );
        return unsub;
    }, [currentUser]);

    // CRUD con validación integrada
    const addRecipe = useCallback(async (data) => {
        const { valid, errors } = validateRecipe(data);
        if (!valid) throw new Error(errors.join(' '));
        return await _addRecipe(currentUser.uid, data);
    }, [currentUser]);

    const updateRecipe = useCallback(async (recipeId, data) => {
        const { valid, errors } = validateRecipe(data, true);
        if (!valid) throw new Error(errors.join(' '));
        await _updateRecipe(currentUser.uid, recipeId, data);
    }, [currentUser]);

    const deleteRecipe = useCallback(async (recipeId) => {
        await _deleteRecipe(currentUser.uid, recipeId);
    }, [currentUser]);

    return { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe };
}
