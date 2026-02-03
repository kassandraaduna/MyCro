import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './HomeInstructor.css';
import Toast from '../Components/Toast';

const API = 'http://localhost:8000/api';

const emptyQuestion = () => ({
  text: '',
  points: 1,
  options: ['', '', '', ''],
  correctIndex: 0,
});

const emptyRange = () => ({
  min: 0,
  max: 0,
  message: '',
});

function HomeInstructor() {
  const [toast, setToast] = useState('');
  const [showStayOrLogout, setShowStayOrLogout] = useState(false);

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

  const [profilePreview, setProfilePreview] = useState('');
  const [savingKey, setSavingKey] = useState('');

  // ---------- ASSESSMENT STATE ----------
  const [assessments, setAssessments] = useState([]);
  const [assLoading, setAssLoading] = useState(false);
  const [assError, setAssError] = useState('');

  const [showAddAssessment, setShowAddAssessment] = useState(false);

  const [assTitle, setAssTitle] = useState('');
  const [assUseTimer, setAssUseTimer] = useState(false);
  const [assTimerMinutes, setAssTimerMinutes] = useState(10);
  const [assQuestions, setAssQuestions] = useState([emptyQuestion()]);
  const [assRanges, setAssRanges] = useState([
    { min: 0, max: 49, message: 'Review more about the topic.' },
    { min: 50, max: 79, message: 'Good job! Keep practicing.' },
    { min: 80, max: 100, message: 'Excellent performance!' },
  ]);
  const [assFormError, setAssFormError] = useState('');

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
    if (!user) return 'instructor';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'instructor';
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

  const handleSearch = (e) => e.preventDefault();

  const onDraftChange = (field) => (e) =>
    setDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPassChange = (field) => (e) =>
    setPassDraft((p) => ({ ...p, [field]: e.target.value }));

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setToast('Image is too large. Max 3MB.');
      return;
    }

    setProfilePreview(URL.createObjectURL(file));
  };

  const putUpdate = async (payload) => {
    if (!userId) {
      setToast('Walang userId. Mag-login ulit.');
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
      setToast('Name updated!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to update name.');
    } finally {
      setSavingKey('');
    }
  };

  const saveEmail = async () => {
    const err = validateEmail(draft.email);
    if (err) return setToast(err);

    try {
      setSavingKey('email');
      const updated = await putUpdate({ email: draft.email.trim() });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditEmail(false);
      setToast('Email updated!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to update email.');
    } finally {
      setSavingKey('');
    }
  };

  const saveNumber = async () => {
    const err = validateNumber(draft.number);
    if (err) return setToast(err);

    try {
      setSavingKey('number');
      const updated = await putUpdate({ number: draft.number.trim() });
      if (!updated) return;

      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditNumber(false);
      setToast('Number updated!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to update number.');
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

  // NEW: OTP-based change password
  const savePassword = async () => {
    const err = validatePassword();
    if (err) return setToast(err);

    try {
      setSavingKey('password');

      // STEP 2
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

      // STEP 1
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
        setToast(`OTP sent to ${res.data.maskedEmail || 'your email'}.`);
      } else {
        setToast(res.data?.message || 'Check response.');
      }
    } catch (error) {
      setToast(error?.response?.data?.message || 'Failed to update password.');
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

      setToast('OTP resent!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSavingKey('');
    }
  };

  // ---------- ASSESSMENT FUNCTIONS ----------
  const resetAssessmentForm = () => {
    setAssTitle('');
    setAssUseTimer(false);
    setAssTimerMinutes(10);
    setAssQuestions([emptyQuestion()]);
    setAssRanges([
      { min: 0, max: 49, message: 'Review more about the topic.' },
      { min: 50, max: 79, message: 'Good job! Keep practicing.' },
      { min: 80, max: 100, message: 'Excellent performance!' },
    ]);
    setAssFormError('');
  };

  const fetchAssessments = async () => {
    try {
      setAssLoading(true);
      setAssError('');
      const res = await axios.get(`${API}/assessments`);
      setAssessments(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setAssError(e?.response?.data?.message || 'Failed to fetch assessments.');
    } finally {
      setAssLoading(false);
    }
  };

  useEffect(() => {
    if (active !== 'Assessment') return;
    fetchAssessments();
  }, [active]);

  const validateAssessmentForm = () => {
    if (!assTitle.trim()) return 'Quiz title is required.';
    if (assUseTimer && (!assTimerMinutes || Number(assTimerMinutes) <= 0)) return 'Timer minutes must be > 0.';

    for (let i = 0; i < assQuestions.length; i++) {
      const q = assQuestions[i];
      if (!q.text.trim()) return `Question #${i + 1} is empty.`;
      if (!q.points || Number(q.points) <= 0) return `Question #${i + 1} points must be > 0.`;

      const filledOptions = q.options.filter((o) => String(o || '').trim() !== '');
      if (filledOptions.length < 2) return `Question #${i + 1} needs at least 2 options.`;

      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) return `Invalid correct answer on question #${i + 1}.`;
      if (!String(q.options[q.correctIndex] || '').trim()) return `Correct answer is blank on question #${i + 1}.`;
    }

    if (!assRanges.length) return 'Add at least 1 feedback range.';
    for (let i = 0; i < assRanges.length; i++) {
      const r = assRanges[i];
      if (r.min === '' || r.max === '') return `Range #${i + 1} min/max required.`;
      if (Number(r.min) > Number(r.max)) return `Range #${i + 1} min cannot be greater than max.`;
      if (!String(r.message || '').trim()) return `Range #${i + 1} message is required.`;
    }

    return null;
  };

  const saveAssessment = async () => {
    const err = validateAssessmentForm();
    if (err) {
      setAssFormError(err);
      return;
    }

    try {
      setAssFormError('');
      setAssLoading(true);

      const payload = {
        title: assTitle.trim(),
        createdBy: userId || null,
        timer: assUseTimer
          ? { enabled: true, minutes: Number(assTimerMinutes) }
          : { enabled: false, minutes: null },
        questions: assQuestions.map((q) => ({
          text: q.text.trim(),
          points: Number(q.points),
          options: q.options.map((o) => String(o || '')),
          correctIndex: Number(q.correctIndex),
        })),
        feedbackRanges: assRanges.map((r) => ({
          min: Number(r.min),
          max: Number(r.max),
          message: String(r.message || '').trim(),
        })),
      };

      const res = await axios.post(`${API}/assessments`, payload);
      const created = res.data?.data;

      if (created) setAssessments((prev) => [created, ...prev]);

      setShowAddAssessment(false);
      resetAssessmentForm();
      setToast('Assessment added!');
    } catch (e) {
      console.error(e);
      setAssFormError(e?.response?.data?.message || 'Failed to save assessment.');
    } finally {
      setAssLoading(false);
    }
  };

  const deleteAssessment = async (id) => {
    if (!id) return;

    const ok = window.confirm('Delete this assessment?');
    if (!ok) return;

    try {
      setAssLoading(true);
      await axios.delete(`${API}/assessments/${id}`);

      setAssessments((prev) => prev.filter((a) => a._id !== id));
      setToast('Assessment deleted!');
    } catch (e) {
      console.error(e);
      setToast(e?.response?.data?.message || 'Failed to delete assessment.');
    } finally {
      setAssLoading(false);
    }
  };

  // ---------- PAGES ----------
 const renderDashboard = () => (
  <div className="hiCard" style={{ padding: 16 }}>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 16,
        alignItems: 'start',
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.8, color: '#2b5b3a' }}>
          EXPLORE MYPHOLENS
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 10,
            marginTop: 10,
          }}
        >
          {[
            'AI CLASSIFIER',
            '3D MODELS',
            'LEARN',
            'ASSESSMENTS',
            'BOOKMARKS',
            'SCAN HISTORY',
          ].map((label) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  border: '1px solid rgba(212, 107, 140, 0.45)',
                  background: '#fff',
                }}
              />
              <div style={{ marginTop: 6, fontSize: 10, fontWeight: 900, opacity: 0.75 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, fontWeight: 900, fontSize: 13, letterSpacing: 0.8, color: '#2b5b3a' }}>
          DASHBOARD
        </div>

        <div
          style={{
            marginTop: 10,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
          }}
        >
          {[
            {
              section: 'REGISTERED STUDENTS',
              title: 'TOTAL REGISTERED STUDENTS',
              value: '120',
              tint: 'rgba(170, 210, 160, 0.55)',
              icon: '👥',
            },
            {
              section: 'ACTIVE STUDENTS',
              title: 'TOTAL STUDENTS',
              value: '92',
              tint: 'rgba(255, 182, 193, 0.45)',
              icon: '🧑',
            },
            {
              section: 'AI SCANS',
              title: 'TOTAL AI SCANS',
              value: '340',
              tint: 'rgba(170, 210, 160, 0.55)',
              icon: '🤖',
            },
            {
              section: '',
              title: 'AVERAGE SCORES',
              value: '82%',
              tint: 'rgba(255, 182, 193, 0.45)',
              icon: '📊',
            },
          ].map((x, idx) => (
            <div key={`${x.title}-${idx}`} style={{ marginBottom: idx === 3 ? 0 : 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 10, opacity: 0.7 }}>
                  {x.section || ' '}
                </div>

                <button
                  type="button"
                  onClick={() => {}}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 900,
                    fontSize: 10,
                    color: '#d46b8c',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  SEE ALL <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
                </button>
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.10)',
                  background: x.tint,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'rgba(255,255,255,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    {x.icon}
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, fontSize: 11, color: '#2b5b3a' }}>{x.title}</div>
                    <div style={{ fontWeight: 800, fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                      # Total
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 900, fontSize: 12, color: '#2b5b3a' }}>{x.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.8, color: '#2b5b3a' }}>
          NOTIFICATIONS
        </div>

        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {[
            'LOW PERFORMANCE: Assessment 1',
            'New Dataset Images Submitted for Review',
          ].map((msg, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 12,
                padding: 12,
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ fontWeight: 900, color: '#2b5b3a', opacity: 0.6 }}>✓</div>
              <div style={{ fontWeight: 800, fontSize: 11, opacity: 0.75, lineHeight: 1.3 }}>
                {msg}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

  const renderLearn = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Manage Educational Content</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

const renderAssessment = () => (
    <div className="hiCard">
      <div className="hiCardHead" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="hiCardTitle">Manage Assessments</div>
          <div className="hiCardSub">Create quizzes with timer, questions, points, and feedback ranges.</div>
        </div>

        <button
          type="button"
          className="hiBtn"
          onClick={() => {
            setShowAddAssessment(true);
            setAssFormError('');
          }}
        >
          + Add New
        </button>
      </div>

      {assLoading ? <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>Loading...</div> : null}
      {assError ? <div style={{ marginTop: 12, fontWeight: 800, color: '#c62828' }}>{assError}</div> : null}

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {assessments.map((a) => (
          <div
            key={a._id}
            style={{
              border: '1px solid rgba(0,0,0,0.10)',
              borderRadius: 16,
              padding: 14,
              background: 'rgba(255,255,255,0.70)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 900, color: '#3f5f4a' }}>{a.title}</div>

              <button
                type="button"
                onClick={() => deleteAssessment(a._id)}
                disabled={assLoading}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.18)',
                  background: '#fff',
                  cursor: assLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                  color: '#c62828',
                }}
              >
                Delete
              </button>
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              {a.timer?.enabled ? `Timer: ${a.timer.minutes} min` : 'No Timer'} • {a.questions?.length || 0} questions
            </div>
          </div>
        ))}
        {!assLoading && assessments.length === 0 ? (
          <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.7 }}>No assessments yet.</div>
        ) : null}
      </div>

      {showAddAssessment ? (
        <div
          role="presentation"
          onMouseDown={() => !assLoading && setShowAddAssessment(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            role="presentation"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 780,
              background: '#fff',
              borderRadius: 18,
              padding: 16,
              border: '1px solid rgba(0,0,0,0.12)',
              boxShadow: '0 18px 45px rgba(0,0,0,0.18)',
              maxHeight: '92vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>Add New Assessment</div>
              <button
                type="button"
                onClick={() => !assLoading && setShowAddAssessment(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.18)',
                  background: 'rgba(246,223,232,0.35)',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
              >
                ✕
              </button>
            </div>

            {assFormError ? (
              <div
                style={{
                  marginTop: 10,
                  background: 'rgba(198,40,40,0.08)',
                  border: '1px solid rgba(198,40,40,0.2)',
                  color: '#c62828',
                  padding: 10,
                  borderRadius: 12,
                  fontWeight: 800,
                }}
              >
                {assFormError}
              </div>
            ) : null}

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Quiz Title</label>
              <input
                value={assTitle}
                onChange={(e) => setAssTitle(e.target.value)}
                placeholder="Enter title..."
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.18)',
                  padding: '0 12px',
                }}
              />
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 900, opacity: 0.85 }}>
                <input type="checkbox" checked={assUseTimer} onChange={(e) => setAssUseTimer(e.target.checked)} />
                Timer
              </label>

              {assUseTimer ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Minutes</label>
                  <input
                    type="number"
                    min="1"
                    value={assTimerMinutes}
                    onChange={(e) => setAssTimerMinutes(e.target.value)}
                    style={{
                      height: 40,
                      width: 140,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.18)',
                      padding: '0 12px',
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 16, fontWeight: 900, color: '#3f5f4a', letterSpacing: 0.4 }}>
              Questions
            </div>

            {assQuestions.map((q, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: 12,
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 16,
                  padding: 12,
                  background: 'rgba(246,223,232,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 900, opacity: 0.8 }}>Question #{idx + 1}</div>
                  {assQuestions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setAssQuestions((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.18)',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 900,
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Question</label>
                  <input
                    value={q.text}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, text: v } : it)));
                    }}
                    placeholder="Type question..."
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.18)',
                      padding: '0 12px',
                    }}
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Points</label>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, points: v } : it)));
                      }}
                      style={{
                        height: 40,
                        width: 140,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.18)',
                        padding: '0 12px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Correct Answer</label>
                    <select
                      value={q.correctIndex}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, correctIndex: v } : it)));
                      }}
                      style={{
                        height: 40,
                        width: 180,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.18)',
                        padding: '0 12px',
                      }}
                    >
                      {q.options.map((_, optIndex) => (
                        <option key={optIndex} value={optIndex}>
                          Option {optIndex + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Option {optIndex + 1}</label>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAssQuestions((prev) =>
                            prev.map((it, i) => {
                              if (i !== idx) return it;
                              const newOpts = [...it.options];
                              newOpts[optIndex] = v;
                              return { ...it, options: newOpts };
                            })
                          );
                        }}
                        placeholder={`Option ${optIndex + 1}...`}
                        style={{
                          height: 40,
                          borderRadius: 12,
                          border: '1px solid rgba(0,0,0,0.18)',
                          padding: '0 12px',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setAssQuestions((prev) => [...prev, emptyQuestion()])}
              style={{
                marginTop: 10,
                height: 36,
                padding: '0 14px',
                borderRadius: 12,
                border: '1px dashed rgba(0,0,0,0.25)',
                background: 'transparent',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              + Add Question
            </button>

            <div style={{ marginTop: 18, fontWeight: 900, color: '#3f5f4a', letterSpacing: 0.4 }}>
              Evaluation / Feedback (Score Ranges)
            </div>

            {assRanges.map((r, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: 12,
                  border: '1px solid rgba(0,0,0,0.10)',
                  borderRadius: 16,
                  padding: 12,
                  background: 'rgba(246,223,232,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 900, opacity: 0.8 }}>Range #{idx + 1}</div>
                  {assRanges.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setAssRanges((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(0,0,0,0.18)',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 900,
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Min</label>
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, min: v } : it)));
                      }}
                      style={{
                        height: 40,
                        width: 140,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.18)',
                        padding: '0 12px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Max</label>
                    <input
                      type="number"
                      value={r.max}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, max: v } : it)));
                      }}
                      style={{
                        height: 40,
                        width: 140,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.18)',
                        padding: '0 12px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>Feedback Message</label>
                  <input
                    value={r.message}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, message: v } : it)));
                    }}
                    placeholder="e.g. Excellent!"
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.18)',
                      padding: '0 12px',
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setAssRanges((prev) => [...prev, emptyRange()])}
              style={{
                marginTop: 10,
                height: 36,
                padding: '0 14px',
                borderRadius: 12,
                border: '1px dashed rgba(0,0,0,0.25)',
                background: 'transparent',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              + Add Range
            </button>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowAddAssessment(false);
                  resetAssessmentForm();
                }}
                disabled={assLoading}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.18)',
                  background: 'transparent',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button type="button" className="hiBtn" onClick={saveAssessment} disabled={assLoading}>
                {assLoading ? 'Saving...' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderModelLibrary = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Model Library</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderMonitoringAndManagement = () => (
    <div className="hiCard" style={{ padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: 0.8, color: '#2b5b3a' }}>
              EXPLORE MYPHOLENS
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
                gap: 10,
                marginTop: 10,
              }}
            >
              {['AI CLASSIFIER', '3D MODELS', 'LEARN', 'ASSESSMENTS', 'BOOKMARKS', 'SCAN HISTORY'].map(
                (label) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 10,
                        border: '1px solid rgba(212, 107, 140, 0.45)',
                        background: '#fff',
                      }}
                    />
                    <div style={{ marginTop: 6, fontSize: 10, fontWeight: 900, opacity: 0.75 }}>
                      {label}
                    </div>
                  </div>
                )
              )}
            </div>

            <div style={{ marginTop: 26, textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.8, color: '#2b5b3a' }}>
                PROGRESS AND PERFORMANCE
              </div>
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.65 }}>
                Track progress and performance
              </div>
            </div>

            <div style={{ marginTop: 18, fontWeight: 900, fontSize: 12, color: '#2b5b3a', opacity: 0.8 }}>
              ASSESSMENT PERFORMANCE
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
              {['STUDENTS', 'BOOKMARKED SCANS', 'UPLOADED IMAGES', 'SCAN HISTORY'].map((t, idx) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {}}
                  style={{
                    border: '1px solid rgba(0,0,0,0.12)',
                    background: idx === 0 ? 'rgba(170, 210, 160, 0.65)' : '#fff',
                    color: '#2b5b3a',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontWeight: 900,
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: 14,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 14,
                padding: 14,
                boxShadow: '0 10px 25px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 11, opacity: 0.75, marginBottom: 10 }}>
                TOP PERFORMERS
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.2fr 1.6fr 0.6fr',
                  gap: 10,
                  fontWeight: 900,
                  fontSize: 9,
                  opacity: 0.6,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <div>STUDENT NAME</div>
                <div>EMAIL</div>
                <div>PERFORMANCE</div>
                <div style={{ textAlign: 'right' }}>OVERALL</div>
              </div>

              {[
                { name: 'LUCY ANDERSON', email: 'lucyanderson@example.com', pct: 80 },
                { name: 'JASON SMITH', email: 'jsmith@example.com', pct: 85 },
                { name: 'EMILY TAYLOR', email: 'etaylor@example.com', pct: 64 },
                { name: 'LIAM MILLER', email: 'liamiller@example.com', pct: 50 },
              ].map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.2fr 1.6fr 0.6fr',
                    gap: 10,
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i === 3 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: '1px solid rgba(0,0,0,0.15)',
                        background: 'rgba(0,0,0,0.04)',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 10 }}>{row.name}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 800 }}>{row.email}</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        height: 8,
                        width: '100%',
                        borderRadius: 999,
                        border: '1px solid rgba(0,0,0,0.10)',
                        overflow: 'hidden',
                        background: 'rgba(0,0,0,0.04)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${row.pct}%`,
                          background: 'rgba(43, 91, 58, 0.55)',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: '1px solid rgba(0,0,0,0.12)',
                        background: 'rgba(170, 210, 160, 0.40)',
                        fontWeight: 900,
                        fontSize: 10,
                        minWidth: 48,
                        textAlign: 'center',
                      }}
                    >
                      {row.pct}%
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(0,0,0,0.12)',
                    width: 280,
                    background: '#fff',
                  }}
                >
                  <span style={{ opacity: 0.5 }}>🔎</span>
                  <input
                    placeholder="Search student by name, email & number"
                    style={{
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: 10,
                    }}
                  />
                  <span style={{ opacity: 0.5 }}>⚙️</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.6, color: '#2b5b3a' }}>
                BOOKMARKED SCANS
              </div>

              <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                {[
                  { label: 'YEAST', score: '80%', badge: 'rgba(170, 210, 160, 0.55)' },
                  { label: 'MOLD', score: '80%', badge: 'rgba(170, 210, 160, 0.55)' },
                ].map((x, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#fff',
                      border: '1px solid rgba(0,0,0,0.12)',
                      borderRadius: 14,
                      padding: 10,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                      display: 'grid',
                      gridTemplateColumns: '64px 1fr',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 52,
                        borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.10)',
                        background: 'rgba(0,0,0,0.04)',
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 900, fontSize: 11 }}>{x.label}</div>
                        <div
                          style={{
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: '1px solid rgba(0,0,0,0.10)',
                            background: x.badge,
                            fontWeight: 900,
                            fontSize: 10,
                          }}
                        >
                          {x.score}
                        </div>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, opacity: 0.7 }}>
                        Confidence Score:
                        <br />
                        Description:
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={{
                            border: '1px solid rgba(0,0,0,0.12)',
                            background: 'rgba(170, 210, 160, 0.35)',
                            borderRadius: 999,
                            padding: '5px 10px',
                            fontWeight: 900,
                            fontSize: 9,
                            cursor: 'pointer',
                          }}
                        >
                          LEARN MORE
                        </button>
                        <button
                          type="button"
                          style={{
                            border: '1px solid rgba(0,0,0,0.12)',
                            background: 'rgba(255, 182, 193, 0.40)',
                            borderRadius: 999,
                            padding: '5px 10px',
                            fontWeight: 900,
                            fontSize: 9,
                            cursor: 'pointer',
                          }}
                        >
                          VIEW MODEL
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.6, color: '#2b5b3a' }}>
                UPLOADED IMAGES
              </div>

              <div
                style={{
                  marginTop: 10,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  padding: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'rgba(0,0,0,0.04)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.6, color: '#2b5b3a' }}>
                SCAN HISTORY
              </div>

              <div
                style={{
                  marginTop: 10,
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 14,
                  padding: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: 52,
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'rgba(0,0,0,0.04)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  const renderProfile = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Profile</div>
        <div className="hiCardSub">Account settings</div>
      </div>

      <div className="hiProfileGrid">
        <div className="hiBox">
          <div className="hiBoxTitle">Profile Photo</div>
          <div className="hiPhotoRow">
            <div className="hiPhotoCircle">
              {profilePreview ? <img src={profilePreview} alt="preview" /> : '👤'}
            </div>
            <label className="hiUploadBtn">
              Upload Photo
              <input type="file" onChange={onPickImage} />
            </label>
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Name</div>
          <div className="hiFieldRow">
            <input
              className="hiInput"
              disabled={!editName}
              value={draft.fname}
              onChange={onDraftChange('fname')}
              placeholder="First name"
            />
            <input
              className="hiInput"
              disabled={!editName}
              value={draft.lname}
              onChange={onDraftChange('lname')}
              placeholder="Last name"
            />
          </div>
          <div className="hiActionsRow">
            {!editName ? (
              <button className="hiBtn" type="button" onClick={() => setEditName(true)}>
                Edit
              </button>
            ) : (
              <button className="hiBtn" type="button" onClick={saveName} disabled={savingKey === 'name'}>
                {savingKey === 'name' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Email</div>
          <input
            className="hiInput"
            disabled={!editEmail}
            value={draft.email}
            onChange={onDraftChange('email')}
            placeholder="Email"
          />
          <div className="hiActionsRow">
            {!editEmail ? (
              <button className="hiBtn" type="button" onClick={() => setEditEmail(true)}>
                Edit
              </button>
            ) : (
              <button className="hiBtn" type="button" onClick={saveEmail} disabled={savingKey === 'email'}>
                {savingKey === 'email' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Number</div>
          <input
            className="hiInput"
            disabled={!editNumber}
            value={draft.number}
            onChange={onDraftChange('number')}
            placeholder="Phone number"
          />
          <div className="hiActionsRow">
            {!editNumber ? (
              <button className="hiBtn" type="button" onClick={() => setEditNumber(true)}>
                Edit
              </button>
            ) : (
              <button className="hiBtn" type="button" onClick={saveNumber} disabled={savingKey === 'number'}>
                {savingKey === 'number' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Birthday</div>
          <input
            className="hiInput"
            type="date"
            disabled={!editDob}
            value={draft.dob}
            onChange={onDraftChange('dob')}
          />
          <div className="hiActionsRow">
            {!editDob ? (
              <button className="hiBtn" onClick={() => setEditDob(true)}>Edit</button>
            ) : (
              <button className="hiBtn" onClick={saveDob} disabled={savingKey === 'dob'}>
                {savingKey === 'dob' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Address</div>
          <textarea
            className="hiInput"
            disabled={!editAddress}
            value={draft.address}
            onChange={onDraftChange('address')}
            placeholder="Enter address"
            style={{ minHeight: 80, resize: 'vertical' }}
          />
          <div className="hiActionsRow">
            {!editAddress ? (
              <button className="hiBtn" onClick={() => setEditAddress(true)}>Edit</button>
            ) : (
              <button className="hiBtn" onClick={saveAddress} disabled={savingKey === 'address'}>
                {savingKey === 'address' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="hiBox">
          <div className="hiBoxTitle">Password</div>

          {editPassword && (
            <div className="hiFieldCol">
              <input
                className="hiInput"
                type="password"
                placeholder="Current Password"
                value={passDraft.currentPassword}
                onChange={onPassChange('currentPassword')}
              />
              <input
                className="hiInput"
                type="password"
                placeholder="New Password"
                value={passDraft.newPassword}
                onChange={onPassChange('newPassword')}
              />
              <input
                className="hiInput"
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
                    className="hiInput"
                    type="text"
                    placeholder="OTP Code"
                    value={passDraft.otpCode}
                    onChange={onPassChange('otpCode')}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="hiBtn"
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

          <div className="hiActionsRow">
            {!editPassword ? (
              <button className="hiBtn" type="button" onClick={() => setEditPassword(true)}>
                Change
              </button>
            ) : (
              <button className="hiBtn" type="button" onClick={savePassword} disabled={savingKey === 'password'}>
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
                className="hiBtn"
                onClick={() => setShowStayOrLogout(false)}
                style={{ flex: 1 }}
              >
                Stay Logged In
              </button>

              <button
                type="button"
                className="hiBtn"
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
    if (active === 'Learn Mycology') return renderLearn();
    if (active === 'Assessment') return renderAssessment();
    if (active === 'Model Library') return renderModelLibrary();
    if (active === 'Student Monitoring and Management') return renderMonitoringAndManagement();
    if (active === 'Profile') return renderProfile();
    return renderDashboard();
  };

  return (
    <div className="hiWrap">
      <aside className="hiSide">
        <div className="hiSideTop">
          <div className="hiLogo">MyphoLens</div>

          <div className="hiSectionTitle">OVERVIEW</div>

          <div className="hiNav">
            <button
              type="button"
              className={`hiNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => setActive('Dashboard')}
            >
              <span className="hiDot" />
              Dashboard
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Learn Mycology' ? 'active' : ''}`}
              onClick={() => setActive('Learn Mycology')}
            >
              <span className="hiDot" />
              Learn Mycology
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Assessment' ? 'active' : ''}`}
              onClick={() => setActive('Assessment')}
            >
              <span className="hiDot" />
              Assessment
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Model Library' ? 'active' : ''}`}
              onClick={() => setActive('Model Library')}
            >
              <span className="hiDot" />
              Model Library
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Student Monitoring and Management' ? 'active' : ''}`}
              onClick={() => setActive('Student Monitoring and Management')}
            >
              <span className="hiDot" />
              Student Monitoring & Management
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Profile' ? 'active' : ''}`}
              onClick={() => setActive('Profile')}
            >
              <span className="hiDot" />
              Profile
            </button>
          </div>
        </div>

        <div className="hiSideBottom">
          <button type="button" className="hiLogout" onClick={() => {
            if (!window.confirm('Are you sure you want to logout?')) return;
            handleLogout();
          }}>
            LOGOUT
          </button>
        </div>
      </aside>

      <section className="hiMain">
        <header className="hiTopbar">
          <form className="hiSearch" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Mycology Topics"
            />
            <button type="submit">⌕</button>
          </form>

          <div className="hiWelcome">
            <div className="hiAvatar" />
            <div className="hiWelcomeText">
              <div className="hiWelcomeTop">Welcome,</div>
              <div className="hiWelcomeUser">{usernameLabel}</div>
            </div>
          </div>
        </header>

        <div className="hiContent">{renderMain()}</div>
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}

export default HomeInstructor;
