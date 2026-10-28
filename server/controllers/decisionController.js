import { DataEngine, generateId } from '../models/dataEngine.js';

// @desc Get all fleet operational decisions
// @route GET /api/decisions
export const getDecisions = async (req, res, next) => {
  try {
    const { status, category, priority, search } = req.query;

    let decisions = await DataEngine.find('decisions');

    if (status && status !== 'All') {
      decisions = decisions.filter(d => d.status === status);
    }

    if (category && category !== 'All') {
      decisions = decisions.filter(d => d.category === category);
    }

    if (priority && priority !== 'All') {
      decisions = decisions.filter(d => d.priority === priority);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      decisions = decisions.filter(d =>
        (d.decisionId && d.decisionId.toLowerCase().includes(q)) ||
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.managerDecision?.decidedBy && d.managerDecision.decidedBy.toLowerCase().includes(q))
      );
    }

    decisions.sort((a, b) => new Date(b.createdAt || b.managerDecision?.timestamp || 0) - new Date(a.createdAt || a.managerDecision?.timestamp || 0));

    // Summary stats
    const total = decisions.length;
    const pendingReview = decisions.filter(d => d.status === 'Pending Admin Review').length;
    const managerApproved = decisions.filter(d => d.status === 'Manager Approved').length;
    const adminOverridden = decisions.filter(d => d.status === 'Overridden by Admin' || d.status === 'Rejected by Admin').length;
    const adminModified = decisions.filter(d => d.status === 'Modified by Admin').length;
    const adminApproved = decisions.filter(d => d.status === 'Approved by Admin').length;

    return res.status(200).json({
      success: true,
      data: decisions,
      summary: {
        total,
        pendingReview,
        managerApproved,
        adminOverridden,
        adminModified,
        adminApproved
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create a new manager decision / operational work order
// @route POST /api/decisions
export const createDecision = async (req, res, next) => {
  try {
    const {
      title,
      category = 'operational',
      description,
      relatedEntity,
      priority = 'Medium',
      amount = 0,
      notes = ''
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required for an operational decision.'
      });
    }

    const decisionCount = (await DataEngine.find('decisions')).length;
    const decisionId = `DEC-${1000 + decisionCount + 1}`;

    const newDecision = await DataEngine.create('decisions', {
      decisionId,
      title,
      category,
      description,
      relatedEntity: relatedEntity || { entityType: 'General', entityLabel: 'Fleet Operations' },
      status: req.user.role === 'admin' ? 'Approved by Admin' : 'Pending Admin Review',
      priority,
      managerDecision: {
        decidedBy: req.user.name || 'Reena',
        managerRole: req.user.role === 'admin' ? 'Executive Administrator' : 'Fleet Operations Manager',
        action: 'Authorized & Proposed',
        amount: Number(amount) || 0,
        timestamp: new Date().toISOString(),
        notes
      },
      adminOverride: req.user.role === 'admin' ? {
        reviewedBy: req.user.name,
        action: 'Directly Ratified by Admin',
        overrideTimestamp: new Date().toISOString(),
        adjustedAmount: Number(amount) || 0,
        adminNotes: 'Directly logged and ratified by Administrator.'
      } : {
        reviewedBy: null,
        action: null,
        overrideTimestamp: null,
        adjustedAmount: null,
        adminNotes: null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Operational decision logged successfully',
      data: newDecision
    });
  } catch (error) {
    next(error);
  }
};

// @desc Admin Edit or Override a Manager Decision
// @route PUT /api/decisions/:id/override
export const overrideDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      action, // 'Approved' | 'Modified' | 'Overridden' | 'Rejected'
      status, // 'Approved by Admin' | 'Modified by Admin' | 'Overridden by Admin' | 'Rejected by Admin'
      adjustedAmount,
      adminNotes = '',
      title,
      priority,
      description
    } = req.body;

    const decision = await DataEngine.findById('decisions', id);
    if (!decision) {
      return res.status(404).json({ success: false, message: 'Decision record not found' });
    }

    const targetStatus = status || (action === 'Approved' ? 'Approved by Admin' : action === 'Overridden' ? 'Overridden by Admin' : 'Modified by Admin');

    const updateFields = {
      status: targetStatus,
      adminOverride: {
        reviewedBy: req.user.name || 'Rithesh',
        action: action || 'Modified by Admin',
        overrideTimestamp: new Date().toISOString(),
        adjustedAmount: adjustedAmount !== undefined && adjustedAmount !== null ? Number(adjustedAmount) : (decision.managerDecision?.amount || 0),
        adminNotes: adminNotes || `Reviewed and updated by Administrator ${req.user.name || 'Rithesh'}`
      }
    };

    if (title) updateFields.title = title;
    if (priority) updateFields.priority = priority;
    if (description) updateFields.description = description;

    const updated = await DataEngine.findByIdAndUpdate('decisions', id, updateFields, { new: true });

    return res.status(200).json({
      success: true,
      message: `Manager decision successfully ${targetStatus.toLowerCase()}`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update an existing decision
// @route PUT /api/decisions/:id
export const updateDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await DataEngine.findByIdAndUpdate('decisions', id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Decision not found' });
    }
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc Delete a decision record
// @route DELETE /api/decisions/:id
export const deleteDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    await DataEngine.findByIdAndDelete('decisions', id);
    return res.status(200).json({ success: true, message: 'Decision removed' });
  } catch (error) {
    next(error);
  }
};
