import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformEntry(entry: any) {
  if (!entry) return null;
  return {
    id: entry.id,
    date: entry.date,
    entryType: entry.entry_type,
    driverId: entry.driver_id,
    driverName: entry.driver_name,
    packerId: entry.packer_id,
    packerName: entry.packer_name,
    bagsCount: entry.bags_count,
    submittedBy: entry.submitted_by,
    submittedAt: entry.submitted_at,
    isSubmitted: entry.is_submitted === 1 || entry.is_submitted === true,
    notes: entry.notes,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

// Get all storekeeper entries (with optional date filtering)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = db('storekeeper_entries').select('*').orderBy('date', 'desc');
    
    if (startDate && endDate) {
      query = query.whereBetween('date', [startDate as string, endDate as string]);
    }
    
    const entries = await query;
    
    res.json({
      success: true,
      data: entries.map(transformEntry)
    });
  } catch (error) {
    console.error('Error fetching storekeeper entries:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get entry by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await db('storekeeper_entries').where('id', req.params.id).first();
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }
    
    res.json({
      success: true,
      data: transformEntry(entry)
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new entry
router.post('/', async (req, res) => {
  try {
    const { 
      date, 
      entryType,
      driverId, 
      driverName,
      packerId,
      packerName,
      bagsCount, 
      submittedBy,
      isSubmitted,
      notes 
    } = req.body;

    if (!date || !entryType || bagsCount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Date, entry type, and bags count are required'
      });
    }

    const [id] = await db('storekeeper_entries').insert({
      date: new Date(date).toISOString().split('T')[0],
      entry_type: entryType,
      driver_id: driverId || null,
      driver_name: driverName || null,
      packer_id: packerId || null,
      packer_name: packerName || null,
      bags_count: bagsCount,
      submitted_by: submittedBy,
      submitted_at: isSubmitted ? new Date().toISOString() : null,
      is_submitted: isSubmitted ? 1 : 0,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const newEntry = await db('storekeeper_entries').where('id', id).first();

    res.json({
      success: true,
      data: transformEntry(newEntry),
      message: 'Entry created successfully'
    });
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.date !== undefined) updateData.date = new Date(req.body.date).toISOString().split('T')[0];
    if (req.body.entryType !== undefined) updateData.entry_type = req.body.entryType;
    if (req.body.driverId !== undefined) updateData.driver_id = req.body.driverId;
    if (req.body.driverName !== undefined) updateData.driver_name = req.body.driverName;
    if (req.body.packerId !== undefined) updateData.packer_id = req.body.packerId;
    if (req.body.packerName !== undefined) updateData.packer_name = req.body.packerName;
    if (req.body.bagsCount !== undefined) updateData.bags_count = req.body.bagsCount;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.isSubmitted !== undefined) {
      updateData.is_submitted = req.body.isSubmitted ? 1 : 0;
      if (req.body.isSubmitted) {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    await db('storekeeper_entries').where('id', id).update(updateData);

    const updatedEntry = await db('storekeeper_entries').where('id', id).first();

    res.json({
      success: true,
      data: transformEntry(updatedEntry),
      message: 'Entry updated successfully'
    });
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete entry
router.delete('/:id', async (req, res) => {
  try {
    await db('storekeeper_entries').where('id', req.params.id).delete();
    
    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

