import express from 'express';
import { db } from '../database';

const router = express.Router();

// Transform database row to frontend format
function transformSalaryPayment(payment: any) {
  return {
    id: payment.id,
    employeeId: payment.employee_id,
    employeeName: payment.employee_name,
    fixedAmount: payment.fixed_salary ? parseFloat(payment.fixed_salary) : undefined,
    commissionAmount: payment.commission ? parseFloat(payment.commission) : undefined,
    totalAmount: parseFloat(payment.total_amount) || 0,
    period: payment.period,
    periodStart: payment.period_start,
    periodEnd: payment.period_end,
    paidDate: payment.payment_date,
    notes: payment.notes,
    createdAt: payment.created_at,
    totalBags: payment.total_bags,
  };
}

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
    console.log(`Salary Payments API - Query params:`, { startDate: req.query.startDate, endDate: req.query.endDate });
    console.log(`Salary Payments API - Found ${payments.length} payments`);
    
    const transformedPayments = payments.map(transformSalaryPayment);
    res.json(transformedPayments);
  } catch (error) {
    console.error('Error fetching salary payments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

