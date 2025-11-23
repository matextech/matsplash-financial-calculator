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

    const [id] = await db('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      field: field || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      changed_by: changedBy,
      changed_at: changedAt ? new Date(changedAt).toISOString() : new Date().toISOString(),
      reason: reason || null,
      created_at: new Date().toISOString()
    });

    const newLog = await db('audit_logs').where('id', id).first();

    res.status(201).json({
      success: true,
      data: transformAuditLog(newLog),
      message: 'Audit log created successfully'
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;

