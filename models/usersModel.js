const mongoose = require('mongoose');
const validator = require('validator'); //https://github.com/validatorjs/validator.js?files=1
const bcrypt = require('bcryptjs'); //https://github.com/dcodeIO/bcrypt.js/blob/master/README.md
const crypto = require('crypto'); //https://github.com/brix/crypto-js

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name ❌'],
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  email: {
    type: String,
    required: [true, 'Valid Email address is required ❌'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid Email ❌']
  },
  isVerified: { type: Boolean, default: false },
  photo: { type: String, default: 'default.jpg' },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'Password is required ❌'],
    minlength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password ❌'],
    validate: {
      //NOTE this will only works on create or save 🚨🚨🚨
      validator: function(el) {
        return el === this.password; // return true or false 🚨
      },
      message: 'Passwords are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); //https://mongoosejs.com/docs/api/document.html

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  // this point to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    console.log('=====================================');
    console.log('changePasswordTimeStamp JWWTimestamp ');
    console.log('=====================================');
    console.log(changedTimestamp, `               ${JWTTimestamp}`);
    console.log('=====================================');

    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
