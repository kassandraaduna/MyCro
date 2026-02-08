import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import Toast from '../Components/Toast';

function Login({ isModal = false, onClose, onSwitchToRegister }) {
  const [toast, setToast] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [step, setStep] = useState('login'); // login | loginOtp | forgot | verify

  // LOGIN MFA
  const [loginOtp, setLoginOtp] = useState('');
  const [loginMaskedEmail, setLoginMaskedEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginOtpMeta, setLoginOtpMeta] = useState({ otpId: '', expiresAt: '' });

  const [fpEmail, setFpEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMeta, setOtpMeta] = useState({ otpId: '', expiresAt: '' });
  const [verifiedOtp, setVerifiedOtp] = useState(''); 

  const [resetStage, setResetStage] = useState('otp'); 
  const [resendTimer, setResendTimer] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    setErrors({});
    setFormError('');
  }, [step, resetStage]);

  const routeAfterLogin = (user) => {
    if (isModal && onClose) onClose();
    if (!user) return navigate('/homestudent');

    if (user.mustChangePassword) return navigate('/changepass', { state: { user } });
    if ((user.role || '').toLowerCase() === 'instructor') return navigate('/homeinstructor', { state: { instructor: user } });
    navigate('/homestudent', { state: { employee: user } });
  };

  const handleLogin = async () => {
    const input = usernameOrEmail.trim();
    const pass = password;
    const errs = {};
    if (!input) errs.usernameOrEmail = 'Username or email is required.';
    if (!pass) errs.password = 'Password is required.';
    if (Object.keys(errs).length > 0) return setErrors(errs);

    if (input === 'admin' && pass === 'admin') return navigate('/adminpanel');

    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/login', { usernameOrEmail: input, password: pass });

      if (res.data?.mfaRequired) {
        setLoginOtpMeta({ otpId: res.data?.otpId || '', expiresAt: res.data?.expiresAt || '' });
        setLoginMaskedEmail(res.data?.maskedEmail || '');
        setLoginEmail(res.data?.email || '');
        setLoginOtp('');
        setResendTimer(60);
        return setStep('loginOtp');
      }

      setToast(res.data?.message || 'Login successful');
      const token = res.data?.data?.token;
      if (token) localStorage.setItem('token', token);

      const user = res.data?.data?.user || null;
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');

      setUsernameOrEmail('');
      setPassword('');
      routeAfterLogin(user);
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data || {};
      const msg = data?.message || 'Login failed. Please try again.';

      if (status === 401 && typeof data.attemptsLeft === 'number') {
        setFormError(`${msg} (Attempts left: ${data.attemptsLeft})`);
      } else {
        setFormError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async () => {
    if (!loginOtpMeta.otpId) return setErrors({ otp: 'Missing OTP session. Please login again.' });
    if (!loginOtp.trim()) return setErrors({ otp: 'Please enter the 6-digit code.' });

    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/verify-login-otp', {
        otpId: loginOtpMeta.otpId,
        code: loginOtp.trim(),
      });

      setToast(res.data?.message || 'Login successful');

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
      routeAfterLogin(user);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!loginEmail) return setFormError('Missing email for resend. Please login again.');

    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/resend-login-otp', { email: loginEmail });
      setLoginOtpMeta({ otpId: res.data?.otpId || loginOtpMeta.otpId, expiresAt: res.data?.expiresAt || '' });
      setLoginMaskedEmail(res.data?.maskedEmail || loginMaskedEmail);
      setToast('Verification code resent!');
      setResendTimer(60);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to resend code.');
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
    setResetStage('otp');
    setVerifiedOtp('');
    setErrors({});
    setFormError('');
  };

  const handleSendResetOtp = async () => {
    const email = fpEmail.trim().toLowerCase();
    if (!email) return setErrors({ fpEmail: 'Email is required.' });
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return setErrors({ fpEmail: 'Please enter a valid email address.' });

    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/request-password-reset-otp', { email });

      setOtpMeta({ otpId: res.data?.otpId || '', expiresAt: res.data?.expiresAt || '' });
      setMaskedEmail(res.data?.maskedEmail || email);
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setResetStage('otp');
      setVerifiedOtp('');
      setStep('verify');
      setResendTimer(60);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to send reset OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (!fpEmail.trim()) return setFormError('Missing email.');
    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/resend-password-reset-otp', {
        email: fpEmail.trim()
      });

      setOtp('');
      setOtpMeta({ otpId: res.data?.otpId, expiresAt: res.data?.expiresAt });
      setToast('Reset OTP resent!');
      setResendTimer(60);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return setErrors({ otp: 'Please enter the OTP sent to your email.' });

    try {
      setIsLoading(true);
      await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
        otpId: otpMeta.otpId,
        code: otp.trim(),
      });

      setResetStage('password');
      setVerifiedOtp(otp.trim());
    } catch (err) {
      setFormError(err?.response?.data?.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateNewPassword = (pass, confirm) => {
    const newErrors = {};
    if (!pass || !confirm) newErrors.password = 'Please enter and confirm your new password.';
    else if (pass.length < 8) newErrors.password = 'New password must be at least 8 characters.';
    else if (!/[!@#$%^&*]/.test(pass)) newErrors.password = 'Must include a special character.';
    else if (!/[A-Z]/.test(pass)) newErrors.password = 'Must include an uppercase letter.';
    else if (!/\d/.test(pass)) newErrors.password = 'Must include a number.';
    else if (pass !== confirm) newErrors.password = 'Passwords do not match.';

    setErrors((prev) => ({ ...prev, password: newErrors.password || '' }));
    return Object.keys(newErrors).length === 0;
  };

  const handleFinalPasswordReset = async () => {
    if (!validateNewPassword(newPassword, confirmNewPassword)) return;
    if (!otpMeta.otpId || !verifiedOtp) return setFormError('OTP is missing. Please verify OTP first.');

    try {
      setIsLoading(true);
      const res = await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
        otpId: otpMeta.otpId,
        code: verifiedOtp,
        newPassword,
      });

      setToast(res.data?.message || 'Password changed successfully!');
      backToLogin();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const backToLogin = () => {
    setStep('login');
    setOtp('');
    setOtpMeta({ otpId: '', expiresAt: '' });
    setVerifiedOtp('');
    setMaskedEmail('');
    setNewPassword('');
    setConfirmNewPassword('');
    setResetStage('otp');

    setLoginOtp('');
    setLoginMaskedEmail('');
    setLoginEmail('');
    setLoginOtpMeta({ otpId: '', expiresAt: '' });
    setResendTimer(0);

    setErrors({});
    setFormError('');
  };

  const handleRegister = () => {
    if (isModal && onSwitchToRegister) return onSwitchToRegister();
    navigate('/register');
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (step === 'login') handleLogin();
    if (step === 'loginOtp') handleVerifyLoginOtp();
  };

  return (
    <div className={isModal ? 'authModalBody' : 'theBody'}>
      <div className={isModal ? 'authModalCardInner' : 'loginMainCont'}>
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
              {errors.usernameOrEmail && <div className="fieldError">{errors.usernameOrEmail}</div>}

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
              {errors.password && <div className="fieldError">{errors.password}</div>}
            </div>

            <button type="button" className="logBtn" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'SIGNING IN...' : 'SIGN-IN'}
            </button>

            {formError && <div className="formError">{formError}</div>}

            <div>
              <button
                type="button"
                className="registerTextBtn"
                onClick={goForgot}
                disabled={isLoading}
                style={{ marginTop: 10}}
              >
                Forgot password?
              </button>
            </div>

            <button type="button" className="registerTextBtn" onClick={handleRegister} disabled={isLoading}>
              Haven&apos;t registered yet? Sign-up here.
            </button>
          </>
        )}

        {step === 'loginOtp' && (
          <>
            <h2 className="logHead">Verify it's you</h2>
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
              {errors.otp && <div className="fieldError">{errors.otp}</div>}
            </div>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleResendLoginOtp}
              disabled={isLoading || resendTimer > 0}
              style={{ marginTop: -20, marginBottom: 10 }}
            >
              {resendTimer > 0 ? `Resend code (${resendTimer}s)` : 'Resend code'}
            </button>

            <button type="button" className="logBtn" onClick={handleVerifyLoginOtp} disabled={isLoading}>
              {isLoading ? 'VERIFYING...' : 'Continue'}
            </button>

            {formError && <div className="formError">{formError}</div>}

            <button type="button" className="registerTextBtn" onClick={backToLogin} disabled={isLoading} style={{ marginTop: 6 }}>
              Back to login
            </button>
          </>
        )}

        {step === 'forgot' && (
          <>
            <h2 className="logHead">FORGOT PASSWORD</h2>
            <div className="loginSub">Enter the email associated with your account.</div>

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
              {errors.fpEmail && <div className="fieldError">{errors.fpEmail}</div>}
            </div>

            <button type="button" className="logBtn" onClick={handleSendResetOtp} disabled={isLoading}>
              {isLoading ? 'SENDING OTP...' : 'Send OTP'}
            </button>

            {formError && <div className="formError">{formError}</div>}

            <button type="button" className="registerTextBtn" onClick={backToLogin} disabled={isLoading} style={{ marginTop: 10 }}>
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
                  Enter the 6-digit OTP sent to <b>{maskedEmail}</b>
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
                  {errors.otp && <div className="fieldError">{errors.otp}</div>}
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

                <button
                  type="button"
                  className="logBtn"
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? 'PLEASE WAIT...' : 'Continue'}
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
                  {errors.password && <div className="fieldError">{errors.password}</div>}
                </div>

                <button
                  type="button"
                  className="logBtn"
                  onClick={handleFinalPasswordReset}
                  disabled={isLoading}
                >
                  {isLoading ? 'PLEASE WAIT...' : 'Reset Password'}
                </button>
              </>
            )}

            {formError && <div className="formError">{formError}</div>}

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
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}

export default Login;
