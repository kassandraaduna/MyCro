import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Register.css';

function Register({ isModal = false, onClose, onSwitchToLogin }) {
  const [newMed, setNewMed] = useState({
    fname: "",
    lname: "",
    dob: "",
    gender: "",
    number: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [step, setStep] = useState('form');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpMeta, setOtpMeta] = useState({
    otpId: '',
    expiresAt: '',
  });

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agree, setAgree] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location?.state?.showDisclaimer) {
      setShowDisclaimer(true);
      setAgree(false);
      setDisclaimerAccepted(false);
      navigate('/Register', { replace: true, state: {} });
    }
  }, [location, navigate]);

  const sanitizeName = (value) => value.replace(/[^a-zA-Z\s'-]/g, '');

  const sanitizePhone = (value) => {
    const digitsOnly = String(value || '').replace(/\D/g, '');
    return digitsOnly.slice(0, 11);
  };

  const handleChange = (field) => (e) => {
    let val = e.target.value;

    if (field === 'fname' || field === 'lname') {
      val = sanitizeName(val);
    }

    if (field === 'number') {
      val = sanitizePhone(val);
    }

    setNewMed((prev) => ({
      ...prev,
      [field]: val
    }));
  };

  const computeAge = (dobStr) => {
    const dobDate = new Date(dobStr);
    if (Number.isNaN(dobDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age -= 1;
    return age;
  };

  const validate = () => {
    const {
      fname,
      lname,
      dob,
      gender,
      number,
      email,
      username,
      password,
      confirmPassword
    } = newMed;

    const trimmedFname = fname.trim();
    const trimmedLname = lname.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const trimmedGender = gender.trim();
    const trimmedNumber = number.trim();

    if (
      !trimmedFname ||
      !trimmedLname ||
      !dob ||
      !trimmedGender ||
      !trimmedNumber ||
      !trimmedEmail ||
      !trimmedUsername ||
      !password ||
      !confirmPassword
    ) {
      return 'Please fill all required fields.';
    }

    const nameRegex = /^[A-Za-z]+(?:[ \-'][A-Za-z]+)*$/;
    if (!nameRegex.test(trimmedFname)) {
      return "First Name must contain letters only (spaces, hyphen '-', apostrophe ' allowed).";
    }
    if (!nameRegex.test(trimmedLname)) {
      return "Last Name must contain letters only (spaces, hyphen '-', apostrophe ' allowed).";
    }

    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      return 'Please enter a valid Date of Birth.';
    }

    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dob0 = new Date(dobDate.getFullYear(), dobDate.getMonth(), dobDate.getDate());

    if (dob0 > today0) {
      return 'Date of Birth cannot be in the future.';
    }

    const age = computeAge(dob);
    if (age === null) return 'Please enter a valid Date of Birth.';
    if (age < 18) return 'You must be at least 18 years old to register.';

    const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
    if (!allowedGenders.includes(trimmedGender)) {
      return 'Please select a valid gender.';
    }

    const phoneDigits = trimmedNumber.replace(/\D/g, '');
    if (phoneDigits !== trimmedNumber) {
      return 'Phone number must contain numbers only.';
    }
    if (phoneDigits.length !== 11) {
      return 'Phone number must be exactly 11 digits.';
    }

    const emailRegex = /@gmail\.com$/;
    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }

    if (trimmedUsername.length < 8) {
      return 'Username must be at least 8 characters long.';
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    const specialCharRegex = /[!@#$%^&*]/;
    if (!specialCharRegex.test(password)) {
      return 'Password must contain at least one special character.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  };

  const medData = useMemo(() => ({
    fname: newMed.fname.trim(),
    lname: newMed.lname.trim(),
    dob: newMed.dob,
    gender: newMed.gender.trim(),
    number: newMed.number.trim(),
    email: newMed.email.trim(),
    username: newMed.username.trim(),
    password: newMed.password
  }), [newMed]);

  const handleCreateMed = async () => {
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
      setAgree(false);
      return;
    }

    const errorMsg = validate();
    if (errorMsg) {
      alert(errorMsg);
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
      setOtp('');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to send verification code.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueDisclaimer = () => {
    if (!agree) return;
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
  };

  const handleVerifyAndRegister = async () => {
    if (!otp.trim()) {
      alert('Please enter the verification code.');
      return;
    }
    if (!otpMeta.otpId) {
      alert('Missing OTP session. Please resend code.');
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
        fname: "",
        lname: "",
        dob: "",
        gender: "",
        number: "",
        email: "",
        username: "",
        password: "",
        confirmPassword: ""
      });

      setOtp('');
      setOtpMeta({ otpId: '', expiresAt: '' });
      setMaskedEmail('');
      setStep('form');

      setDisclaimerAccepted(false);
      setAgree(false);

      alert("Account registered successfully!");

      if (isModal && onSwitchToLogin) {
        onSwitchToLogin();
        return;
      }

      navigate('/Login');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Verification failed. Please try again.';
      alert(msg);
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
      alert('Verification code resent!');
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to resend code.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (isModal && onSwitchToLogin) {
      onSwitchToLogin();
      return;
    }
    navigate('/Login');
  };

  const ageHint = useMemo(() => {
    if (!newMed.dob) return '';
    const age = computeAge(newMed.dob);
    if (age === null) return '';
    return age < 18 ? `Age: ${age} (must be 18+)` : `Age: ${age}`;
  }, [newMed.dob]);

  return (
    <div className={isModal ? 'authModalBody' : 'theBody'}>
      <div className={isModal ? 'authModalCardInner' : 'regMainCont'} >

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

              <input
                type="text"
                placeholder="Last Name"
                value={newMed.lname}
                onChange={handleChange('lname')}
              />

              <input
                type="date"
                placeholder="Date of Birth"
                value={newMed.dob}
                onChange={handleChange('dob')}
              />
              {ageHint ? (
                <div style={{ fontSize: 12, fontWeight: 800, color: ageHint.includes('must be 18+') ? '#b00020' : '#1b5e20' }}>
                  {ageHint}
                </div>
              ) : null}

              <select
                value={newMed.gender}
                onChange={handleChange('gender')}
                className="regSelect"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>

              <input
                type="text"
                inputMode="numeric"
                placeholder="Phone Number (11 digits)"
                value={newMed.number}
                onChange={handleChange('number')}
                maxLength={11}
              />

              <input
                type="email"
                placeholder="Email"
                value={newMed.email}
                onChange={handleChange('email')}
              />

              <input
                type="text"
                placeholder="Username"
                value={newMed.username}
                onChange={handleChange('username')}
              />

              <input
                type="password"
                placeholder="Password"
                value={newMed.password}
                onChange={handleChange('password')}
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={newMed.confirmPassword}
                onChange={handleChange('confirmPassword')}
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleCreateMed}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'SENDING CODE...' : 'SIGN-UP'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleBackToLogin}
              disabled={isSubmitting}
            >
              Already have an account? Sign-in here.
            </button>

            {showDisclaimer && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 18,
                  zIndex: 9999,
                }}
                onClick={() => {
                  if (!isSubmitting) setShowDisclaimer(false);
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 360,
                    background: '#fff',
                    borderRadius: 14,
                    padding: '22px 18px',
                    border: '1px solid rgba(0,0,0,0.12)',
                    boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
                    textAlign: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontWeight: 900, letterSpacing: 0.8, marginBottom: 14 }}>
                    DISCLAIMER
                  </div>

                  <div style={{ fontSize: 12, lineHeight: 1.35, fontWeight: 700, padding: '0 10px' }}>
                    THIS APPLICATION IS INTENDED TO BE AN AI FOR LEARNING ONLY AND IS NOT DESIGNED
                    FOR CLINICAL DIAGNOSIS OR MEDICAL DECISION-MAKING NOR INTENDED TO REPLACE
                    TRADITIONAL CLASSROOM AND LABORATORY LEARNING PRACTICES.
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      disabled={isSubmitting}
                      style={{ width: 18, height: 18 }}
                    />
                    <div style={{ fontSize: 12, fontWeight: 800 }}>
                      I UNDERSTAND AND AGREE
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleContinueDisclaimer}
                    disabled={!agree || isSubmitting}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.2)',
                      background: '#fff',
                      fontWeight: 900,
                      cursor: !agree || isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    CONTINUE
                  </button>
                </div>
              </div>
            )}
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
                onChange={(e) => setOtp(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <button
              type="button"
              className="logBtn"
              onClick={handleVerifyAndRegister}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'VERIFYING...' : 'Continue'}
            </button>

            <button
              type="button"
              className="registerTextBtn"
              onClick={handleResend}
              disabled={isSubmitting}
              style={{ marginTop: 10 }}
            >
              Resend code
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
