const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    fname: { type: String, required: true, trim: true },
    lname: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    gender: {
      type: String,
      required: true,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      trim: true
    },
    number: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
    role: { type: String, default: 'user' }, 
    
  },
  { timestamps: true }
);

const UserModel = mongoose.model('accounts', UserSchema);
module.exports = UserModel;
