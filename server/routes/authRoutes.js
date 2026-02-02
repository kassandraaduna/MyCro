const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/verify-login-otp', authController.verifyLoginOtp);
router.post('/resend-login-otp', authController.resendLoginOtp);

router.post('/change-password', authController.changePassword);
router.post('/resend-change-password-otp', authController.resendChangePasswordOtp);

router.post('/request-email-otp', authController.requestEmailOtp);
router.post('/resend-email-otp', authController.resendEmailOtp);
router.post('/verify-email-otp-and-register', authController.verifyEmailOtpAndRegister);

router.post('/request-password-reset-otp', authController.requestPasswordResetOtp);
router.post('/resend-password-reset-otp', authController.resendPasswordResetOtp);
router.post('/verify-password-reset-otp', authController.verifyPasswordResetOtp);

module.exports = router;
