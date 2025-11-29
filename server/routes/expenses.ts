import express from 'express';
import { db } from '../database';

const router = express.Router();

// Transform database row to frontend format
function transformExpense(expense: any) {
  return {
    id: expense.id,
    type: expense.type,
    description: expense.description,
    amount: parseFloat(expense.amount) || 0,
    date: expense.date,
    reference: expense.reference,
    createdAt: expense.created_at,
  };
}

// Normalize any incoming date value to YYYY-MM-DD (date-only, no time)
function normalizeDate(input: any): string {
  if (!input) return input;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) {
    return input;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get expenses with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('expenses').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      // Dates are stored as YYYY-MM-DD strings, so direct string comparison works
      // Normalize the startDate to YYYY-MM-DD format
      const startDateParam = Array.isArray(req.query.startDate) ? req.query.startDate[0] : req.query.startDate;
      const startDateStr = typeof startDateParam === 'string' 
        ? startDateParam.split('T')[0] 
        : String(startDateParam).split('T')[0];
      query = query.where('date', '>=', startDateStr);
    }
    if (req.query.endDate) {
      // Normalize the endDate to YYYY-MM-DD format
      // Use < instead of <= since we're adding 1 day on the frontend to make it inclusive
      const endDateParam = Array.isArray(req.query.endDate) ? req.query.endDate[0] : req.query.endDate;
      const endDateStr = typeof endDateParam === 'string' 
        ? endDateParam.split('T')[0] 
        : String(endDateParam).split('T')[0];
      query = query.where('date', '<', endDateStr);
    }

    const expenses = await query;
    
    // Debug logging
    console.log('Expenses query:', {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      count: expenses.length,
      sample: expenses.slice(0, 2).map(e => ({ id: e.id, date: e.date, type: e.type, amount: e.amount }))
    });
    
    const transformedExpenses = expenses.map(transformExpense);
    res.json(transformedExpenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const { type, description, amount, date, reference } = req.body;

    if (!type || !description || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Type, description, amount, and date are required'
      });
    }

    const normalizedDate = normalizeDate(date);

    const [id] = await db('expenses').insert({
      type: type,
      description: description,
      amount: amount,
      date: normalizedDate,
      reference: reference || null,
      created_at: new Date().toISOString()
    });

    const newExpense = await db('expenses').where('id', id).first();

    res.json({
      success: true,
      data: transformExpense(newExpense),
      message: 'Expense created successfully'
    });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate expense record already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, amount, date, reference } = req.body;

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;
    if (date !== undefined) updateData.date = normalizeDate(date);
    if (reference !== undefined) updateData.reference = reference;

    await db('expenses').where('id', id).update(updateData);

    const updatedExpense = await db('expenses').where('id', id).first();

    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: transformExpense(updatedExpense),
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await db('expenses').where('id', id).first();
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await db('expenses').where('id', id).delete();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

