import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema({
  decisionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['maintenance', 'trip_dispatch', 'vehicle_allocation', 'driver_assignment', 'budget_approval', 'operational'],
    default: 'operational'
  },
  description: {
    type: String,
    required: true
  },
  relatedEntity: {
    entityType: { type: String, enum: ['Vehicle', 'Trip', 'Maintenance', 'Driver', 'General'], default: 'General' },
    entityId: { type: String },
    entityLabel: { type: String }
  },
  status: {
    type: String,
    enum: ['Pending Admin Review', 'Manager Approved', 'Approved by Admin', 'Modified by Admin', 'Overridden by Admin', 'Rejected by Admin'],
    default: 'Pending Admin Review'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  managerDecision: {
    decidedBy: { type: String, default: 'Reena' },
    managerRole: { type: String, default: 'Fleet Operations Manager' },
    action: { type: String, default: 'Authorized' },
    amount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
  },
  adminOverride: {
    reviewedBy: { type: String, default: null },
    action: { type: String, default: null },
    overrideTimestamp: { type: Date, default: null },
    adjustedAmount: { type: Number, default: null },
    adminNotes: { type: String, default: null }
  }
}, {
  timestamps: true
});

const Decision = mongoose.models.Decision || mongoose.model('Decision', decisionSchema);
export default Decision;
