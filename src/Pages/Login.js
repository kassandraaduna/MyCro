import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [step, setStep] = useState('login'); // login | loginOtp | forgot | verify

  // LOGIN MFA
  const [loginOtp, setLoginOtp] = useState('');
  const [loginMaskedEmail, setLoginMaskedEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtpMeta, setLoginOtpMeta] = useState({ otpId: '', expiresAt: '' });

  // FORGOT PASSWORD
  const [fpEmail, setFpEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMeta, setOtpMeta] = useState({ otpId: '', expiresAt: '' });

  const [resetStage, setResetStage] = useState('otp'); // otp | password
  const [resendTimer, setResendTimer] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  // timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ✅ CLEAR ERRORS kapag nagpapalit ng step/resetStage para walang lumalabas na validation agad
  useEffect(() => {
    setErrors({});
    setFormError('');
  }, [step, resetStage]);

  const handleLogin = async () => {
    const userInput = usernameOrEmail.trim();
    const passInput = password;

    const newErrors = {};
    if (!userInput) newErrors.usernameOrEmail = 'Username or email is required.';
    if (!passInput) newErrors.password = 'Password is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError('');
      return;
    }

    setErrors({});
    setFormError('');

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

      // MFA required
      if (res.data?.mfaRequired) {
        setLoginOtpMeta({
          otpId: res.data?.otpId || '',
          expiresAt: res.data?.expiresAt || '',
        });
        setLoginMaskedEmail(res.data?.maskedEmail || '');
        setLoginEmail(res.data?.email || '');
        setLoginOtp('');
        setResendTimer(60);
        setStep('loginOtp');
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
      const msg = error?.response?.data?.message || 'Login failed. Please try again.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async () => {
    const newErrors = {};
    if (!loginOtpMeta.otpId) newErrors.otp = 'Missing OTP session. Please login again.';
    if (!loginOtp.trim()) newErrors.otp = 'Please enter the 6-digit code.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setFormError('');
      return;
    }

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

      // clear login otp state
      setLoginOtp('');
      setLoginMaskedEmail('');
      setLoginEmail('');
      setLoginOtpMeta({ otpId: '', expiresAt: '' });

      setUsernameOrEmail('');
      setPassword('');

      setStep('login');

      navigate('/Homepage', { state: { employee: user } });
    } catch (error) {
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
    setErrors({});
    setFormError('');

    if (!loginEmail) {
      setFormError('Missing email for resend. Please login again.');
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
    if (e.key !== 'Enter') return;
    if (step === 'login') handleLogin();
    if (step === 'loginOtp') handleVerifyLoginOtp();
  };

  const validateNewPassword = (pass, confirm) => {
    const newErrors = {};

    if (!pass || !confirm) {
      newErrors.password = 'Please enter and confirm your new password.';
    } else if (pass.length < 8) {
      newErrors.password = 'New password must be at least 8 characters long.';
    } else if (!/[!@#$%^&*]/.test(pass)) {
      newErrors.password = 'Must include a special character.';
    } else if (pass !== confirm) {
      newErrors.password = 'Passwords do not match.';
    }

    setErrors((prev) => ({ ...prev, password: newErrors.password || '' }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetOtp = async () => {
    setErrors({});
    setFormError('');

    const email = fpEmail.trim().toLowerCase();

    if (!email) {
      setErrors({ fpEmail: 'Email is required.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ fpEmail: 'Please enter a valid email address.' });
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

      // reset fields
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetStage('otp');
      setStep('verify');
      setResendTimer(60);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to send reset code.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    setErrors({});
    setFormError('');

    const email = fpEmail.trim().toLowerCase();
    if (!email) {
      setFormError('Missing email. Please go back.');
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
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend reset code.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX: wag na i-call backend dito (para di ma-consume OTP)
  const handleProceedToPasswordStage = () => {
    setErrors({});
    setFormError('');

    const newErrors = {};
    if (!otpMeta.otpId) newErrors.otp = 'Missing OTP session. Please resend OTP.';
    if (!otp.trim()) newErrors.otp = 'Please enter the 6-digit OTP sent to your email.';
    if (otp.trim().length !== 6) newErrors.otp = 'OTP must be 6 digits.';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // proceed only (final verification happens on final submit)
    setResetStage('password');
  };

  // ✅ dito lang tatawag once: verify otp + set password
  const handleFinalPasswordReset = async () => {
    setFormError('');

    const isValid = validateNewPassword(newPassword, confirmNewPassword);
    if (!isValid) return;

    // safety: ensure otp exists
    if (!otpMeta.otpId || !otp.trim()) {
      setErrors({ otp: 'Missing OTP. Please request reset again.' });
      return;
    }

    try {
      setIsLoading(true);

      await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
        otpId: otpMeta.otpId,
        code: otp.trim(),
        newPassword,
      });

      alert('Password changed successfully! You can login now.');

      // reset all forgot state
      setStep('login');
      setResetStage('otp');
      setFpEmail('');
      setMaskedEmail('');
      setOtp('');
      setOtpMeta({ otpId: '', expiresAt: '' });
      setNewPassword('');
      setConfirmNewPassword('');
      setErrors({});
      setFormError('');
    } catch (error) {
      const msg = error?.response?.data?.message || 'Password reset failed.';
      setFormError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const goForgot = () => {
    setErrors({});
    setFormError('');
    setStep('forgot');
    setFpEmail(usernameOrEmail.trim());
    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setMaskedEmail('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetStage('otp');
  };

  const backToLogin = () => {
    setErrors({});
    setFormError('');
    setStep('login');

    // reset forgot
    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setMaskedEmail('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetStage('otp');

    // reset login otp
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
                autoComplete="off"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => {
                  setUsernameOrEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, usernameOrEmail: '' }));
                  setFormError('');
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {errors.usernameOrEmail ? <div className="fieldError">{errors.usernameOrEmail}</div> : null}

              <input
                type="password"
                autoComplete="off"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: '' }));
                  setFormError('');
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {errors.password ? <div className="fieldError">{errors.password}</div> : null}
            </div>

            <button type="button" className="logBtn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'SIGNING IN...' : 'SIGN-IN'}
            </button>

            {formError ? <div className="formError">{formError}</div> : null}

            <button
              type="button"
              className="registerTextBtn"
              onClick={goForgot}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Forgot password?
            </button>

            <button type="button" className="registerTextBtn" onClick={handleRegister} disabled={isLoading}>
              Haven&apos;t registered yet? Sign-up here.
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
                onChange={(e) => {
                  setLoginOtp(e.target.value);
                  setErrors((prev) => ({ ...prev, otp: '' }));
                  setFormError('');
                }}
                inputMode="numeric"
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              {errors.otp ? <div className="fieldError">{errors.otp}</div> : null}
            </div>

            <button type="button" className="logBtn" onClick={handleVerifyLoginOtp} disabled={isLoading}>
              {isLoading ? 'VERIFYING...' : 'Continue'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleResendLoginOtp}
              disabled={isLoading || resendTimer > 0}
              style={{ marginTop: 10 }}
            >
              {resendTimer > 0 ? `Resend code (${resendTimer}s)` : 'Resend code'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 6 }}
            >
              Back to login
            </button>

            {formError ? <div className="formError">{formError}</div> : null}
          </>
        )}

        {step === 'forgot' && (
          <>
            <h2 className="logHead">RESET PASSWORD</h2>
            <div className="loginSub">Enter the email associated to your account.</div>

            <div className="loginInputs">
              <input
                type="email"
                autoComplete="off"
                placeholder="Enter your email"
                value={fpEmail}
                onChange={(e) => {
                  setFpEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, fpEmail: '' }));
                  setFormError('');
                }}
                disabled={isLoading}
              />
              {errors.fpEmail ? <div className="fieldError">{errors.fpEmail}</div> : null}
            </div>

            <button type="button" className="logBtn" onClick={handleSendResetOtp} disabled={isLoading}>
              {isLoading ? 'SENDING OTP...' : 'Send OTP'}
            </button>

            {formError ? <div className="formError">{formError}</div> : null}

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
            <h2 className="logHead">{resetStage === 'otp' ? 'Verify OTP' : 'Reset Password'}</h2>

            {resetStage === 'otp' && (
              <>
                <p style={{ marginTop: 6, fontSize: 13, color: '#9c4b6f' }}>
                  A 6-digit OTP was sent to <b>{maskedEmail}</b>
                </p>

                <div className="loginInputs" style={{ marginTop: 14 }}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setErrors((prev) => ({ ...prev, otp: '' }));
                      setFormError('');
                    }}
                    inputMode="numeric"
                    disabled={isLoading}
                  />
                  {errors.otp ? <div className="fieldError">{errors.otp}</div> : null}
                </div>

                <button
                  type="button"
                  className="registerTextBtn"
                  onClick={handleResendResetOtp}
                  disabled={isLoading || resendTimer > 0}
                  style={{ marginTop: 10 }}
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                </button>
              </>
            )}

            {resetStage === 'password' && (
              <>
                <p style={{ marginTop: 6, marginBottom: 10, fontSize: 13, color: '#9c4b6f' }}>
                  Enter your new password.
                </p>

                <div className="loginInputs">
                  <input
                    type="password"
                    placeholder="Enter New Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: '' }));
                      setFormError('');
                    }}
                    disabled={isLoading}
                  />

                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, password: '' }));
                      setFormError('');
                    }}
                    disabled={isLoading}
                  />

                  {errors.password ? <div className="fieldError">{errors.password}</div> : null}
                </div>
              </>
            )}

            <button
              type="button"
              className="logBtn"
              onClick={resetStage === 'otp' ? handleProceedToPasswordStage : handleFinalPasswordReset}
              disabled={isLoading}
            >
              {isLoading ? 'PLEASE WAIT...' : 'Continue'}
            </button>

            {formError ? <div className="formError">{formError}</div> : null}

            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 14 }}
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
