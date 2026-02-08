import React, { useMemo, useState, useEffect} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';
import Toast from '../Components/Toast';

function Register({ isModal = false, onClose, onSwitchToLogin }) {
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState({});
  const [otpError, setOtpError] = useState('');
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [newMed, setNewMed] = useState({
    fname: '',
    lname: '',
    dob: '',
    gender: '',
    number: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpMeta, setOtpMeta] = useState({
    otpId: '',
    expiresAt: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
      if (resendTimer <= 0) return;
      const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }, [resendTimer]);

  const sanitizeName = (value) => value.replace(/[^a-zA-Z\s'-]/g, '');

  const sanitizePhone = (value) => {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    return digitsOnly.slice(0, 11);
  };

  const isAtLeast18 = (dobStr) => {
    if (!dobStr) return false;
    const dobDate = new Date(dobStr);
    if (Number.isNaN(dobDate.getTime())) return false;

    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age -= 1;
    return age >= 18;
  };

  const passwordChecks = useMemo(() => {
    const p = newMed.password || '';
    return {
      minLen: p.length >= 8,
      hasSpecial: /[!@#$%^&*]/.test(p),
      hasUpper: /[A-Z]/.test(p),
      hasNumber: /\d/.test(p)
    };
  }, [newMed.password]);

  const validate = (data = newMed, opts = { includeFormError: false }) => {
    const vErrors = {};
    const { fname, lname, dob, gender, number, email, username, password, confirmPassword } = data;

    const nameRegex = /^[A-Za-z]+(?:[ \-'][A-Za-z]+)*$/;
    const dobDate = new Date(dob);
    const today = new Date();
    const phoneDigits = String(number || '').replace(/\D/g, '');

    const gmailRegex = /^[^\s@]+@gmail\.com$/i;

    const allowedGenders = ['Male', 'Female', 'Others', 'Prefer not to say'];

    if (!fname || !nameRegex.test(fname)) vErrors.fname = 'First Name cannot be empty.';
    if (!lname || !nameRegex.test(lname)) vErrors.lname = 'Last Name cannot be empty.';
    if (!dob || Number.isNaN(dobDate.getTime())) vErrors.dob = 'Please enter a valid Date of Birth.';
    if (dob && !Number.isNaN(dobDate.getTime()) && dobDate > today) vErrors.dob = 'Date of Birth cannot be in the future.';
    if (dob && !Number.isNaN(dobDate.getTime()) && !isAtLeast18(dob)) vErrors.dob = 'You must be at least 18 years old.';
    if (!allowedGenders.includes(gender)) vErrors.gender = 'Please select a valid gender.';
    if (!number) vErrors.number = 'Mobile number is required.';
    if (number && phoneDigits !== String(number)) vErrors.number = 'Mobile number must contain numbers only.';
    if (number && phoneDigits.length !== 11) vErrors.number = 'Mobile number must be exactly 11 digits.';
    if (number && phoneDigits.length >= 2 && !phoneDigits.startsWith('09')) vErrors.number = 'Mobile number must start with 09.';

    if (!email) {
      vErrors.email = 'Email is required.';
    } else if (/\s/.test(email)) {
      vErrors.email = 'Email must not contain spaces.';
    } else if (!gmailRegex.test(String(email))) {
      vErrors.email = 'Please enter a valid Gmail address (example@gmail.com).';
    }

    if (!username || username.length < 8) vErrors.username = 'Username must be at least 8 characters long.';

    if (!password) {
      vErrors.password = 'Password is required.'; } 
    if (password !== confirmPassword) vErrors.confirmPassword = 'Passwords do not match.';

    if (opts.includeFormError) {
      if (!fname || !lname || !dob || !gender || !number || !email || !username || !password || !confirmPassword) {
        vErrors.form = 'Please fill in all fields.';
      }
    }

    return vErrors;
  };

  const BackToRegistration = () => {
    setStep('form');
    setOtp('');
    setOtpError('');
  }

  const handleChange = (field) => (e) => {
    let val = e.target.value;

    if (field === 'fname' || field === 'lname') val = sanitizeName(val);

    if (field === 'number') {
      val = sanitizePhone(val);
    }

    if (field === 'email') {
      val = String(val).replace(/\s/g, '');
    }

    setNewMed((prev) => ({ ...prev, [field]: val }));
    setTouched((prev) => ({ ...prev, [field]: true }));

    const fieldErrors = validate({ ...newMed, [field]: val }, { includeFormError: false });
    setErrors(fieldErrors);
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
    }
  };

  const handleDobChange = (e) => {
    const val = e.target.value;
    setNewMed((prev) => ({ ...prev, dob: val }));
    setTouched((prev) => ({ ...prev, dob: true }));

    const fieldErrors = validate({ ...newMed, dob: val }, { includeFormError: false });
    setErrors(fieldErrors);
  };

  const medData = useMemo(
    () => ({
      fname: newMed.fname.trim(),
      lname: newMed.lname.trim(),
      dob: newMed.dob,
      gender: newMed.gender.trim(),
      number: newMed.number.trim(),
      email: newMed.email.trim().toLowerCase(),
      username: newMed.username.trim(),
      password: newMed.password
    }),
    [newMed]
  );

  const handleCreateMed = async () => {
    setSubmitted(true);

    const fieldErrors = validate(newMed, { includeFormError: true });
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await axios.post('http://localhost:8000/api/auth/request-email-otp', {
        email: medData.email,
        purpose: 'register'
      });

      setOtpMeta({
        otpId: res.data?.otpId || '',
        expiresAt: res.data?.expiresAt || ''
      });

      setMaskedEmail(res.data?.maskedEmail || medData.email);
      setStep('verify');
      setResendTimer(60);
      setOtp('');
      setOtpError('');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to send verification code.';
      setToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otp.trim()) {
      setOtpError('Please enter the verification code.');
      return;
    }
    if (!otpMeta.otpId) {
      setToast('Missing OTP session. Please resend code.');
      return;
    }

    try {
      setIsSubmitting(true);

      await axios.post('http://localhost:8000/api/auth/verify-email-otp-and-register', {
        otpId: otpMeta.otpId,
        code: otp.trim(),
        medData
      });

      setNewMed({
        fname: '',
        lname: '',
        dob: '',
        gender: '',
        number: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
      });

      setTouched({});
      setErrors({});
      setSubmitted(false);

      setOtp('');
      setResendTimer(60);
      setOtpMeta({ otpId: '', expiresAt: '' });
      setMaskedEmail('');
      setStep('form');

      setToast('Account registered successfully!');

      if (isModal && onSwitchToLogin) {
        onSwitchToLogin();
        return;
      }

      navigate('/login');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Verification failed. Please try again.';
      setToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsSubmitting(true);

      const res = await axios.post('http://localhost:8000/api/auth/resend-email-otp', {
        email: medData.email,
        purpose: 'register'
      });

      setOtpMeta({
        otpId: res.data?.otpId || otpMeta.otpId,
        expiresAt: res.data?.expiresAt || ''
      });

      setMaskedEmail(res.data?.maskedEmail || medData.email);
      setToast('Verification code resent!');
      setResendTimer(60);
      setOtpError('');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend code.';
      setToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (isModal && onSwitchToLogin) {
      onSwitchToLogin();
      return;
    }
    navigate('/login');
  };

  const showFieldError = (field) => touched[field] && errors[field];
  const showFormError = submitted && errors.form;

  return (
    <>
      <div className={isModal ? 'authModalBody' : 'theBody'}>
        <div className={isModal ? 'authModalCardInner' : 'regMainCont'}>
          {step === 'form' && (
            <>
              <h2 className="logHead">SIGN UP</h2>
              <div className="loginSub">CREATE AN ACCOUNT.</div>

              <div className="loginInputs">
                <input
                  type="text"
                  placeholder="First Name"
                  value={newMed.fname}
                  onChange={handleChange('fname')}
                />
                {showFieldError('fname') && <div className="fieldError">{errors.fname}</div>}

                <input
                  type="text"
                  placeholder="Last Name"
                  value={newMed.lname}
                  onChange={handleChange('lname')}
                />
                {showFieldError('lname') && <div className="fieldError">{errors.lname}</div>}

                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={newMed.dob}
                  onChange={handleDobChange}
                />
                {showFieldError('dob') && <div className="fieldError">{errors.dob}</div>}

                <select value={newMed.gender} onChange={handleChange('gender')} className="regSelect">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                {showFieldError('gender') && <div className="fieldError">{errors.gender}</div>}

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Phone Number"
                  value={newMed.number}
                  onChange={handleChange('number')}
                  maxLength={11}
                />
                {showFieldError('number') && <div className="fieldError">{errors.number}</div>}

                <input
                  type="email"
                  placeholder="Email"
                  value={newMed.email}
                  onChange={handleChange('email')}
                  onKeyDown={handleEmailKeyDown}
                />
                {showFieldError('email') && <div className="fieldError">{errors.email}</div>}

                <input
                  type="text"
                  placeholder="Username"
                  value={newMed.username}
                  onChange={handleChange('username')}
                />
                {showFieldError('username') && <div className="fieldError">{errors.username}</div>}

                <input
                  type="password"
                  placeholder="Password"
                  value={newMed.password}
                  onChange={handleChange('password')}
                />
                {showFieldError('password') && <div className="fieldError">{errors.password}</div>}

                <div>
                  {!passwordChecks.minLen && (<div className="fieldError"> • At least 8 characters</div>)}
                  {!passwordChecks.hasUpper && (<div className="fieldError"> • One capital letter</div>)}
                  {!passwordChecks.hasNumber && (<div className="fieldError"> • One number</div>)}
                  {!passwordChecks.hasSpecial && (<div className="fieldError"> • One special character (!@#$%^&*)</div>)}
                </div>

                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={newMed.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                />
                {showFieldError('confirmPassword') && (
                  <div className="fieldError">{errors.confirmPassword}</div>
                )}
              </div>

              <button type="button" className="logBtn" onClick={handleCreateMed} disabled={isSubmitting}>
                {isSubmitting ? 'VERIFYING...' : 'SIGN-UP'}
              </button>

              {showFormError && <div className="formError">{errors.form}</div>}

              <button
                type="button"
                className="registerTextBtn"
                onClick={handleBackToLogin}
                disabled={isSubmitting}
              >
                Already have an account? Sign-in here.
              </button>
            </>
          )}

          {step === 'verify' && (
            <>
              <h2 className="logHead">Verify your email</h2>

              <p style={{ marginTop: 6, fontSize: 13, color: '#9c4b6f' }}>
                The verification code has been sent to your email <b>{maskedEmail}</b>
              </p>

              <div className="loginInputs" style={{ marginTop: 14 }}>
                <input
                  type="text"
                  placeholder="Enter verification code"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setOtpError('');
                  }}
                  inputMode="numeric"
                />
                {otpError && <div className="fieldError">{otpError}</div>}
              </div>

              <button
                  type="button"
                  className="registerTextBtn"
                  onClick={handleResend}
                  disabled={isSubmitting || resendTimer > 0}
                  style={{ marginTop: 10 }}
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                </button>

              <button type="button" className="logBtn" onClick={handleVerifyAndRegister} disabled={isSubmitting}>
                {isSubmitting ? 'VERIFYING...' : 'Verify'}
              </button>

              <button
                type="button"
                className="registerTextBtn"
                onClick={BackToRegistration}
                disabled={isSubmitting}
                style={{ marginTop: 10 }}
              >
                Back to Registration
              </button>
            </>
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast('')} />
    </>
  );
}

export default Register;
