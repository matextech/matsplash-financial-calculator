import express from 'express';
import { db } from '../database';

const router = express.Router();

// Get expenses with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('expenses').select('*').orderBy('date', 'desc');

    if (req.query.startDate) {
      query = query.where('date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      query = query.where('date', '<=', req.query.endDate);
    }

    const expenses = await query;
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

