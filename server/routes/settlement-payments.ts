import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper to transform payment data from DB to frontend format
function transformPayment(payment: any) {
  if (!payment) return null;
  return {
    id: payment.id,
    settlementId: payment.settlement_id,
    amount: payment.amount,
    paidBy: payment.paid_by,
    paidAt: payment.paid_at,
    notes: payment.notes,
    createdAt: payment.created_at,
  };
}

// Get all payments for a specific settlement
router.get('/settlement/:settlementId', async (req, res) => {
  try {
    const { settlementId } = req.params;
    const payments = await db('settlement_payments')
      .where('settlement_id', settlementId)
      .orderBy('paid_at', 'asc');
    
    res.json({ success: true, data: payments.map(transformPayment) });
  } catch (error) {
    console.error('Error fetching settlement payments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all payments (with optional date filtering)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = db('settlement_payments')
      .select('settlement_payments.*')
      .orderBy('settlement_payments.paid_at', 'desc');
    
    if (startDate && endDate) {
      query = query.whereBetween('settlement_payments.paid_at', [startDate, endDate]);
    }
    
    const payments = await query;
    res.json({ success: true, data: payments.map(transformPayment) });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create a new payment
router.post('/', async (req, res) => {
  try {
    const { settlementId, amount, paidBy, paidAt, notes } = req.body;

    if (!settlementId || !amount || !paidBy || !paidAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Settlement ID, amount, paid by, and paid at are required' 
      });
    }

    const [id] = await db('settlement_payments').insert({
      settlement_id: settlementId,
      amount,
      paid_by: paidBy,
      paid_at: paidAt,
      notes: notes || null,
      created_at: new Date().toISOString(),
    });

    const newPayment = await db('settlement_payments').where('id', id).first();
    res.status(201).json({ 
      success: true, 
      data: transformPayment(newPayment), 
      message: 'Payment recorded successfully' 
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete a payment (in case of error correction)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db('settlement_payments').where('id', id).del();
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;

