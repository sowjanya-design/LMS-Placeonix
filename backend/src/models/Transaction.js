const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    paymentGateway: {
      type: String,
      enum: ["razorpay", "stripe", "paypal", "manual"],
      required: true,
    },
    gatewayTransactionId: { type: String },
    status: {
      type: String,
      enum: ["success", "pending", "failed", "refunded"],
      required: true,
    },
    paymentMethod: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
