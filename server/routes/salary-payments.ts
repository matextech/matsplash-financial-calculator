import express from 'express';
import { db } from '../database';

const router = express.Router();

// Get salary payments with optional date filtering
router.get('/', async (req, res) => {
  try {
    let query = db('salary_payments').select('*').orderBy('payment_date', 'desc');

    if (req.query.startDate) {
      query = query.where('payment_date', '>=', req.query.startDate);
    }
    if (req.query.endDate) {
      query = query.where('payment_date', '<=', req.query.endDate);
    }

    const payments = await query;
    res.json(payments);
  } catch (error) {
    console.error('Error fetching salary payments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

