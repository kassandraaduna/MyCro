import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './HomeStudent.css';

const API = 'http://localhost:8000/api';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDOB(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-').map((x) => Number(x));
  if (!y || !m || !d) return '';
  const month = monthNames[m - 1] || '';
  return `${month} ${d}, ${y}`;
}

function initialsOf(name) {
  const s = String(name || '').trim();
  if (!s) return 'S';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || 'S';
}

function HomePageStudent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState('Dashboard');
  const [sideOpen, setSideOpen] = useState(true);

  const [user, setUser] = useState(null);

  const [saved, setSaved] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    dob: '',
  });

  const [draft, setDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    dob: '',
  });

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editNumber, setEditNumber] = useState(false);
  const [editDob, setEditDob] = useState(false);

  const [showChangePass, setShowChangePass] = useState(false);

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
  const [timerTotal, setTimerTotal] = useState(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  const SCORE_KEY = 'studentAssessmentResults_v1';
  const readScoreStore = () => {
    try {
      const raw = localStorage.getItem(SCORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const writeScoreStore = (next) => {
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify(next || {}));
    } catch {}
  };

  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState('');
  const [lessons, setLessons] = useState([]);

  const [showLessonModal, setShowLessonModal] = useState(false);
  const [viewLesson, setViewLesson] = useState(null);

  const openLessonModal = (lesson) => {
    setViewLesson(lesson);
    setShowLessonModal(true);
  };

  const closeLessonModal = () => {
    setShowLessonModal(false);
    setViewLesson(null);
  };

  const fetchLessons = async () => {
    try {
      setLessonsLoading(true);
      setLessonsError('');
      const res = await axios.get(`${API}/lessons`);
      setLessons(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      setLessonsError(e?.response?.data?.message || 'Failed to load lessons.');
    } finally {
      setLessonsLoading(false);
    }
  };

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
    };

    setSaved(base);
    setDraft(base);

    setEditName(false);
    setEditEmail(false);
    setEditNumber(false);
    setEditDob(false);

    setPassDraft({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      otpCode: '',
      otpId: '',
      maskedEmail: '',
      expiresAt: '',
    });

    setShowChangePass(false);
  }, [user]);

  const userId = user?._id || '';

  const usernameLabel = useMemo(() => {
    if (!user) return 'student';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'student';
  }, [user]);

  const welcomeInitials = useMemo(
    () => initialsOf(`${user?.fname || ''} ${user?.lname || ''}`),
    [user]
  );

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/landing');
  };

  const handleLogoutConfirm = () => {
    setShowStayOrLogout(false);
    handleLogout();
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
      alert('Student not logged in properly. Please login again.');
      navigate('/login');
      return null;
    }

    const url = `${API}/meds/${userId}`;
    const res = await axios.put(url, payload);

    const returned = res.data;
    if (returned && typeof returned === 'object') {
      return { ...user, ...returned, ...payload };
    }
    return returned;
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

  const openChangePassModal = () => {
    setPassDraft({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      otpCode: '',
      otpId: '',
      maskedEmail: '',
      expiresAt: '',
    });
    setShowChangePass(true);
  };

  const closeChangePassModal = () => {
    if (savingKey === 'password') return;
    setShowChangePass(false);
    setPassDraft({
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      otpCode: '',
      otpId: '',
      maskedEmail: '',
      expiresAt: '',
    });
  };

  const savePassword = async () => {
    const err = validatePassword();
    if (err) return alert(err);

    try {
      setSavingKey('password');

      if (passDraft.otpId && passDraft.otpCode) {
        const res = await axios.post(`${API}/auth/change-password`, {
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
          setShowChangePass(false);
          setShowStayOrLogout(true);
        }
        return;
      }

      const res = await axios.post(`${API}/auth/change-password`, {
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
      const res = await axios.post(`${API}/auth/resend-change-password-otp`, {
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
    setTimerTotal(null);
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
      const res = await axios.get(`${API}/assessments`);
      const data = res.data?.data || res.data || [];
      setAssessments(Array.isArray(data) ? data : []);
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
      const res = await axios.get(`${API}/assessments/${assessmentId}`);
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

    const hasTimer =
      Boolean(selectedAssess?.timer?.enabled) || Boolean(selectedAssess?.timerEnabled);

    const timerMinutes =
      Number(selectedAssess?.timer?.minutes || 0) ||
      Math.round(Number(selectedAssess?.timerSeconds || 0) / 60);

    const timerSeconds = hasTimer ? Math.max(0, Number(timerMinutes) * 60) : 0;

    if (hasTimer && timerSeconds > 0) {
      setTimeLeft(timerSeconds);
      setTimerTotal(timerSeconds);

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
      setTimerTotal(null);
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
      if (!window.confirm(`You have ${unanswered.length} unanswered question(s). Are you sure you want to submit?`)) return;
    }

    try {
      setSubmitLoading(true);
      setAssessError('');
      stopTimer();

      if (!userId) {
        alert('Student not logged in properly. Please login again.');
        return;
      }
      const payload = {
        studentId: userId,
        answers: qs.map((q) => ({
          questionId: q._id,
          selectedIndex: answersMap[q._id] ?? null,
        })),
        timeSpentSec: computeTimeSpentSec(),
      };

      const res = await axios.post(
        `${API}/assessments/${selectedAssess._id}/submit`,
        payload
      );

      const data = res.data?.data || res.data;

      const store = readScoreStore();
      const next = {
        ...store,
        [selectedAssess._id]: {
          ...data,
          submittedAt: new Date().toISOString(),
        },
      };
      writeScoreStore(next);

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
    if (active !== 'Learn Mycology') return;
    fetchLessons();
  }, [active]);

  useEffect(() => {
    if (active !== 'Assessment') return;
    fetchAssessments();
  }, [active]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const renderDashboard = () => (
    <div className="hpCard">
      <div className="hpPageTitle">Dashboard</div>
      <div className="hpInnerCard">
        <div className="hpWelcomeCard">
          <div className="hpWelcomeCardTitle">Welcome, {usernameLabel}</div>
          <div className="hpWelcomeCardSub">Explore pages using the sidebar.</div>
        </div>
      </div>
    </div>
  );

  const renderLearn = () => (
    <div className="hpCard">
      <div className="hpTop">
        <div className="hpTopLeft">
          <div className="hpPageTitle" style={{ margin: 0 }}>Learn Mycology</div>
          <div className="hpSub">Lessons posted by instructors.</div>
        </div>

        <div className="hpTopRight">
          <button type="button" className="hpGhostBtn" onClick={fetchLessons} disabled={lessonsLoading}>
            Refresh
          </button>
        </div>
      </div>

      {lessonsError ? <div className="hpInlineError">{lessonsError}</div> : null}
      {lessonsLoading ? <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>Loading...</div> : null}

      <div className="hpCardsGrid" style={{ marginTop: 12 }}>
        {lessons.map((l) => (
          <div key={l._id} className="hpInnerCard">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>{l.title}</div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="hpPrimaryBtn"
                  style={{ padding: '8px 12px', fontSize: 13 }}
                  onClick={() => openLessonModal(l)}
                >
                  View
                </button>
              </div>
            </div>

            {l.educationalContent ? (
              <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 700 }}>
                {String(l.educationalContent).slice(0, 140)}
                {String(l.educationalContent).length > 140 ? '…' : ''}
              </div>
            ) : null}

            {(!l.educationalContent && (!l.modelUrls || !l.modelUrls.length)) ? (
              <div style={{ marginTop: 8, opacity: 0.7, fontWeight: 700 }}>No content attached.</div>
            ) : null}
          </div>
        ))}

        {!lessonsLoading && lessons.length === 0 ? (
          <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>No lessons yet.</div>
        ) : null}
      </div>

      {showLessonModal ? (
        <div className="hpModalOverlay" onMouseDown={closeLessonModal}>
          <div className="hpModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <button type="button" className="hpModalClose" onClick={closeLessonModal}>✕</button>

            <div className="hpModalHead">
              <div className="hpModalTitle">{viewLesson?.title || 'Lesson'}</div>
              <div className="hpModalSub">View only (read-only)</div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Educational Content</div>
              <div
                style={{
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 260,
                  overflowY: 'auto',
                  fontWeight: 700,
                  opacity: 0.9,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewLesson?.educationalContent || '—'}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>3D Models</div>
              {Array.isArray(viewLesson?.modelUrls) && viewLesson.modelUrls.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {viewLesson.modelUrls.map((url, idx) => (
                    <a key={idx} className="hpGhostBtn" href={url} target="_blank" rel="noreferrer">
                      Open Model #{idx + 1}
                    </a>
                  ))}
                </div>
              ) : viewLesson?.modelUrl ? (
                <a className="hpGhostBtn" href={viewLesson.modelUrl} target="_blank" rel="noreferrer">
                  Open Model
                </a>
              ) : (
                <div style={{ fontWeight: 800, opacity: 0.7 }}>No 3D models uploaded.</div>
              )}
            </div>

            <div className="hpModalActions" style={{ marginTop: 16 }}>
              <button type="button" className="hpGhostBtn" onClick={closeLessonModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderAssessment = () => {
    const scoreStore = readScoreStore();

    return (
      <div className="hpCard">
        <div className="hpTop">
          <div className="hpTopLeft">
            <div className="hpPageTitle" style={{ margin: 0 }}>Assessment</div>
            <div className="hpSub">Take quizzes created by instructors.</div>
          </div>

          <div className="hpTopRight">
            <button
              type="button"
              className="hpGhostBtn"
              onClick={fetchAssessments}
              disabled={assessLoading}
            >
              Refresh
            </button>

            {assessView !== 'list' ? (
              <button
                type="button"
                className="hpGhostBtn"
                onClick={resetAssessmentUI}
                disabled={submitLoading}
              >
                Back to list
              </button>
            ) : null}
          </div>
        </div>

        {assessError ? <div className="hpInlineError">{assessError}</div> : null}

        {assessView === 'list' && (
          <div className="hpCardsGrid">
            {assessLoading ? (
              <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>Loading...</div>
            ) : null}

            {!assessLoading && assessments.length === 0 ? (
              <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>No assessments yet.</div>
            ) : null}

            {assessments.map((a) => {
              const hasScore = Boolean(scoreStore?.[a._id]);

              const timerMinutes = a?.timer?.enabled
                ? Number(a.timer.minutes)
                : (a.timerEnabled ? Math.round(Number(a.timerSeconds || 0) / 60) : 0);

              const timerLabel = (timerMinutes > 0)
                ? `Timer: ${timerMinutes} min`
                : 'Timer: none';

              return (
                <div key={a._id} className="hpInnerCard hpAssCard">
                  <div className="hpAssTopRow">
                    <div className="hpAssTitle">{a.title || 'Untitled Assessment'}</div>

                    <div className="hpAssActions">
                      <button
                        type="button"
                        className="hpPrimaryBtn"
                        onClick={() => openAssessmentDetails(a._id)}
                        disabled={assessLoading}
                      >
                        {hasScore ? 'Take Again' : 'Take Quiz'}
                      </button>
                    </div>
                  </div>

                  <div className="hpAssMeta">
                    {timerLabel} • {a.questions?.length || 0} questions • {timeAgo(a.createdAt)}
                  </div>

                  {hasScore ? (
                    <div className="hpScoreMini">
                      <div className="hpScoreMiniLabel">Last Score</div>
                      <div className="hpScoreMiniValue">
                        {scoreStore?.[a._id]?.score} / {scoreStore?.[a._id]?.total}
                        {typeof scoreStore?.[a._id]?.percent === 'number'
                          ? ` (${scoreStore?.[a._id]?.percent}%)`
                          : ''}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {assessView === 'details' && selectedAssess && (
          <div className="hpInnerCard" style={{ marginTop: 14 }}>
            <div className="hpAssTitle" style={{ fontSize: 18 }}>
              {selectedAssess.title || 'Untitled Assessment'}
            </div>

            <div className="hpAssMeta" style={{ marginTop: 6 }}>
              {selectedAssess?.timer?.enabled
                ? `Timer: ${selectedAssess.timer.minutes} minutes`
                : (selectedAssess?.timerEnabled
                    ? `Timer: ${Math.round(Number(selectedAssess.timerSeconds || 0) / 60)} minutes`
                    : 'Timer: none')}
              {Array.isArray(selectedAssess.questions)
                ? ` • Questions: ${selectedAssess.questions.length}`
                : ''}
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="hpPrimaryBtn"
                onClick={startTakingAssessment}
                disabled={assessLoading}
              >
                Start
              </button>

            </div>

            <div className="hpMuted" style={{ marginTop: 12 }}>
              Tip: Make sure stable internet before submitting.
            </div>
          </div>
        )}

        {assessView === 'take' && selectedAssess && (
          <div className="hpTakeGrid" style={{ marginTop: 14 }}>
            <div className="hpInnerCard">
              <div className="hpAssTitle" style={{ fontSize: 18 }}>
                {selectedAssess.title || 'Assessment'}
              </div>
              <div className="hpAssMeta" style={{ marginTop: 6 }}>
                Answer all questions then submit.
              </div>

              <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
                {(selectedAssess.questions || []).map((q, idx) => {
                  const qid = q._id;
                  const selected = answersMap[qid];

                  return (
                    <div key={qid} className="hpQCard">
                      <div className="hpQTitle">
                        {idx + 1}. {q.text}
                        {typeof q.points === 'number' ? (
                          <span className="hpQPoints">({q.points} pts)</span>
                        ) : null}
                      </div>

                      <div className="hpChoices">
                        {(q.options || []).map((c, ci) => (
                          <label
                            key={`${qid}_${ci}`}
                            className={`hpChoice ${selected === ci ? 'active' : ''}`}
                            style={{ cursor: submitLoading ? 'not-allowed' : 'pointer' }}
                          >
                            <input
                              type="radio"
                              name={`q_${qid}`}
                              checked={selected === ci}
                              disabled={submitLoading}
                              onChange={() => pickAnswer(qid, ci)}
                            />
                            <div className="hpChoiceText">{c}</div>
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
                  className="hpPrimaryBtn"
                  onClick={() => submitAssessment(false)}
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Submitting...' : 'Submit'}
                </button>

                <button
                  type="button"
                  className="hpGhostBtn"
                  onClick={resetAssessmentUI}
                  disabled={submitLoading}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="hpTimerCol">
              {(selectedAssess?.timer?.enabled || selectedAssess?.timerEnabled) && typeof timeLeft === 'number' ? (
                <div className="hpInnerCard hpTimerCard">
                  <div className="hpBoxTitle">TIMER</div>
                  <div className={`hpTimerValue ${timeLeft <= 10 ? 'danger' : ''}`}>
                    {formatTime(timeLeft)}
                  </div>

                  {typeof timerTotal === 'number' && timerTotal > 0 ? (
                    <div className="hpTimerBar">
                      <div
                        className="hpTimerBarFill"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((timeLeft / timerTotal) * 100)))}%`,
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="hpMuted" style={{ marginTop: 10 }}>
                    Keep an eye on the timer while answering.
                  </div>
                </div>
              ) : (
                <div className="hpInnerCard hpTimerCard">
                  <div className="hpBoxTitle">TIMER</div>
                  <div className="hpMuted">No timer for this quiz.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {assessView === 'result' && (
          <div className="hpInnerCard" style={{ marginTop: 14 }}>
            <div className="hpAssTitle" style={{ fontSize: 18 }}>Result</div>

            {result ? (
              <div className="hpResultBox" style={{ marginTop: 12 }}>
                <div className="hpResultScore">
                  Score: {result.score} / {result.total}
                  {typeof result.percent === 'number' ? ` (${result.percent}%)` : ''}
                </div>

                <div className="hpResultLabel" style={{ marginTop: 10 }}>Feedback:</div>
                <div className="hpResultText">
                  {result.feedback || 'No feedback configured.'}
                </div>
              </div>
            ) : (
              <div className="hpMuted" style={{ marginTop: 12 }}>Submitted.</div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="hpPrimaryBtn"
                onClick={() => {
                  if (selectedAssess?._id) openAssessmentDetails(selectedAssess._id);
                  else resetAssessmentUI();
                }}
              >
                Take Again
              </button>

              <button type="button" className="hpGhostBtn" onClick={resetAssessmentUI}>
                Back to list
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScanner = () => (
    <div className="hpCard">
      <div className="hpPageTitle">AI Scanner</div>
      <div className="hpSub">Scanner UI will appear here.</div>

      <div className="hpInnerCard" style={{ marginTop: 14 }}>
        <div className="hpSectionBody">
          <div className="hpSectionTitle2">Coming soon</div>
          <div className="hpSectionText">Add scanning flow and results here.</div>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="hpCard">
      <div className="hpPageTitle">Progress & Performance</div>
      <div className="hpSub">Track your progress and performance.</div>

      <div className="hpInnerCard" style={{ marginTop: 14 }}>
        <div className="hpSectionBody">
          <div className="hpSectionTitle2">Coming soon</div>
          <div className="hpSectionText">Charts and history will appear here.</div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="hpCard">
      <div className="hpPageTitle">Profile</div>

      <div className="hpProfilePhotoCard">
        <div className="hpProfilePhotoLeft">
          <div className="hpBigAvatarWrap">
            <div className="hpBigAvatar">
              {profilePreview ? (
                <img src={profilePreview} alt="profile" />
              ) : (
                <span className="hpBigAvatarTxt">{welcomeInitials}</span>
              )}
            </div>

            <label className="hpAvatarEdit" title="Upload new photo">
              <PencilMini />
              <input type="file" onChange={onPickImage} />
            </label>
          </div>

          <div className="hpProfilePhotoText">
            <div className="hpProfilePhotoTitle">Student Profile Photo</div>
            <div className="hpProfilePhotoSub">Recommended size: 400×400px. JPG or PNG.</div>
            <label className="hpUploadLink">
              Upload New Photo
              <input type="file" onChange={onPickImage} />
            </label>
          </div>
        </div>
      </div>

      <div className="hpProfileGrid">
        <div className="hpBox">
          <div className="hpBoxHead">
            <div className="hpBoxTitle">FULL NAME</div>
            <button
              type="button"
              className="hpIconBtn"
              title={!editName ? 'Edit' : 'Save'}
              onClick={!editName ? () => setEditName(true) : saveName}
              disabled={savingKey === 'name'}
            >
              {editName ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editName ? (
            <div className="hpTwoColValues">
              <div>
                <div className="hpSmallLabel">First Name</div>
                <div className="hpValueText">{saved.fname || '—'}</div>
              </div>
              <div>
                <div className="hpSmallLabel">Last Name</div>
                <div className="hpValueText">{saved.lname || '—'}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="hpFieldRow">
                <div className="hpFieldBlock">
                  <div className="hpFieldLabel">First Name</div>
                  <input className="hpInput" value={draft.fname} onChange={onDraftChange('fname')} />
                </div>

                <div className="hpFieldBlock">
                  <div className="hpFieldLabel">Last Name</div>
                  <input className="hpInput" value={draft.lname} onChange={onDraftChange('lname')} />
                </div>
              </div>

              <button
                type="button"
                className="hpMiniGhost"
                onClick={() => {
                  setEditName(false);
                  setDraft(saved);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="hpBox">
          <div className="hpBoxHead">
            <div className="hpBoxTitle">EMAIL ADDRESS</div>
            <button
              type="button"
              className="hpIconBtn"
              title={!editEmail ? 'Edit' : 'Save'}
              onClick={!editEmail ? () => setEditEmail(true) : saveEmail}
              disabled={savingKey === 'email'}
            >
              {editEmail ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editEmail ? (
            <div className="hpValueText">{saved.email || '—'}</div>
          ) : (
            <>
              <input className="hpInput" value={draft.email} onChange={onDraftChange('email')} />
              <button
                type="button"
                className="hpMiniGhost"
                onClick={() => {
                  setEditEmail(false);
                  setDraft(saved);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="hpBox">
          <div className="hpBoxHead">
            <div className="hpBoxTitle">PHONE NUMBER</div>
            <button
              type="button"
              className="hpIconBtn"
              title={!editNumber ? 'Edit' : 'Save'}
              onClick={!editNumber ? () => setEditNumber(true) : saveNumber}
              disabled={savingKey === 'number'}
            >
              {editNumber ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editNumber ? (
            <div className="hpValueText">{saved.number || '—'}</div>
          ) : (
            <>
              <input className="hpInput" value={draft.number} onChange={onDraftChange('number')} />
              <button
                type="button"
                className="hpMiniGhost"
                onClick={() => {
                  setEditNumber(false);
                  setDraft(saved);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="hpBox">
          <div className="hpBoxHead">
            <div className="hpBoxTitle">BIRTHDAY</div>
            <button
              type="button"
              className="hpIconBtn"
              title={!editDob ? 'Edit' : 'Save'}
              onClick={!editDob ? () => setEditDob(true) : saveDob}
              disabled={savingKey === 'dob'}
            >
              {editDob ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editDob ? (
            <div className="hpValueText">{formatDOB(saved.dob) || '—'}</div>
          ) : (
            <>
              <input className="hpInput" type="date" value={draft.dob} onChange={onDraftChange('dob')} />
              <button
                type="button"
                className="hpMiniGhost"
                onClick={() => {
                  setEditDob(false);
                  setDraft(saved);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="hpBox" style={{ gridColumn: '1 / -1' }}>
          <div className="hpPassRow">
            <div>
              <div className="hpBoxTitle">ACCOUNT PASSWORD</div>
              <div className="hpSub" style={{ marginTop: 6 }}>Change password requires OTP.</div>
            </div>

            <button type="button" className="hpPrimaryBtn" onClick={openChangePassModal}>
              <GearIcon />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {showChangePass ? (
        <div className="hpModalOverlay" onMouseDown={closeChangePassModal}>
          <div className="hpModalCard" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="hpModalClose" onClick={closeChangePassModal}>
              ✕
            </button>

            <div className="hpModalHead">
              <div className="hpModalTitle">Change Password</div>
              <div className="hpModalSub">Enter your current password and a new password</div>
            </div>

            <div className="hpFormCol">
              <label className="hpLabel">Current Password</label>
              <input
                className="hpInput"
                type="password"
                placeholder="Current Password"
                value={passDraft.currentPassword}
                onChange={onPassChange('currentPassword')}
              />
            </div>

            <div className="hpFormCol" style={{ marginTop: 10 }}>
              <label className="hpLabel">New Password</label>
              <input
                className="hpInput"
                type="password"
                placeholder="New Password"
                value={passDraft.newPassword}
                onChange={onPassChange('newPassword')}
              />
            </div>

            <div className="hpFormCol" style={{ marginTop: 10 }}>
              <label className="hpLabel">Confirm New Password</label>
              <input
                className="hpInput"
                type="password"
                placeholder="Confirm New Password"
                value={passDraft.confirmNewPassword}
                onChange={onPassChange('confirmNewPassword')}
              />
            </div>

            {passDraft.otpId ? (
              <>
                <div className="hpOtpHint">
                  Enter OTP sent to <b>{passDraft.maskedEmail || 'your email'}</b>
                </div>

                <div className="hpFormCol" style={{ marginTop: 10 }}>
                  <label className="hpLabel">OTP Code</label>
                  <input
                    className="hpInput"
                    type="text"
                    placeholder="OTP Code"
                    value={passDraft.otpCode}
                    onChange={onPassChange('otpCode')}
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="button"
                  className="hpGhostBtn"
                  onClick={resendChangePassOtp}
                  disabled={savingKey === 'password'}
                  style={{ marginTop: 10 }}
                >
                  Resend OTP
                </button>
              </>
            ) : null}

            <div className="hpModalActions">
              <button type="button" className="hpGhostBtn" onClick={closeChangePassModal} disabled={savingKey === 'password'}>
                Cancel
              </button>

              <button type="button" className="hpPrimaryBtn" onClick={savePassword} disabled={savingKey === 'password'}>
                {savingKey === 'password'
                  ? 'Saving...'
                  : passDraft.otpId
                    ? 'Verify & Save'
                    : 'Send OTP'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStayOrLogout ? (
        <div className="hpModalOverlay" onMouseDown={() => setShowStayOrLogout(false)}>
          <div className="hpModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button type="button" className="hpModalClose" onClick={() => setShowStayOrLogout(false)}>
              ✕
            </button>

            <div className="hpModalHead">
              <div className="hpModalTitle">Password changed successfully</div>
              <div className="hpModalSub">Do you want to stay logged in or logout?</div>
            </div>

            <div className="hpModalActions">
              <button type="button" className="hpGhostBtn" onClick={() => setShowStayOrLogout(false)} style={{ flex: 1 }}>
                Stay Logged In
              </button>

              <button type="button" className="hpPrimaryBtn" onClick={handleLogoutConfirm} style={{ flex: 1 }}>
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
    if (active === 'AI Scanner') return renderScanner();
    if (active === 'Progress & Performance') return renderProgress();
    if (active === 'Profile') return renderProfile();
    return renderDashboard();
  };

  const handleNav = (name) => {
    setActive(name);
    if (name !== 'Assessment') resetAssessmentUI();
  };

  return (
    <div className={`hpWrap ${sideOpen ? '' : 'collapsed'}`}>
      <aside className="hpSide">
        <div className="hpSideTop">
          <div className="hpLogoRow">
            <div className="hpLogo">MyphoLens</div>

            <button
              type="button"
              className="hpCollapseBtn"
              onClick={() => setSideOpen((p) => !p)}
              title={sideOpen ? 'Collapse menu' : 'Expand menu'}
            >
              {sideOpen ? '❮' : '❯'}
            </button>
          </div>

          <div className="hpSectionTitle">STUDENT PANEL</div>

          <div className="hpNav">
            <button
              type="button"
              className={`hpNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('Dashboard')}
              title="Dashboard"
            >
              <span className="hpNavIcon"><DashIcon /></span>
              <span className="hpNavText">Dashboard</span>
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Learn Mycology' ? 'active' : ''}`}
              onClick={() => handleNav('Learn Mycology')}
              title="Learn Mycology"
            >
              <span className="hpNavIcon"><BookIcon /></span>
              <span className="hpNavText">Learn Mycology</span>
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Assessment' ? 'active' : ''}`}
              onClick={() => handleNav('Assessment')}
              title="Assessment"
            >
              <span className="hpNavIcon"><QuizIcon /></span>
              <span className="hpNavText">Assessment</span>
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'AI Scanner' ? 'active' : ''}`}
              onClick={() => handleNav('AI Scanner')}
              title="AI Scanner"
            >
              <span className="hpNavIcon"><SearchIcon /></span>
              <span className="hpNavText">AI Scanner</span>
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Progress & Performance' ? 'active' : ''}`}
              onClick={() => handleNav('Progress & Performance')}
              title="Progress & Performance"
            >
              <span className="hpNavIcon"><ChartIcon /></span>
              <span className="hpNavText">Progress</span>
            </button>

            <button
              type="button"
              className={`hpNavBtn ${active === 'Profile' ? 'active' : ''}`}
              onClick={() => handleNav('Profile')}
              title="Profile"
            >
              <span className="hpNavIcon"><ProfileIcon /></span>
              <span className="hpNavText">Profile</span>
            </button>
          </div>
        </div>

        <div className="hpSideBottom">
          <button
            type="button"
            className="hpLogoutClean"
            onClick={() => {
              if (!window.confirm('Are you sure you want to logout?')) return;
              handleLogout();
            }}
            title="Logout"
          >
            <span className="hpLogoutIcon"><LogoutIcon /></span>
            <span className="hpLogoutText">LOGOUT</span>
          </button>
        </div>
      </aside>

      <section className="hpMain">
        <header className="hpTopbar">
          <div className="hpWelcomeRight">
            <div className="hpWelcome">
              <div className="hpWelcomeText">
                <div className="hpWelcomeTop">Welcome,</div>
                <div className="hpWelcomeUser">{usernameLabel}</div>
              </div>

              <div className="hpAvatarSmall" title="Student">
                {profilePreview ? <img src={profilePreview} alt="avatar" /> : welcomeInitials}
              </div>
            </div>
          </div>
        </header>

        <div className="hpContent">{renderMain()}</div>
      </section>
    </div>
  );
}

function timeAgo(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now - d;
  const sec = Math.floor(diffMs / 1000);

  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;

  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;

  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

//icons
function DashIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 13h8V4H4v9Zm0 7h8v-5H4v5Zm10 0h6V11h-6v9Zm0-18v7h6V2h-6Z" fill="currentColor" /></svg>); }
function BookIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19a2 2 0 0 0 2 2h14V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14Z" stroke="currentColor" strokeWidth="2.2" /><path d="M8 7h8M8 11h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>); }
function QuizIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="2.2" /><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>); }
function ProfileIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2.2" /><path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>); }
function LogoutIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 17v-2h4v-2h-4v-2l-3 3 3 3Zm-6 4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8v2H4v14h8v2H4Zm12-16h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4v-2h4V7h-4V5Z" fill="currentColor" /></svg>); }
function SearchIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2.2" /><path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>); }
function ChartIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19V5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M4 19h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M8 17v-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M12 17v-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M16 17v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>); }
function PencilMini() {return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>);}
function PencilIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>);}
function CheckIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);}
function GearIcon() {return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2.2" /><path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.5-2.3.7a7.8 7.8 0 0 0-1.7-1L15 4h-6l-.5 2.9a7.8 7.8 0 0 0-1.7 1l-2.3-.7-2 3.5 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.5 2.3-.7a7.8 7.8 0 0 0 1.7 1L9 20h6l.5-2.9a7.8 7.8 0 0 0 1.7-1l2.3.7 2-3.5-2-1.2Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" /></svg>);}

export default HomePageStudent;
