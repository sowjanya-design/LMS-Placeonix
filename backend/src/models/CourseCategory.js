const mongoose = require('mongoose');

const courseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, maxlength: 500 },
  icon: { type: String },
  color: { type: String, default: '#7c6ce6' },
  isActive: { type: Boolean, default: true },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseCategory' },
}, { timestamps: true });

courseCategorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('CourseCategory', courseCategorySchema);