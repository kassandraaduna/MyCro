import React, { useState } from 'react';
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

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const navigate = useNavigate();

  const handleLogin = async () => {
    const userInput = usernameOrEmail.trim();
    const passInput = password;

    if (!userInput || !passInput) {
      alert('Please enter your username/email and password.');
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
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Verify OTP for Login (MFA)
  const handleVerifyLoginOtp = async () => {
    if (!loginOtpMeta.otpId) {
      alert('Missing OTP session. Please resend code.');
      return;
    }
    if (!loginOtp.trim()) {
      alert('Please enter the verification code.');
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
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!loginEmail) {
      alert('Missing email for resend. Please login again.');
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
    } catch (error) {
      console.error('RESEND LOGIN OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend code.';
      alert(msg);
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
    if (!pass || !confirm) return 'Please enter and confirm your new password.';
    if (pass.length < 8) return 'New password must be at least 8 characters long.';
    const specialCharRegex = /[!@#$%^&*]/;
    if (!specialCharRegex.test(pass)) return 'New password must contain at least one special character.';
    if (pass !== confirm) return 'Passwords do not match.';
    return null;
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

  const handleVerifyResetAndChangePassword = async () => {
    if (!otpMeta.otpId) {
      alert('Missing OTP session. Please resend code.');
      return;
    }

    if (!otp.trim()) {
      alert('Please enter the verification code.');
      return;
    }

    const errMsg = validateNewPassword(newPassword, confirmNewPassword);
    if (errMsg) {
      alert(errMsg);
      return;
    }

    try {
      setIsLoading(true);

      await axios.post('http://localhost:8000/api/auth/verify-password-reset-otp', {
        otpId: otpMeta.otpId,
        code: otp.trim(),
        newPassword: newPassword,
      });

      alert('Password reset successful! You can login now.');

      setStep('login');
      setFpEmail('');
      setMaskedEmail('');
      setOtp('');
      setOtpMeta({ otpId: '', expiresAt: '' });
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      console.error('VERIFY RESET OTP ERROR:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Verification failed. Please try again.';
      alert(msg);
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
  };

  return (
    <div className="theBody">
      <div className="loginMainCont">

        {step === 'login' && (
          <>
            <h2 className="logHead">LOG-IN</h2>

            <div className="loginInputs">
              <input
                type="text"
                required
                autoComplete="off"
                placeholder="Username or Email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />

              <input
                type="password"
                required
                autoComplete="off"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? 'LOGGING IN...' : 'LOG-IN'}
            </button>

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
              Haven't registered yet? Register
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
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Resend code
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
            <h2 className="logHead">Forgot Password</h2>

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
              {isLoading ? 'SENDING CODE...' : 'Send OTP'}
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
            <h2 className="logHead">Verify OTP</h2>

            <p style={{ marginTop: 6, fontSize: 13, color: '#9c4b6f' }}>
              The verification code has been sent to your email <b>{maskedEmail}</b>
            </p>

            <div className="loginInputs" style={{ marginTop: 14 }}>
              <input
                type="text"
                placeholder="Enter verification code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
                disabled={isLoading}
              />

              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleVerifyResetAndChangePassword}
              disabled={isLoading}
            >
              {isLoading ? 'VERIFYING...' : 'Continue'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleResendResetOtp}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Resend code
            </button>
            
            <div>
            <button
              type="button"
              className="registerTextBtn"
              onClick={backToLogin}
              disabled={isLoading}
              style={{ marginTop: 10 }}
            >
              Back to login
            </button>
            </div>
            
          </>
          
        )}

      </div>
    </div>
  );
}

export default Login;
