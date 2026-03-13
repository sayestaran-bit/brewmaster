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
import { useToast } from '../context/ToastContext';

export function useRecipes() {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
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
            (data) => {
                setRecipes(data);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('❌ useRecipes Subscription Error:', err);
                setError(err.message);
                setLoading(false);
                addToast('Error de conexión con la base de datos de recetas.', 'error');
            }
        );
        return unsub;
    }, [currentUser, addToast]);

    // CRUD con validación integrada
    const addRecipe = useCallback(async (data, recipeId = null) => {
        try {
            const { valid, errors } = validateRecipe(data);
            if (!valid) {
                const msg = errors.join(' ');
                addToast(msg, 'warning');
                throw new Error(msg);
            }
            const id = await _addRecipe(currentUser.uid, data, recipeId);
            addToast('Receta guardada con éxito.', 'success');
            return id;
        } catch (err) {
            console.error('❌ useRecipes.addRecipe Error:', err);
            addToast(err.message || 'Error al guardar la receta.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    const updateRecipe = useCallback(async (recipeId, data) => {
        try {
            const { valid, errors } = validateRecipe(data, true);
            if (!valid) {
                const msg = errors.join(' ');
                addToast(msg, 'warning');
                throw new Error(msg);
            }
            await _updateRecipe(currentUser.uid, recipeId, data);
            addToast('Receta actualizada.', 'success');
        } catch (err) {
            console.error('❌ useRecipes.updateRecipe Error:', err);
            addToast(err.message || 'Error al actualizar la receta.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    const deleteRecipe = useCallback(async (recipeId) => {
        try {
            await _deleteRecipe(currentUser.uid, recipeId);
            addToast('Receta eliminada.', 'info');
        } catch (err) {
            console.error('❌ useRecipes.deleteRecipe Error:', err);
            addToast('No se pudo eliminar la receta.', 'error');
            throw err;
        }
    }, [currentUser, addToast]);

    return { recipes, loading, error, addRecipe, updateRecipe, deleteRecipe };
}
