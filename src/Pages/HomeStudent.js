import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './HomeStudent.css';

function HomePageStudent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [active, setActive] = useState('Dashboard');

  const [user, setUser] = useState(null);

  const [saved, setSaved] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    dob: '',
    address: '',
  });

  const [draft, setDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    dob: '',
    address: '',
  });

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editNumber, setEditNumber] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [editDob, setEditDob] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  const [passDraft, setPassDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    otpCode: '',
    otpId: '',
    maskedEmail: '',
    expiresAt: '',
  });

  const [showStayOrLogout, setShowStayOrLogout] = useState(false);

  const [profilePreview, setProfilePreview] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const [assessLoading, setAssessLoading] = useState(false);
  const [assessError, setAssessError] = useState('');
  const [assessments, setAssessments] = useState([]);

  const [assessView, setAssessView] = useState('list');
  const [selectedAssess, setSelectedAssess] = useState(null);

  const [answersMap, setAnswersMap] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  useEffect(() => {
    let u = null;

    if (location.state?.employee) {
      u = location.state.employee;
      localStorage.setItem('user', JSON.stringify(u));
    } else {
      try {
        const raw = localStorage.getItem('user');
        u = raw ? JSON.parse(raw) : null;
      } catch {
        u = null;
      }
    }

    setUser(u);
  }, [location.state]);

  useEffect(() => {
    if (!user) return;

    const base = {
      fname: user?.fname || '',
      lname: user?.lname || '',
      email: user?.email || '',
      number: user?.number || '',
      dob: user?.dob ? user.dob.slice(0, 10) : '',
      address: user?.address || '',
    };

    setSaved(base);
    setDraft(base);

    setEditName(false);
    setEditEmail(false);
    setEditNumber(false);
    setEditPassword(false);
    setEditDob(false);
    setEditAddress(false);
    setPassDraft({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      otpCode: '',
      otpId: '',
      maskedEmail: '',
      expiresAt: '',
    });
  }, [user]);

  const userId = user?._id || '';

  const usernameLabel = useMemo(() => {
    if (!user) return 'username';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'username';
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Landing');
  };

  const handleLogoutConfirm = () => {
    setShowStayOrLogout(false);
    handleLogout();
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const onDraftChange = (field) => (e) =>
    setDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPassChange = (field) => (e) =>
    setPassDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Image is too large. Max 3MB.');
      return;
    }

    setProfilePreview(URL.createObjectURL(file));
  };

  const putUpdate = async (payload) => {
    if (!userId) {
      alert('Walang userId. Mag-login ulit.');
      navigate('/Login');
      return null;
    }

    const url = `http://localhost:8000/api/meds/${userId}`;
    const res = await axios.put(url, payload);
    return res.data;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email.trim())) return 'Invalid email address.';
    return null;
  };

  const validateNumber = (number) => {
    const digits = number.replace(/[^\d]/g, '');
    if (digits.length !== 11) return 'Enter 11-digit mobile number.';
    return null;
  };

  const validatePassword = () => {
    const { currentPassword, newPassword, confirmNewPassword } = passDraft;
    if (!currentPassword) return 'Enter your current password.';
    if (!newPassword) return 'Enter your new password.';
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (!/[!@#$%^&*]/.test(newPassword)) return 'Must contain a special character (!@#$%^&*).';
    if (!/[A-Z]/.test(newPassword)) return 'Must contain at least one CAPITAL letter.';
    if (!/\d/.test(newPassword)) return 'Must contain at least one number.';
    if (newPassword !== confirmNewPassword) return 'Passwords do not match.';
    return null;
  };

  const saveName = async () => {
    try {
      setSavingKey('name');
      const updated = await putUpdate({
        fname: draft.fname.trim(),
        lname: draft.lname.trim(),
      });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditName(false);
      alert('Name updated!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update name.');
    } finally {
      setSavingKey('');
    }
  };

  const saveEmail = async () => {
    const err = validateEmail(draft.email);
    if (err) return alert(err);

    try {
      setSavingKey('email');
      const updated = await putUpdate({ email: draft.email.trim() });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditEmail(false);
      alert('Email updated!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update email.');
    } finally {
      setSavingKey('');
    }
  };

  const saveNumber = async () => {
    const err = validateNumber(draft.number);
    if (err) return alert(err);

    try {
      setSavingKey('number');
      const updated = await putUpdate({ number: draft.number.trim() });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditNumber(false);
      alert('Number updated!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update number.');
    } finally {
      setSavingKey('');
    }
  };

  const saveDob = async () => {
    try {
      setSavingKey('dob');

      const updated = await putUpdate({ dob: draft.dob });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditDob(false);
      alert('Birthday updated!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update birthday.');
    } finally {
      setSavingKey('');
    }
  };

  const saveAddress = async () => {
    if (!draft.address.trim()) return alert('Address cannot be empty.');

    try {
      setSavingKey('address');

      const updated = await putUpdate({ address: draft.address.trim() });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditAddress(false);
      alert('Address updated!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to update address.');
    } finally {
      setSavingKey('');
    }
  };


  const savePassword = async () => {
    const err = validatePassword();
    if (err) return alert(err);

    try {
      setSavingKey('password');

      if (passDraft.otpId && passDraft.otpCode) {
        const res = await axios.post('http://localhost:8000/api/auth/change-password', {
          userId,
          currentPassword: passDraft.currentPassword,
          newPassword: passDraft.newPassword,
          otpId: passDraft.otpId,
          code: passDraft.otpCode,
        });

        if (res.data?.changed) {
          setPassDraft({
            currentPassword: '',
            newPassword: '',
            confirmNewPassword: '',
            otpCode: '',
            otpId: '',
            maskedEmail: '',
            expiresAt: '',
          });
          setEditPassword(false);

          setShowStayOrLogout(true);
        }
        return;
      }

      const res = await axios.post('http://localhost:8000/api/auth/change-password', {
        userId,
        currentPassword: passDraft.currentPassword,
        newPassword: passDraft.newPassword,
      });

      if (res.data?.otpRequired) {
        setPassDraft((p) => ({
          ...p,
          otpId: res.data.otpId || '',
          maskedEmail: res.data.maskedEmail || '',
          expiresAt: res.data.expiresAt || '',
          otpCode: '',
        }));
        alert(`OTP sent to ${res.data.maskedEmail || 'your email'}.`);
      } else {
        alert(res.data?.message || 'Check response.');
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingKey('');
    }
  };

  const resendChangePassOtp = async () => {
    try {
      setSavingKey('password');
      const res = await axios.post('http://localhost:8000/api/auth/resend-change-password-otp', {
        userId,
      });

      setPassDraft((p) => ({
        ...p,
        otpId: res.data?.otpId || p.otpId,
        maskedEmail: res.data?.maskedEmail || p.maskedEmail,
        expiresAt: res.data?.expiresAt || p.expiresAt,
      }));

      alert('OTP resent!');
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSavingKey('');
    }
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const resetAssessmentUI = () => {
    stopTimer();
    startedAtRef.current = null;
    setTimeLeft(null);
    setAssessView('list');
    setSelectedAssess(null);
    setAnswersMap({});
    setResult(null);
    setSubmitLoading(false);
    setAssessError('');
  };

  const fetchAssessments = async () => {
    try {
      setAssessLoading(true);
      setAssessError('');
      const res = await axios.get('http://localhost:8000/api/assessments');
      setAssessments(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (e) {
      setAssessError(e?.response?.data?.message || 'Failed to load assessments.');
    } finally {
      setAssessLoading(false);
    }
  };

  const openAssessmentDetails = async (assessmentId) => {
    try {
      setAssessLoading(true);
      setAssessError('');
      const res = await axios.get(`http://localhost:8000/api/assessments/${assessmentId}`);
      const a = res.data?.data || res.data;
      setSelectedAssess(a);
      setAssessView('details');
    } catch (e) {
      setAssessError(e?.response?.data?.message || 'Failed to open assessment.');
    } finally {
      setAssessLoading(false);
    }
  };

  const startTakingAssessment = () => {
    if (!selectedAssess) return;

    setAnswersMap({});
    setResult(null);
    setAssessError('');
    setAssessView('take');

    stopTimer();
    startedAtRef.current = Date.now();

    const hasTimer = Boolean(selectedAssess?.timer?.enabled);
    const timerSeconds = hasTimer ? Number(selectedAssess?.timer?.minutes || 0) * 60 : 0;

    if (hasTimer && timerSeconds > 0) {
      setTimeLeft(timerSeconds);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null) return prev;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;

            setTimeout(() => {
              submitAssessment(true);
            }, 200);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimeLeft(null);
    }
  };

  const pickAnswer = (questionId, choiceIndex) => {
    setAnswersMap((p) => ({ ...p, [questionId]: choiceIndex }));
  };

  const computeTimeSpentSec = () => {
    if (!startedAtRef.current) return 0;
    const diffMs = Date.now() - startedAtRef.current;
    return Math.max(0, Math.floor(diffMs / 1000));
  };

  const submitAssessment = async (auto = false) => {
    if (!selectedAssess?._id) return;

    const qs = Array.isArray(selectedAssess?.questions) ? selectedAssess.questions : [];
    const unanswered = qs.filter((q) => answersMap[q._id] === undefined);
    if (unanswered.length > 0 && !auto) {
      if (!window.confirm(`May ${unanswered.length} unanswered. Submit pa rin?`)) return;
    }

    try {
      setSubmitLoading(true);
      setAssessError('');
      stopTimer();

      const payload = {
        studentId: userId || null,
        answers: qs.map((q) => ({
          questionId: q._id,
          selectedIndex: answersMap[q._id] ?? null,
        })),
        timeSpentSec: computeTimeSpentSec(),
      };

      const res = await axios.post(
        `http://localhost:8000/api/assessments/${selectedAssess._id}/submit`,
        payload
      );

      const data = res.data?.data || res.data;
      setResult(data);
      setAssessView('result');
    } catch (e) {
      setAssessError(e?.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatTime = (sec) => {
    if (sec === null || sec === undefined) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (active !== 'Assesment') return;
    fetchAssessments();
  }, [active]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const renderDashboard = () => (
  <div className="hpCard" style={{ padding: 16 }}>
    <div className="hpCardHead" style={{ marginBottom: 14 }}>
      <div className="hpCardTitle" style={{ fontWeight: 900, fontSize: 20 }}>Dashboard</div>
      <div className="hpCardSub" style={{ color: '#8a8a8a', fontWeight: 700 }}>
        Explore MyphoLens — quick access, recent scans, and progress.
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 14,
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 14,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 10, color: '#2b5b3a' }}>
            EXPLORE MYPHOLENS
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            {[
              { label: 'AI Classifier' },
              { label: '3D Models' },
              { label: 'Learn' },
              { label: 'Assessments' },
              { label: 'Bookmarks' },
              { label: 'Scan History' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                style={{
                  border: '1px solid rgba(255, 105, 180, 0.35)',
                  borderRadius: 12,
                  padding: '14px 10px',
                  background: '#fff',
                  fontWeight: 900,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                onClick={() => {}}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px dashed rgba(255, 105, 180, 0.55)',
                    margin: '0 auto 8px',
                  }}
                />
                {item.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 14,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 10, color: '#2b5b3a' }}>
            LATEST ASSESSMENT SCORE
          </div>

          <div
            style={{
              borderRadius: 14,
              padding: 14,
              background: 'rgba(160, 220, 140, 0.45)',
              border: '1px solid rgba(0,0,0,0.08)',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.06)',
                }}
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: 12 }}>
                  ASSESSMENT NAME <span style={{ fontWeight: 700, opacity: 0.7 }}>(attempts: 1)</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75, marginTop: 4 }}>
                  Excellent identification of all fungi units! Keep it up!
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 12 }}>90/100</div>
              <button
                type="button"
                style={{
                  marginTop: 8,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.18)',
                  background: '#fff',
                  fontWeight: 900,
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                onClick={() => {}}
              >
                VIEW
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 14,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 10, color: '#2b5b3a' }}>
            RECENTLY VIEWED TOPICS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {[
              'CHARACTERISTICS OF FUNGI',
              'BASIC MORPHOLOGICAL FORMS',
              'FUNDAMENTAL UNIT OF FUNGI',
            ].map((t) => (
              <div
                key={t}
                style={{
                  border: '1px solid rgba(255, 105, 180, 0.35)',
                  borderRadius: 14,
                  padding: 12,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    height: 86,
                    borderRadius: 12,
                    border: '1px dashed rgba(255, 105, 180, 0.55)',
                    marginBottom: 10,
                  }}
                />
                <div style={{ fontWeight: 900, fontSize: 11, textAlign: 'center' }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 14,
            padding: 14,
            background: '#fff',
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 10, color: '#2b5b3a' }}>
            RECENTLY VIEWED MODELS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {['YEAST', 'BUDDING YEAST', 'PSEUDOHYPHAE'].map((m) => (
              <div
                key={m}
                style={{
                  border: '1px solid rgba(255, 105, 180, 0.35)',
                  borderRadius: 14,
                  padding: 12,
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    height: 92,
                    borderRadius: 12,
                    border: '1px dashed rgba(255, 105, 180, 0.55)',
                    marginBottom: 10,
                  }}
                />
                <div style={{ fontWeight: 900, fontSize: 11, textAlign: 'center' }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 14,
          padding: 14,
          background: '#fff',
          position: 'sticky',
          top: 12,
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 0.3, marginBottom: 10, color: '#2b5b3a' }}>
          RECENT SCANS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid rgba(255, 105, 180, 0.25)',
                borderRadius: 14,
                padding: 10,
                display: 'grid',
                gridTemplateColumns: '72px 1fr',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 56,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.06)',
                }}
              />
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontWeight: 900, fontSize: 12 }}>YEAST</div>
                  <div
                    style={{
                      width: 14,
                      height: 18,
                      borderRadius: 3,
                      background: 'rgba(0,0,0,0.08)',
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.7, marginTop: 2 }}>
                  date & time • confidence score
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginTop: 6 }}>
                  Short description/overview about the AI classification.
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(255, 105, 180, 0.45)',
                      background: '#fff',
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => {}}
                  >
                    LEARN MORE
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(0,0,0,0.18)',
                      background: '#fff',
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => {}}
                  >
                    VIEW MODEL
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

  const renderLearn = () => (
  <div className="hpCard" style={{ padding: 16 }}>
    <div style={{ textAlign: 'center', marginTop: 6, marginBottom: 22 }}>
      <div style={{ fontWeight: 900, letterSpacing: 1.2, fontSize: 20, color: '#2b5b3a' }}>
        LEARN MYCOLOGY
      </div>
    </div>

    <div style={{ fontWeight: 900, letterSpacing: 0.8, marginBottom: 12, color: '#2b5b3a' }}>
      TOPICS
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 14,
        maxWidth: 680,
        margin: '0 auto',
      }}
    >
      {[
        { title: 'CHARACTERISTICS OF FUNGI' },
        { title: 'FUNGI GROUPS' },
        { title: 'BASIC MORPHOLOGICAL FORMS' },
        { title: 'DIAGNOSTIC MYCOLOGY' },
        { title: 'FUNDAMENTAL UNIT OF FUNGI' },
        { title: 'MYCOSES' },
      ].map((t) => (
        <button
          key={t.title}
          type="button"
          onClick={() => {}}
          style={{
            textAlign: 'center',
            padding: '18px 14px',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.18)',
            background: 'rgba(170, 210, 160, 0.55)',
            cursor: 'pointer',
            minHeight: 84,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, color: '#2b5b3a' }}>
            {t.title}
          </div>
          <div style={{ fontWeight: 800, fontSize: 10, opacity: 0.65, marginTop: 8 }}>
            TOPIC DESCRIPTION
          </div>
        </button>
      ))}
    </div>
  </div>
);

  const renderAssesment = () => (
    <div className="hpCard">
      <div className="hpCardHead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="hpCardTitle">Assesment</div>
          <div className="hpCardSub">Answer available assessments created by instructors</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="hpBtn"
            onClick={fetchAssessments}
            disabled={assessLoading}
            style={{ padding: '10px 14px' }}
          >
            {assessLoading ? 'Loading...' : 'Refresh'}
          </button>

          {assessView !== 'list' ? (
            <button
              type="button"
              className="hpBtn"
              onClick={resetAssessmentUI}
              style={{ padding: '10px 14px' }}
              disabled={submitLoading}
            >
              Back to list
            </button>
          ) : null}
        </div>
      </div>

      {assessError ? (
        <div style={{ marginTop: 12, color: '#b00020', fontWeight: 700 }}>
          {assessError}
        </div>
      ) : null}

      {assessView === 'list' && (
        <div style={{ marginTop: 16 }}>
          {assessLoading ? (
            <div style={{ opacity: 0.7 }}>Loading assessments...</div>
          ) : null}

          {!assessLoading && assessments.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No assessments available yet.</div>
          ) : null}

          <div style={{ display: 'grid', gap: 12 }}>
            {assessments.map((a) => (
              <div
                key={a._id}
                style={{
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  padding: 14,
                  background: 'rgba(255,255,255,0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: '#3f5f4a', letterSpacing: 0.4 }}>
                    {a.title || 'Untitled Assessment'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {a.timerEnabled
                      ? `Timed • ${Math.round(Number(a.timerSeconds || 0) / 60)} min`
                      : 'No timer'}
                    {typeof a.totalPoints === 'number' ? ` • ${a.totalPoints} pts` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  className="hpBtn"
                  onClick={() => openAssessmentDetails(a._id)}
                  style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}
                  disabled={assessLoading}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {assessView === 'details' && selectedAssess && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#3f5f4a' }}>
            {selectedAssess.title || 'Untitled Assessment'}
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            {selectedAssess.timerEnabled
              ? `Timer: ${Math.round(Number(selectedAssess.timerSeconds || 0) / 60)} minutes`
              : 'Timer: none'}
            {Array.isArray(selectedAssess.questions)
              ? ` • Questions: ${selectedAssess.questions.length}`
              : ''}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="hpBtn"
              onClick={startTakingAssessment}
              style={{ padding: '10px 16px' }}
              disabled={assessLoading}
            >
              Start
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.85 }}>
            Tip: Make sure stable internet before submitting.
          </div>
        </div>
      )}

      {assessView === 'take' && selectedAssess && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: '#3f5f4a' }}>
                {selectedAssess.title || 'Assessment'}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                Answer all questions then submit.
              </div>
            </div>

            {selectedAssess.timerEnabled && typeof timeLeft === 'number' ? (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.15)',
                  background: 'rgba(255,255,255,0.75)',
                  fontWeight: 900,
                  minWidth: 90,
                  textAlign: 'center',
                }}
              >
                {formatTime(timeLeft)}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            {(selectedAssess.questions || []).map((q, idx) => {
              const qid = q._id;
              const selected = answersMap[qid];

              return (
                <div
                  key={qid}
                  style={{
                    border: '1px solid rgba(0,0,0,0.12)',
                    borderRadius: 14,
                    padding: 14,
                    background: 'rgba(255,255,255,0.65)',
                  }}
                >
                  <div style={{ fontWeight: 900, color: '#3f5f4a' }}>
                    {idx + 1}. {q.text}
                    {typeof q.points === 'number' ? (
                      <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
                        ({q.points} pts)
                      </span>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {(q.options || []).map((c, ci) => (
                      <label
                        key={`${qid}_${ci}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.12)',
                          background: selected === ci ? 'rgba(246, 223, 232, 0.55)' : 'rgba(255,255,255,0.85)',
                          cursor: submitLoading ? 'not-allowed' : 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${qid}`}
                          checked={selected === ci}
                          disabled={submitLoading}
                          onChange={() => pickAnswer(qid, ci)}
                        />
                        <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.85 }}>
                          {c}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="hpBtn"
              onClick={() => submitAssessment(false)}
              disabled={submitLoading}
              style={{ padding: '10px 16px' }}
            >
              {submitLoading ? 'Submitting...' : 'Submit'}
            </button>

            <button
              type="button"
              className="hpBtn"
              onClick={resetAssessmentUI}
              disabled={submitLoading}
              style={{ padding: '10px 16px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {assessView === 'result' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#3f5f4a' }}>
            Result
          </div>

          {result ? (
            <div
              style={{
                marginTop: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 14,
                padding: 14,
                background: 'rgba(255,255,255,0.65)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, opacity: 0.9 }}>
                Score: {result.score} / {result.total}
                {typeof result.percent === 'number' ? ` (${result.percent}%)` : ''}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, opacity: 0.85 }}>
                Feedback:
              </div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                {result.feedback || 'No feedback configured.'}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 12, opacity: 0.75 }}>
              Submitted.
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="hpBtn"
              onClick={resetAssessmentUI}
              style={{ padding: '10px 16px' }}
            >
              Back to list
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderScanner = () => (
    <div className="hpCard">
      <div className="hpCardHead">
        <div className="hpCardTitle">AI Scanner</div>
        <div className="hpCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderProgress = () => (
  <div className="hpCard" style={{ padding: 16 }}>
    <div style={{ textAlign: 'center', margin: '18px 0 6px' }}>
      <div style={{ fontWeight: 900, letterSpacing: 1.2, fontSize: 18, color: '#2b5b3a' }}>
        PROGRESS AND PERFORMANCE
      </div>
      <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.75 }}>
        Track your progress and performance
      </div>
    </div>

    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: 18,
        marginTop: 18,
        alignItems: 'start',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 14,
          padding: 14,
          boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12, marginBottom: 10 }}>
          ASSESSMENT PERFORMANCE
        </div>

        {[
          { level: 'BASIC LEVEL', pct: '79%', icon: '📖' },
          { level: 'INTERMEDIATE LEVEL', pct: '88%', icon: '🧩' },
          { level: 'ADVANCED LEVEL', pct: '92%', icon: '📚' },
        ].map((x) => (
          <div
            key={x.level}
            style={{
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: '1px solid rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                background: 'rgba(255, 182, 193, 0.12)',
              }}
            >
              {x.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>
                  {x.level}
                </div>
                <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>{x.pct}</div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.75, marginTop: 6 }}>
                PERFORMANCE
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.6, marginTop: 2 }}>
                7 QUIZZES ANSWERED ● AVG. 1.5 ATTEMPTS
              </div>

              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.08)',
                  marginTop: 10,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: x.pct,
                    background: 'rgba(60, 140, 80, 0.7)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>
              UPLOADED IMAGES (6)
            </div>
            <button
              type="button"
              onClick={() => {}}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 900,
                fontSize: 12,
                color: '#d46b8c',
                cursor: 'pointer',
              }}
            >
              SEE ALL ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
            {[
              { name: 'YEAST' },
              { name: 'MOLD' },
            ].map((x) => (
              <div
                key={x.name}
                style={{
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: 'rgba(170, 210, 160, 0.55)',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>{x.name}</div>
                      <div style={{ fontWeight: 800, fontSize: 10, opacity: 0.6 }}>CONFIDENCE SCORE</div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#fff',
                    }}
                    title="bookmark placeholder"
                  />
                </div>

                <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.6, lineHeight: 1.3 }}>
                  Short description/overview about classification
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(60,140,80,0.35)',
                      background: 'rgba(170,210,160,0.55)',
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                      color: '#2b5b3a',
                    }}
                  >
                    LEARN MORE
                  </button>
                  <button
                    type="button"
                    onClick={() => {}}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(60,140,80,0.35)',
                      background: '#fff',
                      fontWeight: 900,
                      fontSize: 10,
                      cursor: 'pointer',
                      color: '#2b5b3a',
                    }}
                  >
                    VIEW MODEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>SCAN HISTORY</div>
            <button
              type="button"
              onClick={() => {}}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 900,
                fontSize: 12,
                color: '#d46b8c',
                cursor: 'pointer',
              }}
            >
              SEE ALL ›
            </button>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: 14,
              padding: 14,
              marginTop: 10,
              boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: 'rgba(170, 210, 160, 0.55)',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 900, color: '#2b5b3a', fontSize: 12 }}>YEAST</div>
                  <div style={{ fontWeight: 800, fontSize: 10, opacity: 0.6 }}>CONFIDENCE SCORE</div>
                </div>
              </div>

              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: '#fff',
                }}
                title="bookmark placeholder"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {}}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(60,140,80,0.35)',
                  background: 'rgba(170,210,160,0.55)',
                  fontWeight: 900,
                  fontSize: 10,
                  cursor: 'pointer',
                  color: '#2b5b3a',
                }}
              >
                LEARN MORE
              </button>
              <button
                type="button"
                onClick={() => {}}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(60,140,80,0.35)',
                  background: '#fff',
                  fontWeight: 900,
                  fontSize: 10,
                  cursor: 'pointer',
                  color: '#2b5b3a',
                }}
              >
                VIEW MODEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

  const renderProfile = () => (
    <div className="hpCard">
      <div className="hpCardHead">
        <div className="hpCardTitle">Profile</div>
        <div className="hpCardSub">Account settings</div>
      </div>

      <div className="hpProfileGrid">
        <div className="hpBox">
          <div className="hpBoxTitle">Profile Photo</div>
          <div className="hpPhotoRow">
            <div className="hpPhotoCircle">
              {profilePreview ? <img src={profilePreview} alt="preview" /> : '👤'}
            </div>
            <label className="hpUploadBtn">
              Upload Photo
              <input type="file" onChange={onPickImage} />
            </label>
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Name</div>
          <div className="hpFieldRow">
            <input
              className="hpInput"
              disabled={!editName}
              value={draft.fname}
              onChange={onDraftChange('fname')}
              placeholder="First name"
            />
            <input
              className="hpInput"
              disabled={!editName}
              value={draft.lname}
              onChange={onDraftChange('lname')}
              placeholder="Last name"
            />
          </div>
          <div className="hpActionsRow">
            {!editName ? (
              <button className="hpBtn" type="button" onClick={() => setEditName(true)}>
                Edit
              </button>
            ) : (
              <button className="hpBtn" type="button" onClick={saveName} disabled={savingKey === 'name'}>
                {savingKey === 'name' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Email</div>
          <input
            className="hpInput"
            disabled={!editEmail}
            value={draft.email}
            onChange={onDraftChange('email')}
            placeholder="Email"
          />
          <div className="hpActionsRow">
            {!editEmail ? (
              <button className="hpBtn" type="button" onClick={() => setEditEmail(true)}>
                Edit
              </button>
            ) : (
              <button className="hpBtn" type="button" onClick={saveEmail} disabled={savingKey === 'email'}>
                {savingKey === 'email' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Number</div>
          <input
            className="hpInput"
            disabled={!editNumber}
            value={draft.number}
            onChange={onDraftChange('number')}
            placeholder="Phone number"
          />
          <div className="hpActionsRow">
            {!editNumber ? (
              <button className="hpBtn" type="button" onClick={() => setEditNumber(true)}>
                Edit
              </button>
            ) : (
              <button className="hpBtn" type="button" onClick={saveNumber} disabled={savingKey === 'number'}>
                {savingKey === 'number' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Birthday</div>
          <input
            className="hpInput"
            type="date"
            disabled={!editDob}
            value={draft.dob}
            onChange={onDraftChange('dob')}
          />
          <div className="hpActionsRow">
            {!editDob ? (
              <button className="hpBtn" onClick={() => setEditDob(true)}>Edit</button>
            ) : (
              <button className="hpBtn" onClick={saveDob} disabled={savingKey === 'dob'}>
                {savingKey === 'dob' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Address</div>
          <textarea
            className="hpInput"
            disabled={!editAddress}
            value={draft.address}
            onChange={onDraftChange('address')}
            placeholder="Enter address"
            style={{ minHeight: 80, resize: 'vertical' }}
          />
          <div className="hpActionsRow">
            {!editAddress ? (
              <button className="hpBtn" onClick={() => setEditAddress(true)}>Edit</button>
            ) : (
              <button className="hpBtn" onClick={saveAddress} disabled={savingKey === 'address'}>
                {savingKey === 'address' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hpBox">
          <div className="hpBoxTitle">Password</div>

          {editPassword && (
            <div className="hpFieldCol">
              <input
                className="hpInput"
                type="password"
                placeholder="Current Password"
                value={passDraft.currentPassword}
                onChange={onPassChange('currentPassword')}
              />
              <input
                className="hpInput"
                type="password"
                placeholder="New Password"
                value={passDraft.newPassword}
                onChange={onPassChange('newPassword')}
              />
              <input
                className="hpInput"
                type="password"
                placeholder="Confirm New Password"
                value={passDraft.confirmNewPassword}
                onChange={onPassChange('confirmNewPassword')}
              />

              {passDraft.otpId ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginTop: 6 }}>
                    Enter OTP sent to <b>{passDraft.maskedEmail || 'your email'}</b>
                  </div>
                  <input
                    className="hpInput"
                    type="text"
                    placeholder="OTP Code"
                    value={passDraft.otpCode}
                    onChange={onPassChange('otpCode')}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="hpBtn"
                    onClick={resendChangePassOtp}
                    disabled={savingKey === 'password'}
                    style={{ marginTop: 6 }}
                  >
                    Resend OTP
                  </button>
                </>
              ) : null}
            </div>
          )}

          <div className="hpActionsRow">
            {!editPassword ? (
              <button className="hpBtn" type="button" onClick={() => setEditPassword(true)}>
                Change
              </button>
            ) : (
              <button className="hpBtn" type="button" onClick={savePassword} disabled={savingKey === 'password'}>
                {savingKey === 'password'
                  ? 'Saving...'
                  : passDraft.otpId
                    ? 'Verify & Save'
                    : 'Send OTP'}
              </button>
            )}
          </div>
        </div>
      </div>

      {showStayOrLogout ? (
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
          onClick={() => setShowStayOrLogout(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              background: '#fff',
              borderRadius: 14,
              padding: '18px 16px',
              border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
              Password changed successfully
            </div>
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, opacity: 0.8 }}>
              Do you want to stay logged in or logout?
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="hpBtn"
                onClick={() => setShowStayOrLogout(false)}
                style={{ flex: 1 }}
              >
                Stay Logged In
              </button>

              <button
                type="button"
                className="hpBtn"
                onClick={handleLogoutConfirm}
                style={{ flex: 1 }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderMain = () => {
    if (active === 'Dashboard') return renderDashboard();
    if (active === 'Learn') return renderLearn();
    if (active === 'Assesment') return renderAssesment();
    if (active === 'AI Scanner') return renderScanner();
    if (active === 'Progress & Performance') return renderProgress();
    if (active === 'Profile') return renderProfile();
    return renderDashboard();
  };

  return (
    <div className="hpWrap">
      <aside className="hpSide">
        <div className="hpSideTop">
          <div className="hpLogo">MyphoLens</div>

          <div className="hpSectionTitle">OVERVIEW</div>

          <div className="hpNav">
            <button
              type="button"
              className={`hpNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => setActive('Dashboard')}
            >
              <span className="hpDot" />
              Dashboard
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Learn' ? 'active' : ''}`}
              onClick={() => setActive('Learn')}
            >
              <span className="hpDot" />
              Learn
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Assesment' ? 'active' : ''}`}
              onClick={() => setActive('Assesment')}
            >
              <span className="hpDot" />
              Assesment
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'AI Scanner' ? 'active' : ''}`}
              onClick={() => setActive('AI Scanner')}
            >
              <span className="hpDot" />
              AI Scanner
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Progress & Performance' ? 'active' : ''}`}
              onClick={() => setActive('Progress & Performance')}
            >
              <span className="hpDot" />
              Progress &amp; Performance
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Profile' ? 'active' : ''}`}
              onClick={() => setActive('Profile')}
            >
              <span className="hpDot" />
              Profile
            </button>
          </div>
        </div>

        <div className="hpSideBottom">
          <button type="button" className="hpLogout" onClick={() => {
            if (!window.confirm('Are you sure you want to logout?')) return;
            handleLogout();
          }}>
            LOGOUT
          </button>
        </div>
      </aside>

      <section className="hpMain">
        <header className="hpTopbar">
          <form className="hpSearch" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Mycology Topics"
            />
            <button type="submit">⌕</button>
          </form>

          <div className="hpWelcome">
            <div className="hpAvatar" />
            <div className="hpWelcomeText">
              <div className="hpWelcomeTop">Welcome,</div>
              <div className="hpWelcomeUser">{usernameLabel}</div>
            </div>
          </div>
        </header>

        <div className="hpContent">{renderMain()}</div>
      </section>
    </div>
  );
}

export default HomePageStudent;
