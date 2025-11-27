import express from 'express';
import { db } from '../database';

const router = express.Router();

// Helper function to transform database fields to frontend format
function transformEmployee(employee: any) {
  // Convert snake_case to camelCase - only return camelCase fields
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone || null,
    role: employee.role,
    salaryType: employee.salary_type || employee.salaryType || 'commission', // Convert snake_case to camelCase
    fixedSalary: (employee.fixed_salary !== null && employee.fixed_salary !== undefined) 
      ? employee.fixed_salary 
      : (employee.fixedSalary !== null && employee.fixedSalary !== undefined ? employee.fixedSalary : undefined),
    commissionRate: (employee.commission_rate !== null && employee.commission_rate !== undefined) 
      ? employee.commission_rate 
      : (employee.commissionRate !== null && employee.commissionRate !== undefined ? employee.commissionRate : undefined),
    createdAt: employee.created_at || employee.createdAt,
    updatedAt: employee.updated_at || employee.updatedAt,
    // Note: employees table doesn't have is_active field yet
    // Consider all employees active for now
    isActive: employee.is_active !== undefined ? employee.is_active : true,
  };
}

// Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await db('employees').select('*').orderBy('name');
    const transformed = employees.map(transformEmployee);
    console.log('📋 Employees route - Transformed sample:', transformed.length > 0 ? JSON.stringify(transformed[0], null, 2) : 'No employees');
    res.json({
      success: true,
      data: transformed
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const employee = await db('employees').where('id', req.params.id).first();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    res.json({
      success: true,
      data: transformEmployee(employee)
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create employee
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, role, salaryType, fixedSalary, commissionRate } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required'
      });
    }

    // Check for duplicate email
    const existingEmployee = await db('employees')
      .where('email', email)
      .first();

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }

    const [id] = await db('employees').insert({
      name,
      email,
      phone: phone || null,
      role,
      salary_type: salaryType || 'commission',
      fixed_salary: fixedSalary || null,
      commission_rate: commissionRate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const newEmployee = await db('employees').where('id', id).first();

    res.json({
      success: true,
      data: transformEmployee(newEmployee),
      message: 'Employee created successfully'
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.email !== undefined) {
      // Check if email is being changed and if it already exists for another employee
      const existingEmployee = await db('employees')
        .where('email', req.body.email)
        .whereNot('id', id)
        .first();
      
      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: 'An employee with this email already exists'
        });
      }
      updateData.email = req.body.email;
    }
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.role !== undefined) updateData.role = req.body.role;
    if (req.body.salaryType !== undefined) updateData.salary_type = req.body.salaryType;
    if (req.body.fixedSalary !== undefined) updateData.fixed_salary = req.body.fixedSalary;
    if (req.body.commissionRate !== undefined) updateData.commission_rate = req.body.commissionRate;
    // Note: is_active field doesn't exist in employees table yet

    await db('employees').where('id', id).update(updateData);

    // Return updated employee
    const updatedEmployee = await db('employees').where('id', id).first();

    res.json({
      success: true,
      data: transformEmployee(updatedEmployee),
      message: 'Employee updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    
    // Check for unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    await db('employees').where('id', req.params.id).delete();
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

