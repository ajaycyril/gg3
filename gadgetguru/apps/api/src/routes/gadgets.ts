import { Router } from 'express';
import { supabase } from '../db/supabaseClient';

const router = Router();

// Get all gadgets
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('gadgets')
        .select('*');

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Get a gadget by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('gadgets')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Create a new gadget
router.post('/', async (req, res) => {
    const { name, price, brand, image, specs } = req.body;
    const { data, error } = await supabase
        .from('gadgets')
        .insert([{ name, price, brand, image, specs }]);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

// Update a gadget
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, brand, image, specs } = req.body;
    const { data, error } = await supabase
        .from('gadgets')
        .update({ name, price, brand, image, specs })
        .eq('id', id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Delete a gadget
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('gadgets')
        .delete()
        .eq('id', id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(204).send();
});

export default router;