import express from 'express';
import { db } from '../database';

const router = express.Router();

// Transform database row to frontend format
function transformPackerEntry(entry: any) {
  return {
    id: entry.id,
    packerName: entry.packer_name,
    packerEmail: entry.packer_email,
    employeeId: entry.employee_id,
    bagsPacked: entry.bags_packed,
    date: entry.date,
    notes: entry.notes,
    createdAt: entry.created_at,
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

// Get packer entries with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('packer_entries').select('*').orderBy('date', 'desc');

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
    
    // Fetching packer entries

    const entries = await query;
    
    // Debug logging
    console.log('Packer entries query:', {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      count: entries.length,
      sample: entries.slice(0, 2).map(e => ({ id: e.id, date: e.date, bags: e.bags_packed }))
    });
    
    const transformedEntries = entries.map(transformPackerEntry);
    res.json(transformedEntries);
  } catch (error) {
    console.error('Error fetching packer entries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get packer entry by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await db('packer_entries').where('id', req.params.id).first();
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Packer entry not found'
      });
    }
    res.json(transformPackerEntry(entry));
  } catch (error) {
    console.error('Error fetching packer entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create packer entry
router.post('/', async (req, res) => {
  try {
    const { packerName, packerEmail, employeeId, bagsPacked, date, notes } = req.body;

    if (!packerName || !bagsPacked || !date) {
      return res.status(400).json({
        success: false,
        message: 'Packer name, bags packed, and date are required'
      });
    }

    const normalizedDate = normalizeDate(date);

    const [id] = await db('packer_entries').insert({
      packer_name: packerName,
      packer_email: packerEmail || null,
      employee_id: employeeId || null,
      bags_packed: bagsPacked,
      date: normalizedDate,
      notes: notes || null,
      created_at: new Date().toISOString()
    });

    const newEntry = await db('packer_entries').where('id', id).first();

    res.json({
      success: true,
      data: transformPackerEntry(newEntry),
      message: 'Packer entry created successfully'
    });
  } catch (error: any) {
    console.error('Error creating packer entry:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate packer entry already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update packer entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { packerName, packerEmail, employeeId, bagsPacked, date, notes } = req.body;

    const updateData: any = {};
    if (packerName !== undefined) updateData.packer_name = packerName;
    if (packerEmail !== undefined) updateData.packer_email = packerEmail;
    if (employeeId !== undefined) updateData.employee_id = employeeId;
    if (bagsPacked !== undefined) updateData.bags_packed = bagsPacked;
    if (date !== undefined) updateData.date = normalizeDate(date);
    if (notes !== undefined) updateData.notes = notes;

    await db('packer_entries').where('id', id).update(updateData);

    const updatedEntry = await db('packer_entries').where('id', id).first();

    if (!updatedEntry) {
      return res.status(404).json({
        success: false,
        message: 'Packer entry not found'
      });
    }

    res.json({
      success: true,
      data: transformPackerEntry(updatedEntry),
      message: 'Packer entry updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating packer entry:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate packer entry already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete packer entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await db('packer_entries').where('id', id).first();
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Packer entry not found'
      });
    }

    await db('packer_entries').where('id', id).delete();

    res.json({
      success: true,
      message: 'Packer entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting packer entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

