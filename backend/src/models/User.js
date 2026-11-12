import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    profileImage: { type: String, default: '', maxlength: 400000 },
    preferredLanguage: { type: String, enum: ['uz', 'en', 'ru'], default: 'uz' },
    notifications: {
      email: { type: Boolean, default: true },
      practiceReminders: { type: Boolean, default: true },
      productUpdates: { type: Boolean, default: false },
    },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);
