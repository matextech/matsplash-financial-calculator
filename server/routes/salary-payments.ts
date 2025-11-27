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

// Create salary payment
router.post('/', async (req, res) => {
  try {
    const { employeeId, employeeName, fixedAmount, commissionAmount, totalAmount, period, periodStart, periodEnd, paidDate, notes, totalBags } = req.body;

    if (!employeeId || !employeeName || !totalAmount || !period || !periodStart || !periodEnd || !paidDate) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, name, total amount, period, dates, and paid date are required'
      });
    }

    // Check for duplicate payment for the same employee and period
    const existingPayment = await db('salary_payments')
      .where('employee_id', employeeId)
      .where('period_start', periodStart)
      .where('period_end', periodEnd)
      .first();

    if (existingPayment) {
      return res.status(409).json({
        success: false,
        message: 'A salary payment for this employee and period already exists'
      });
    }

    const [id] = await db('salary_payments').insert({
      employee_id: employeeId,
      employee_name: employeeName,
      fixed_salary: fixedAmount || null,
      commission: commissionAmount || null,
      total_amount: totalAmount,
      period: period,
      period_start: periodStart,
      period_end: periodEnd,
      payment_date: paidDate,
      notes: notes || null,
      total_bags: totalBags || null,
      created_at: new Date().toISOString()
    });

    const newPayment = await db('salary_payments').where('id', id).first();

    res.json({
      success: true,
      data: transformSalaryPayment(newPayment),
      message: 'Salary payment created successfully'
    });
  } catch (error: any) {
    console.error('Error creating salary payment:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A salary payment for this employee and period already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update salary payment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, employeeName, fixedAmount, commissionAmount, totalAmount, period, periodStart, periodEnd, paidDate, notes, totalBags } = req.body;

    const updateData: any = {};
    if (employeeId !== undefined) updateData.employee_id = employeeId;
    if (employeeName !== undefined) updateData.employee_name = employeeName;
    if (fixedAmount !== undefined) updateData.fixed_salary = fixedAmount;
    if (commissionAmount !== undefined) updateData.commission = commissionAmount;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount;
    if (period !== undefined) updateData.period = period;
    if (periodStart !== undefined) updateData.period_start = periodStart;
    if (periodEnd !== undefined) updateData.period_end = periodEnd;
    if (paidDate !== undefined) updateData.payment_date = paidDate;
    if (notes !== undefined) updateData.notes = notes;
    if (totalBags !== undefined) updateData.total_bags = totalBags;

    await db('salary_payments').where('id', id).update(updateData);

    const updatedPayment = await db('salary_payments').where('id', id).first();

    if (!updatedPayment) {
      return res.status(404).json({
        success: false,
        message: 'Salary payment not found'
      });
    }

    res.json({
      success: true,
      data: transformSalaryPayment(updatedPayment),
      message: 'Salary payment updated successfully'
    });
  } catch (error) {
    console.error('Error updating salary payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete salary payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await db('salary_payments').where('id', id).first();
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Salary payment not found'
      });
    }

    await db('salary_payments').where('id', id).delete();

    res.json({
      success: true,
      message: 'Salary payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting salary payment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

