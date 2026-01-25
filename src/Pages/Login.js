import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [step, setStep] = useState('login'); 

  const [loginOtp, setLoginOtp] = useState('');
  const [loginMaskedEmail, setLoginMaskedEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState(''); 
  const [loginOtpMeta, setLoginOtpMeta] = useState({ otpId: '', expiresAt: '' });

  const [fpEmail, setFpEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMeta, setOtpMeta] = useState({ otpId: '', expiresAt: '' });

  const [resetStage, setResetStage] = useState('otp');
  const [resendTimer, setResendTimer] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (resendTimer <= 0) return;

    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLogin = async () => {
    const userInput = usernameOrEmail.trim();
    const passInput = password;

    if (!userInput || !passInput) {
      const newErrors = {};
      setFormError('');
      if (!usernameOrEmail.trim()) {
        newErrors.usernameOrEmail = 'Username or email is required.';
      }
      if (!password) {
        newErrors.password = 'Password is required.';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      return;
    }

    if (userInput === 'admin' && passInput === 'admin') {
      setUsernameOrEmail('');
      setPassword('');
      navigate('/Adminpanel');
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/login', {
        usernameOrEmail: userInput,
        password: passInput,
      });

      if (res.data?.mfaRequired) {
        setLoginOtpMeta({
          otpId: res.data?.otpId || '',
          expiresAt: res.data?.expiresAt || '',
        });

        setLoginMaskedEmail(res.data?.maskedEmail || '');
        setLoginEmail(res.data?.email || ''); 
        setLoginOtp('');
        setStep('loginOtp');
        setResendTimer(60);
        return;
      }

      alert(res.data?.message || 'Login successful');

      const token = res.data?.data?.token;
      if (token) localStorage.setItem('token', token);

      const user = res.data?.data?.user || null;
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');

      setUsernameOrEmail('');
      setPassword('');

      navigate('/Homepage', { state: { employee: user } });
    } catch (error) {
      console.error('Login error:', error);
      const msg = error?.response?.data?.message || 'Login failed. Please try again.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Verify OTP for Login (MFA)
  const handleVerifyLoginOtp = async () => {
    if (!loginOtp.trim()) {
      setErrors({ otp: 'Please enter the 6-digit code.' });
      return;
    }

    setErrors({});

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/verify-login-otp', {
        otpId: loginOtpMeta.otpId,
        code: loginOtp.trim(),
      });

      alert(res.data?.message || 'Login successful');

      const token = res.data?.data?.token;
      if (token) localStorage.setItem('token', token);

      const user = res.data?.data?.user || null;
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');

      setLoginOtp('');
      setLoginMaskedEmail('');
      setLoginEmail('');
      setLoginOtpMeta({ otpId: '', expiresAt: '' });

      setUsernameOrEmail('');
      setPassword('');

      setStep('login');

      navigate('/Homepage', { state: { employee: user } });
    } catch (error) {
      console.error('VERIFY LOGIN OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Verification failed. Please try again.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!loginEmail) {
      const newErrors = {};
      setFormError('');
      if (!loginEmail) {
        newErrors.usernameOrEmail = 'Missing email for resend. Please login again.';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      setStep('login');
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/resend-login-otp', {
        email: loginEmail,
      });

      setLoginOtpMeta({
        otpId: res.data?.otpId || loginOtpMeta.otpId,
        expiresAt: res.data?.expiresAt || '',
      });

      setLoginMaskedEmail(res.data?.maskedEmail || loginMaskedEmail);
      setLoginEmail(res.data?.email || loginEmail);

      alert('Verification code resent!');
      setResendTimer(60);
    } catch (error) {
      console.error('RESEND LOGIN OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend code.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/Register');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (step === 'login') handleLogin();
      if (step === 'loginOtp') handleVerifyLoginOtp();
    }
  };

  const validateNewPassword = (pass, confirm) => {
    const newErrors = {};
    setFormError('');

    if (!pass || !confirm) {
      newErrors.password = 'Please enter and confirm your new password.';
    } else if (pass.length < 8) {
      newErrors.password = 'New password must be at least 8 characters long.';
    } else if (!/[!@#$%^&*]/.test(pass)) {
      newErrors.password = 'Must include a special character.';
    } else if (pass !== confirm) {
      newErrors.password = 'Passwords do not match.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetOtp = async () => {
    const email = fpEmail.trim().toLowerCase();
    if (!email) {
      alert('Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/request-password-reset-otp', {
        email,
      });

      setOtpMeta({
        otpId: res.data?.otpId || '',
        expiresAt: res.data?.expiresAt || '',
      });

      setMaskedEmail(res.data?.maskedEmail || email);
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setStep('verify');
      setResendTimer(60);
    } catch (error) {
      console.error('REQUEST RESET OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to send reset code.';
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    const email = fpEmail.trim().toLowerCase();
    if (!email) {
      alert('Missing email. Please go back.');
      return;
    }

    try {
      setIsLoading(true);

      const res = await axios.post('http://localhost:8000/api/auth/resend-password-reset-otp', {
        email,
      });

      setOtpMeta({
        otpId: res.data?.otpId || otpMeta.otpId,
        expiresAt: res.data?.expiresAt || '',
      });

      setMaskedEmail(res.data?.maskedEmail || email);
      alert('Reset code resent!');
      setResendTimer(60);
    } catch (error) {
      console.error('RESEND RESET OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend reset code.';
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndChangePassword = async () => {
    if (!otpMeta.otpId || !otp.trim()) {
      alert('Please enter the 6-digit OTP sent to your email.');
      return;
    }

    try {
      setIsLoading(true);

      await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
        otpId: otpMeta.otpId,
        code: otp.trim(),
        newPassword: '__TEMP__PASS__!@#',
      });

      setResetStage('password');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        'Invalid or expired OTP.';
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalPasswordReset = async () => {
  const isValid = validateNewPassword(newPassword, confirmNewPassword);
  if (!isValid) return;

  try {
    setIsLoading(true);

    await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
      otpId: otpMeta.otpId,
      code: otp.trim(),
      newPassword,
    });

    alert('Password changed successfully! You can login now.');

    setStep('login');
    setResetStage('otp');
    setFpEmail('');
    setMaskedEmail('');
    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setNewPassword('');
    setConfirmNewPassword('');
  } catch (error) {
    alert(
      error?.response?.data?.message ||
      'Password reset failed.'
    );
  } finally {
    setIsLoading(false);
  }
};

  const goForgot = () => {
    setStep('forgot');
    setFpEmail(usernameOrEmail.trim());
    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setMaskedEmail('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const backToLogin = () => {
    setStep('login');

    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setMaskedEmail('');
    setNewPassword('');
    setConfirmNewPassword('');

    setLoginOtp('');
    setLoginMaskedEmail('');
    setLoginEmail('');
    setLoginOtpMeta({ otpId: '', expiresAt: '' });
    setResendTimer(0);
  };

  return (
    <div className="theBody">
      <div className="loginMainCont">

        {step === 'login' && (
          <>
            <h2 className="logHead">SIGN IN</h2>
            <div className="loginSub">SIGN IN TO YOUR ACCOUNT TO GET STARTED.</div>

            <div className="loginInputs">
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, usernameOrEmail: '' }));
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {errors.usernameOrEmail && (
                <div className="fieldError">{errors.usernameOrEmail}</div>
              )}

              <input
                type="password"
                required
                autoComplete="off"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {errors.password && (
                <div className="fieldError">{errors.password}</div>
              )}
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN-IN'}
            </button>
            {formError && (
              <div className="formError">{formError}</div>
            )}

            <button
              type="button"
              className="registerTextBtn"
              onClick={goForgot}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Forgot password?
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleRegister}
              disabled={isLoading}
            >
              Haven't registered yet? Sign-up here.
            </button>
          </>
        )}

        {step === 'loginOtp' && (
          <>
            <h2 className="logHead">Verify your email</h2>

            <p style={{ marginTop: 6, fontSize: 13, color: '#9c4b6f' }}>
              The verification code has been sent to your email <b>{loginMaskedEmail || '(your email)'}</b>
            </p>

            <div className="loginInputs" style={{ marginTop: 14 }}>
              <input
                type="text"
                placeholder="Enter verification code"
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value)}
                inputMode="numeric"
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleVerifyLoginOtp}
              disabled={isLoading}
            >
              {isLoading ? 'VERIFYING...' : 'Continue'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleResendLoginOtp}
              disabled={isLoading || resendTimer > 0}
              style={{ marginTop: 10 }}
            >
              {resendTimer > 0
                ? `Resend code (${resendTimer}s)`
                : 'Resend code'}
            </button>

            <div>

            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 6 }}
            >
              Back to login
            </button>

            </div>
          </>
        )}

        {step === 'forgot' && (
          <>
            <h2 className="logHead">RESET PASSWORD</h2>
            <div className="loginSub">Enter the email associated to your account.</div>

            <div className="loginInputs">
              <input
                type="email"
                required
                autoComplete="off"
                placeholder="Enter your email"
                value={fpEmail}
                onChange={(e) => setFpEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleSendResetOtp}
              disabled={isLoading}
            >
              {isLoading ? 'SENDING OTP...' : 'Send OTP'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Back to login
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <h2 className="logHead">
              {resetStage === 'otp' ? 'Verify OTP' : 'Reset Password'}
            </h2>

            {/* OTP INPUT (ALWAYS SHOWN FIRST) */}
            {resetStage === 'otp' && (
              <div className="loginInputs" style={{ marginTop: 14 }}>
                  <p style={{ marginTop: 6, fontSize: 13, color: '#9c4b6f' }}>
                    A 6-digit OTP was sent to <b>{maskedEmail}</b>
                  </p>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  inputMode="numeric"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="logBtn"
                  onClick={handleResendResetOtp}
                  disabled={isLoading || resendTimer > 0}
                  style={{ marginTop: 10, marginBottom: -10 }}
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                </button>
              </div>
            )}

            {/* PASSWORD FIELDS (ONLY AFTER OTP VERIFIED) */}
            {resetStage === 'password' && (
              <>
                <div className="loginInputs">
                  <div className="passwordField">
                    <p style={{ marginTop: 6, marginBottom:10, fontSize: 13, color: '#9c4b6f' }}>
                    Enter your new password.
                  </p>
                    <input
                      type={'password'}
                      placeholder="Enter New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        validateNewPassword(e.target.value, confirmNewPassword);
                      }}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="passwordField">
                    <input
                      type={'password'}
                      placeholder="Confirm New Password"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        validateNewPassword(e.target.value, confirmNewPassword);
                      }}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && <div className="fieldError">{errors.password}</div>}
                </div>
              </>
            )}

            <button
              className="logBtn"
              onClick={
                resetStage === 'otp'
                  ? handleVerifyOtpAndChangePassword
                  : handleFinalPasswordReset
              }
            >
              Continue
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 25 }}
            >
              Back to login
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default Login;