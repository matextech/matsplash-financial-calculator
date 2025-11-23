import express from 'express';
import { db } from '../database';

const router = express.Router();

console.log('📝 Audit logs route module loaded');

// Test endpoint to verify table exists
router.get('/test', async (req, res) => {
  try {
    const tableExists = await db.schema.hasTable('audit_logs');
    if (!tableExists) {
      return res.status(500).json({
        success: false,
        message: 'audit_logs table does not exist',
        tableExists: false
      });
    }
    
    // Try a simple query
    const count = await db('audit_logs').count('* as count').first();
    
    res.json({
      success: true,
      tableExists: true,
      recordCount: count?.count || 0,
      message: 'Table exists and is accessible'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error testing table',
      error: error.message
    });
  }
});

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
  try {
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

    // Format timestamps - use ISO string format like other routes
    const changedAtValue = changedAt ? new Date(changedAt).toISOString() : new Date().toISOString();

    const [id] = await db('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      field: field || null,
      old_value: oldValue !== undefined && oldValue !== null ? String(oldValue) : null,
      new_value: newValue !== undefined && newValue !== null ? String(newValue) : null,
      changed_by: changedBy,
      changed_at: changedAtValue,
      reason: reason || null,
      // Note: created_at column will be added by migration on next server restart
    });

    const newLog = await db('audit_logs').where('id', id).first();

    res.status(201).json({
      success: true,
      data: transformAuditLog(newLog),
      message: 'Audit log created successfully'
    });
  } catch (error: any) {
    console.error('Error creating audit log:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

