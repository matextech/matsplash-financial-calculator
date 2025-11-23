import express from 'express';
import { db } from '../database';

const router = express.Router();

console.log('📝 Audit logs route module loaded');

// Helper to transform audit log data from DB to frontend format
function transformAuditLog(log: any) {
  if (!log) return null;
  return {
    id: log.id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    action: log.action,
    field: log.field,
    oldValue: log.old_value,
    newValue: log.new_value,
    changedBy: log.changed_by,
    changedAt: log.changed_at,
    reason: log.reason,
    createdAt: log.created_at,
  };
}

// Get audit logs with optional filters
router.get('/', async (req, res) => {
  try {
    const { entityType, entityId, startDate, endDate } = req.query;
    
    let query = db('audit_logs');
    
    if (entityType) {
      query = query.where('entity_type', entityType as string);
    }
    
    if (entityId) {
      query = query.where('entity_id', parseInt(entityId as string));
    }
    
    if (startDate) {
      query = query.where('changed_at', '>=', new Date(startDate as string).toISOString());
    }
    
    if (endDate) {
      query = query.where('changed_at', '<=', new Date(endDate as string).toISOString());
    }
    
    const logs = await query.orderBy('changed_at', 'desc');
    
    res.json({
      success: true,
      data: logs.map(transformAuditLog)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new audit log
router.post('/', async (req, res) => {
  console.log('📝 POST /api/audit-logs - Creating audit log:', req.body);
  try {
    // First, check if table exists
    const tableExists = await db.schema.hasTable('audit_logs');
    if (!tableExists) {
      console.error('❌ audit_logs table does not exist!');
      return res.status(500).json({
        success: false,
        message: 'Database table not found. Please restart the server to create the table.'
      });
    }

    const { 
      entityType, 
      entityId, 
      action, 
      field, 
      oldValue, 
      newValue, 
      changedBy, 
      changedAt, 
      reason 
    } = req.body;

    if (!entityType || !entityId || !action || !changedBy) {
      return res.status(400).json({
        success: false,
        message: 'Entity type, entity ID, action, and changed by are required'
      });
    }

    const insertData: any = {
      entity_type: entityType,
      entity_id: entityId,
      action,
      field: field || null,
      old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
      new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
      changed_by: changedBy,
      reason: reason || null,
      created_at: new Date().toISOString(),
    };
    
    // Handle timestamps
    if (changedAt) {
      insertData.changed_at = new Date(changedAt).toISOString();
    } else {
      insertData.changed_at = new Date().toISOString();
    }
    
    console.log('📝 Inserting audit log with data:', insertData);
    
    const result = await db('audit_logs').insert(insertData);
    console.log('📝 Insert result:', result);
    
    // SQLite returns lastInsertRowid, handle both array and number
    const id = Array.isArray(result) ? result[0] : result;
    console.log('📝 Extracted ID:', id);

    const newLog = await db('audit_logs').where('id', id).first();
    
    if (!newLog) {
      console.error('❌ Failed to retrieve inserted log with id:', id);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created audit log'
      });
    }

    res.status(201).json({
      success: true,
      data: transformAuditLog(newLog),
      message: 'Audit log created successfully'
    });
  } catch (error: any) {
    console.error('❌ Error creating audit log:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

