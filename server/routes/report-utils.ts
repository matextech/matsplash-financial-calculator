import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper to get max date from a table/column as YYYY-MM-DD string
async function getMaxDate(table: string, column: string): Promise<string | null> {
  const result = await db(table).max<{ maxDate: string | null }>(`${column} as maxDate`).first();
  if (!result || !result.maxDate) return null;
  // result.maxDate should already be YYYY-MM-DD since column is DATE
  return result.maxDate;
}

router.get('/default-date', async (req, res) => {
  try {
    const dateCandidates: string[] = [];

    const [salesMax, expensesMax, materialsMax, packersMax, salaryMax] = await Promise.all([
      getMaxDate('sales', 'date'),
      getMaxDate('expenses', 'date'),
      getMaxDate('material_purchases', 'date'),
      getMaxDate('packer_entries', 'date'),
      getMaxDate('salary_payments', 'payment_date'),
    ]);

    if (salesMax) dateCandidates.push(salesMax);
    if (expensesMax) dateCandidates.push(expensesMax);
    if (materialsMax) dateCandidates.push(materialsMax);
    if (packersMax) dateCandidates.push(packersMax);
    if (salaryMax) dateCandidates.push(salaryMax);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    let defaultDate: string;

    if (dateCandidates.length > 0) {
      // Dates are in YYYY-MM-DD, so lexicographical max is the latest date
      const maxDate = dateCandidates.sort().at(-1)!;
      // NEVER return a future date - cap at today
      defaultDate = maxDate > todayStr ? todayStr : maxDate;
    } else {
      // Fallback: use today's date
      defaultDate = todayStr;
    }

    res.json({
      success: true,
      date: defaultDate,
    });
  } catch (error) {
    console.error('Error determining default report date:', error);
    // Fallback to today's date if anything goes wrong
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;

    res.json({
      success: true,
      date: defaultDate,
    });
  }
});

export default router;


