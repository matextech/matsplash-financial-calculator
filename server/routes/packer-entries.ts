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

// Get packer entries with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('packer_entries').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      query = query.where('date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      // Use <= comparison with endDate to include the entire end date
      // Since dates are stored as DATE type, this will include all entries on that date
      query = query.where('date', '<=', req.query.endDate);
    }
    
    // Fetching packer entries

    const entries = await query;
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

    const [id] = await db('packer_entries').insert({
      packer_name: packerName,
      packer_email: packerEmail || null,
      employee_id: employeeId || null,
      bags_packed: bagsPacked,
      date: date,
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
    if (date !== undefined) updateData.date = date;
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

