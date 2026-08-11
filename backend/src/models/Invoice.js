const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, 
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  dueDate: { type: Date },
  paidAt: { type: Date },
  items: [{ description: String, quantity: { type: Number, default: 1 }, unitPrice: Number, total: Number }],
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  invoiceUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);