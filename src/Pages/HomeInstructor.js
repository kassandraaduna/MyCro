import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  if (!s) return 'I';
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join('') || 'I';
}

function normalizeQuestion(q) {
  const options = Array.isArray(q?.options) ? q.options : ['', '', '', ''];
  const fixedOpts = [...options];
  while (fixedOpts.length < 4) fixedOpts.push('');
  return {
    text: String(q?.text || ''),
    points: Number(q?.points || 1),
    options: fixedOpts.slice(0, 4).map((o) => String(o ?? '')),
    correctIndex: Number.isFinite(Number(q?.correctIndex)) ? Number(q.correctIndex) : 0,
  };
}

function normalizeRange(r) {
  return {
    min: Number.isFinite(Number(r?.min)) ? Number(r.min) : 0,
    max: Number.isFinite(Number(r?.max)) ? Number(r.max) : 0,
    message: String(r?.message || ''),
  };
}

function safeFullName(obj) {
  if (!obj) return '';
  const fname = String(obj.fname || obj.firstName || '').trim();
  const lname = String(obj.lname || obj.lastName || '').trim();
  const joined = `${fname} ${lname}`.trim();
  return joined || String(obj.studentName || obj.name || '').trim();
}

function formatDateTime(dt) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return '—';
  }
}

function HomeInstructor() {
  const [toast, setToast] = useState('');
  const [showStayOrLogout, setShowStayOrLogout] = useState(false);

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
    dob: ''
  });

  const [draft, setDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    dob: ''
  });

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editNumber, setEditNumber] = useState(false);
  const [editDob, setEditDob] = useState(false);

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

  const [showChangePass, setShowChangePass] = useState(false);

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

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archived, setArchived] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editAss, setEditAss] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUseTimer, setEditUseTimer] = useState(false);
  const [editTimerMinutes, setEditTimerMinutes] = useState(10);
  const [editQuestions, setEditQuestions] = useState([emptyQuestion()]);
  const [editRanges, setEditRanges] = useState([emptyRange()]);
  const [editFormError, setEditFormError] = useState('');

  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringError, setMonitoringError] = useState('');
  const [monitoringData, setMonitoringData] = useState([]);

  const [takesModalOpen, setTakesModalOpen] = useState(false);
  const [takesModalTitle, setTakesModalTitle] = useState('');
  const [takesModalSubtitle, setTakesModalSubtitle] = useState('');
  const [takesModalAttempts, setTakesModalAttempts] = useState([]);
  const [takesModalLoading, setTakesModalLoading] = useState(false);

  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState('');
  const [lessons, setLessons] = useState([]);

  const [showAddLesson, setShowAddLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonEducationalContent, setLessonEducationalContent] = useState('');
  const [lessonModels, setLessonModels] = useState([]); 
  const [lessonFormError, setLessonFormError] = useState('');

  const [openLessonMenuId, setOpenLessonMenuId] = useState(null);
  const lessonMenuRef = useRef(null);

  const [showEditLesson, setShowEditLesson] = useState(false);
  const [editLessonId, setEditLessonId] = useState('');
  const [editLessonTitle, setEditLessonTitle] = useState('');
  const [editLessonEducationalContent, setEditLessonEducationalContent] = useState('');
  const [editLessonModels, setEditLessonModels] = useState([]); 
  const [editLessonExistingModels, setEditLessonExistingModels] = useState([]); 
  const [editLessonError, setEditLessonError] = useState('');

  const [showLessonArchiveModal, setShowLessonArchiveModal] = useState(false);
  const [archivedLessons, setArchivedLessons] = useState([]);

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
  }, [user]);

  const userId = user?._id || '';

  const usernameLabel = useMemo(() => {
    if (!user) return 'instructor';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'instructor';
  }, [user]);

  const welcomeInitials = useMemo(
    () => initialsOf(`${user?.fname || ''} ${user?.lname || ''}`),
    [user]
  );

  useEffect(() => {
    const onDoc = (e) => {
      if (!openLessonMenuId) return;
      if (lessonMenuRef.current && lessonMenuRef.current.contains(e.target)) return;
      setOpenLessonMenuId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openLessonMenuId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Landing');
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
      setToast('Birthday updated!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to update birthday.');
    } finally {
      setSavingKey('');
    }
  };

  const savePassword = async () => {
    const err = validatePassword();
    if (err) return setToast(err);

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
          setShowChangePass(false);
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

      const res = await axios.get(`${API}/assessments?includeArchived=true`);
      const data = res.data?.data || [];

      setAssessments(data.filter(x => !x?.isArchived));
      setArchived(data.filter(x => !!x?.isArchived));
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

  const validateAssessmentForm = (title, useTimer, timerMinutes, questions, ranges) => {
    if (!String(title || '').trim()) return 'Quiz title is required.';
    if (useTimer && (!timerMinutes || Number(timerMinutes) <= 0)) return 'Timer minutes must be > 0.';

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!String(q.text || '').trim()) return `Question #${i + 1} is empty.`;
      if (!q.points || Number(q.points) <= 0) return `Question #${i + 1} points must be > 0.`;

      const opts = Array.isArray(q.options) ? q.options : [];
      const filledOptions = opts.filter((o) => String(o || '').trim() !== '');
      if (filledOptions.length < 2) return `Question #${i + 1} needs at least 2 options.`;

      if (q.correctIndex < 0 || q.correctIndex >= opts.length) return `Invalid correct answer on question #${i + 1}.`;
      if (!String(opts[q.correctIndex] || '').trim()) return `Correct answer is blank on question #${i + 1}.`;
    }

    if (!ranges.length) return 'Add at least 1 feedback range.';
    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      if (r.min === '' || r.max === '') return `Range #${i + 1} min/max required.`;
      if (Number(r.min) > Number(r.max)) return `Range #${i + 1} min cannot be greater than max.`;
      if (!String(r.message || '').trim()) return `Range #${i + 1} message is required.`;
    }

    return null;
  };

  const saveAssessment = async () => {
    const err = validateAssessmentForm(assTitle, assUseTimer, assTimerMinutes, assQuestions, assRanges);
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
          text: String(q.text || '').trim(),
          points: Number(q.points),
          options: (q.options || []).map((o) => String(o || '')),
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

  const archiveAssessment = async (ass) => {
    if (!ass?._id) return;
    const ok = window.confirm('Archive this assessment?');
    if (!ok) return;

    try {
      setAssLoading(true);
      const res = await axios.put(`${API}/assessments/${ass._id}/archive`);
      const updated = res.data?.data || null;

      setAssessments((prev) => prev.filter((x) => x?._id !== ass._id));
      if (updated) setArchived((prev) => [updated, ...prev]);

      setToast('Assessment archived!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to archive.');
    } finally {
      setAssLoading(false);
    }
  };

  const restoreArchived = async (ass) => {
    if (!ass?._id) return;

    const ok = window.confirm('Restore this assessment?');
    if (!ok) return;

    try {
      setAssLoading(true);
      const res = await axios.put(`${API}/assessments/${ass._id}/restore`);
      const updated = res.data?.data || null;

      setArchived((prev) => prev.filter((x) => x?._id !== ass._id));
      if (updated) setAssessments((prev) => [updated, ...prev]);

      setToast('Assessment restored!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to restore.');
    } finally {
      setAssLoading(false);
    }
  };

  const deleteArchivedPermanent = async (ass) => {
    if (!ass?._id) return;
    const ok = window.confirm('Permanently delete this archived assessment?');
    if (!ok) return;

    try {
      setAssLoading(true);
      await axios.delete(`${API}/assessments/${ass._id}`);
      setArchived((prev) => prev.filter((x) => x?._id !== ass._id));
      setToast('Archived assessment deleted!');
    } catch (e) {
      console.error(e);
      setToast(e?.response?.data?.message || 'Failed to delete archived assessment.');
    } finally {
      setAssLoading(false);
    }
  };

  const openEdit = (ass) => {
    setEditAss(ass);

    setEditTitle(ass?.title || '');
    setEditUseTimer(!!ass?.timer?.enabled);
    setEditTimerMinutes(Number(ass?.timer?.minutes || 10));

    const qs = Array.isArray(ass?.questions) ? ass.questions.map(normalizeQuestion) : [emptyQuestion()];
    const rs = Array.isArray(ass?.feedbackRanges) ? ass.feedbackRanges.map(normalizeRange) : [emptyRange()];

    setEditQuestions(qs.length ? qs : [emptyQuestion()]);
    setEditRanges(rs.length ? rs : [emptyRange()]);
    setEditFormError('');
    setShowEditModal(true);
  };

  const closeEdit = () => {
    if (assLoading) return;
    setShowEditModal(false);
    setEditAss(null);
    setEditTitle('');
    setEditUseTimer(false);
    setEditTimerMinutes(10);
    setEditQuestions([emptyQuestion()]);
    setEditRanges([emptyRange()]);
    setEditFormError('');
  };

  const saveEdit = async () => {
    if (!editAss?._id) return;

    const err = validateAssessmentForm(editTitle, editUseTimer, editTimerMinutes, editQuestions, editRanges);
    if (err) {
      setEditFormError(err);
      return;
    }

    try {
      setEditFormError('');
      setAssLoading(true);

      const payload = {
        title: editTitle.trim(),
        timer: editUseTimer
          ? { enabled: true, minutes: Number(editTimerMinutes) }
          : { enabled: false, minutes: null },
        questions: editQuestions.map((q) => ({
          text: String(q.text || '').trim(),
          points: Number(q.points),
          options: (q.options || []).map((o) => String(o || '')),
          correctIndex: Number(q.correctIndex),
        })),
        feedbackRanges: editRanges.map((r) => ({
          min: Number(r.min),
          max: Number(r.max),
          message: String(r.message || '').trim(),
        })),
      };

      const res = await axios.put(`${API}/assessments/${editAss._id}`, payload);
      const updated = res.data?.data || res.data;

      const merged = updated && typeof updated === 'object' ? { ...editAss, ...updated } : { ...editAss, ...payload };

      setAssessments((prev) =>
        prev.map((x) => (x?._id === editAss._id ? merged : x))
      );

      setToast('Assessment updated!');
      closeEdit();
    } catch (e) {
      console.error(e);
      setToast(e?.response?.data?.message || 'Failed to update assessment.');
    } finally {
      setAssLoading(false);
    }
  };

  const fetchMonitoring = async () => {
    try {
      setMonitoringLoading(true);
      setMonitoringError('');

      const res = await axios.get(`${API}/instructor/assessment-monitoring`);
      setMonitoringData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (e) {
      setMonitoringError(e?.response?.data?.message || 'Failed to load student monitoring.');
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    if (active !== 'Student Monitoring and Management') return;
    fetchMonitoring();
  }, [active]);

  const openTakesModal = async ({ student, assessment }) => {
    const studentName = safeFullName(student) || student?.studentName || 'Student';
    const assessmentTitle = assessment?.title || 'Assessment';

    setTakesModalTitle(studentName);
    setTakesModalSubtitle(assessmentTitle);
    setTakesModalAttempts(Array.isArray(assessment?.attempts) ? assessment.attempts : []);
    setTakesModalOpen(true);

    if (!Array.isArray(assessment?.attempts) || assessment.attempts.length === 0) {
      const studentId = student?.studentId || student?._id || student?.id;
      const assessmentId = assessment?.assessmentId || assessment?._id || assessment?.id;

      if (!studentId || !assessmentId) return;

      try {
        setTakesModalLoading(true);

        const res = await axios.get(`${API}/instructor/assessments/${assessmentId}/attempts`);
        const attempts = Array.isArray(res.data?.data) ? res.data.data : [];

        const filtered = attempts.filter(a => String(a.studentId) === String(studentId));

        setTakesModalAttempts(filtered);

      } catch (e) {
        setToast('Failed to load attempts for this student.');
      } finally {
        setTakesModalLoading(false);
      }
    }
  };

  const closeTakesModal = () => {
    if (takesModalLoading) return;
    setTakesModalOpen(false);
    setTakesModalTitle('');
    setTakesModalSubtitle('');
    setTakesModalAttempts([]);
  };

  const fetchLessons = async () => {
    try {
      setLessonsLoading(true);
      setLessonsError('');
      const res = await axios.get(`${API}/lessons?includeArchived=true`);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];

      setLessons(data.filter((x) => !x?.isArchived));
      setArchivedLessons(data.filter((x) => !!x?.isArchived));
    } catch (e) {
      setLessonsError(e?.response?.data?.message || 'Failed to load lessons.');
    } finally {
      setLessonsLoading(false);
    }
  };

  useEffect(() => {
    if (active !== 'Learn Mycology') return;
    fetchLessons();
  }, [active]);

  const resetLessonForm = () => {
    setLessonTitle('');
    setLessonEducationalContent('');
    setLessonModels([]);
    setLessonFormError('');
  };

  const createLesson = async () => {
    if (!String(lessonTitle || '').trim()) {
      setLessonFormError('Title is required.');
      return;
    }
    if (!String(lessonEducationalContent || '').trim()) {
      setLessonFormError('Educational Content is required.');
      return;
    }

    try {
      setLessonFormError('');
      setLessonsLoading(true);

      const fd = new FormData();
      fd.append('title', lessonTitle.trim());
      fd.append('educationalContent', String(lessonEducationalContent || '').trim());
      fd.append('createdBy', userId || '');
      lessonModels.forEach((f) => fd.append('models', f)); 

      const res = await axios.post(`${API}/lessons`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const created = res.data?.data;
      if (created) setLessons((prev) => [created, ...prev]);

      setShowAddLesson(false);
      resetLessonForm();
      setToast('Lesson added!');
    } catch (e) {
      setLessonFormError(e?.response?.data?.message || 'Failed to add lesson.');
    } finally {
      setLessonsLoading(false);
    }
  };

  const openEditLessonModal = (lesson) => {
    setOpenLessonMenuId(null);
    setEditLessonError('');
    setEditLessonId(lesson?._id || '');
    setEditLessonTitle(lesson?.title || '');
    setEditLessonEducationalContent(lesson?.educationalContent || lesson?.description || '');
    const existing = Array.isArray(lesson?.models) ? lesson.models : (Array.isArray(lesson?.modelUrls) ? lesson.modelUrls : []);
    setEditLessonExistingModels(existing);
    setEditLessonModels([]);
    setShowEditLesson(true);
  };

  const closeEditLessonModal = () => {
    if (lessonsLoading) return;
    setShowEditLesson(false);
    setEditLessonId('');
    setEditLessonTitle('');
    setEditLessonEducationalContent('');
    setEditLessonModels([]);
    setEditLessonExistingModels([]);
    setEditLessonError('');
  };

  const saveEditLesson = async () => {
    if (!editLessonId) return;

    if (!String(editLessonTitle || '').trim()) {
      setEditLessonError('Title is required.');
      return;
    }
    if (!String(editLessonEducationalContent || '').trim()) {
      setEditLessonError('Educational Content is required.');
      return;
    }

    try {
      setEditLessonError('');
      setLessonsLoading(true);

      const fd = new FormData();
      fd.append('title', editLessonTitle.trim());
      fd.append('educationalContent', String(editLessonEducationalContent || '').trim());
      editLessonModels.forEach((f) => fd.append('models', f));

      const res = await axios.put(`${API}/lessons/${editLessonId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updated = res.data?.data || res.data;
      const merged = updated && typeof updated === 'object'
        ? updated
        : {
            _id: editLessonId,
            title: editLessonTitle.trim(),
            educationalContent: String(editLessonEducationalContent || '').trim(),
          };

      setLessons((prev) => prev.map((x) => (x?._id === editLessonId ? { ...x, ...merged } : x)));
      setToast('Lesson updated!');
      closeEditLessonModal();
    } catch (e) {
      setEditLessonError(e?.response?.data?.message || 'Failed to update lesson. (Check backend PUT upload handling)');
    } finally {
      setLessonsLoading(false);
    }
  };

  const archiveLesson = async (lesson) => {
    if (!lesson?._id) return;
    setOpenLessonMenuId(null);

    if (!window.confirm('Archive this lesson?')) return;

    try {
      setLessonsLoading(true);

      const res = await axios.put(`${API}/lessons/${lesson._id}`, { isArchived: true });
      const updated = res.data?.data || res.data || { ...lesson, isArchived: true };

      setLessons((prev) => prev.filter((x) => x?._id !== lesson._id));
      setArchivedLessons((prev) => [updated, ...prev]);
      setToast('Lesson archived!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to archive lesson.');
    } finally {
      setLessonsLoading(false);
    }
  };

  const restoreLesson = async (lesson) => {
    if (!lesson?._id) return;

    if (!window.confirm('Restore this lesson?')) return;

    try {
      setLessonsLoading(true);

      const res = await axios.put(`${API}/lessons/${lesson._id}`, { isArchived: false });
      const updated = res.data?.data || res.data || { ...lesson, isArchived: false };

      setArchivedLessons((prev) => prev.filter((x) => x?._id !== lesson._id));
      setLessons((prev) => [updated, ...prev]);
      setToast('Lesson restored!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to restore lesson.');
    } finally {
      setLessonsLoading(false);
    }
  };

  const deleteLessonPermanent = async (lesson) => {
    if (!lesson?._id) return;
    setOpenLessonMenuId(null);

    if (!window.confirm('Delete this lesson permanently?')) return;

    try {
      setLessonsLoading(true);
      await axios.delete(`${API}/lessons/${lesson._id}`);

      setLessons((prev) => prev.filter((x) => x?._id !== lesson._id));
      setArchivedLessons((prev) => prev.filter((x) => x?._id !== lesson._id));
      setToast('Lesson deleted!');
    } catch (e) {
      setToast(e?.response?.data?.message || 'Failed to delete lesson.');
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleNav = (name) => setActive(name);

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

  const renderDashboard = () => (
    <div className="hiCard">
      <div className="hiPageTitle">Dashboard</div>
      <div className="hiInnerCard">
        <div className="hiWelcomeCard">
          <div className="hiWelcomeCardTitle">Welcome, {usernameLabel}</div>
          <div className="hiWelcomeCardSub">Explore pages using the sidebar.</div>
        </div>
      </div>
    </div>
  );

  const renderLearn = () => (
    <div className="hiCard">
      <div className="hiTop">
        <div className="hiTopLeft">
          <div className="hiPageTitle" style={{ margin: 0 }}>Learn Mycology</div>
          <div className="hiSub">Add lessons and resources. Students will see this immediately.</div>
        </div>

        <div className="hiTopRight" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="hiGhostBtn"
            onClick={() => setShowLessonArchiveModal(true)}
            disabled={lessonsLoading}
          >
            <ArchiveIcon />
            Archived
          </button>

          <button
            type="button"
            className="hiPrimaryBtn"
            onClick={() => {
              setShowAddLesson(true);
              setLessonFormError('');
            }}
          >
            + Add Lesson
          </button>
        </div>
      </div>

      {lessonsError ? <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.75 }}>{lessonsError}</div> : null}
      {lessonsLoading ? <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>Loading...</div> : null}

      <div className="hiCardsGrid" style={{ marginTop: 12 }}>
        {lessons.map((l) => {
          const models = Array.isArray(l?.models) ? l.models : (Array.isArray(l?.modelUrls) ? l.modelUrls : []);
          const modelsCount = models.length;

          return (
            <div key={l._id} className="hiInnerCard" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 900, paddingRight: 8 }}>{l.title}</div>

                <div style={{ position: 'relative' }} ref={openLessonMenuId === l._id ? lessonMenuRef : null}>
                  <button
                    type="button"
                    className="hiIconBtnSm"
                    title="More"
                    onClick={() => setOpenLessonMenuId((p) => (p === l._id ? null : l._id))}
                    disabled={lessonsLoading}
                    style={{ width: 36, height: 36, display: 'grid', placeItems: 'center' }}
                  >
                    <MoreIcon />
                  </button>

                  {openLessonMenuId === l._id ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 40,
                        width: 180,
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.10)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.10)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        zIndex: 50,
                      }}
                    >
                      <button
                        type="button"
                        className="hiMenuItem"
                        onClick={() => openEditLessonModal(l)}
                        disabled={lessonsLoading}
                      >
                        <span style={{ display: 'inline-flex', width: 18 }}><PencilMini /></span>
                        Edit
                      </button>

                      <button
                        type="button"
                        className="hiMenuItem"
                        onClick={() => archiveLesson(l)}
                        disabled={lessonsLoading}
                      >
                        <span style={{ display: 'inline-flex', width: 18 }}><ArchiveIcon /></span>
                        Archive
                      </button>

                      <button
                        type="button"
                        className="hiMenuItem danger"
                        onClick={() => deleteLessonPermanent(l)}
                        disabled={lessonsLoading}
                      >
                        <span style={{ display: 'inline-flex', width: 18 }}><TrashIcon /></span>
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {l.educationalContent || l.description ? (
                <div style={{ marginTop: 6, opacity: 0.8, fontWeight: 700, whiteSpace: 'pre-wrap' }}>
                  {l.educationalContent || l.description}
                </div>
              ) : null}

              <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, opacity: 0.75 }}>
                  3D Models: {modelsCount}
                </span>
              </div>
            </div>
          );
        })}

        {!lessonsLoading && lessons.length === 0 ? (
          <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.7 }}>No lessons yet.</div>
        ) : null}
      </div>

      {showAddLesson ? (
        <div className="hiModalOverlay" onMouseDown={() => !lessonsLoading && setShowAddLesson(false)}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <button type="button" className="hiModalClose" onClick={() => !lessonsLoading && setShowAddLesson(false)}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Add Lesson</div>
              <div className="hiModalSub">Learn Mycology.</div>
            </div>

            {lessonFormError ? <div className="hiInlineError">{lessonFormError}</div> : null}

            <div className="hiFormCol">
              <label className="hiLabel">Title</label>
              <input
                className="hiInput"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="Lesson title..."
              />
            </div>

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">Educational Content</label>
              <textarea
                className="hiInput hiTextarea"
                value={lessonEducationalContent}
                onChange={(e) => setLessonEducationalContent(e.target.value)}
                placeholder="describe the lesson, add instructions, etc..."
              />
            </div>

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">3D Models</label>
              <input
                className="hiInput"
                type="file"
                multiple
                onChange={(e) => setLessonModels(Array.from(e.target.files || []))}
              />
              <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.75 }}>
                {lessonModels.length ? `${lessonModels.length} file(s) selected` : 'No files selected'}
              </div>
            </div>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={() => setShowAddLesson(false)} disabled={lessonsLoading}>
                Cancel
              </button>
              <button type="button" className="hiPrimaryBtn" onClick={createLesson} disabled={lessonsLoading}>
                {lessonsLoading ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditLesson ? (
        <div className="hiModalOverlay" onMouseDown={closeEditLessonModal}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <button type="button" className="hiModalClose" onClick={closeEditLessonModal}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Edit Lesson</div>
              <div className="hiModalSub">Update lesson content and add new 3D models.</div>
            </div>

            {editLessonError ? <div className="hiInlineError">{editLessonError}</div> : null}

            <div className="hiFormCol">
              <label className="hiLabel">Title</label>
              <input
                className="hiInput"
                value={editLessonTitle}
                onChange={(e) => setEditLessonTitle(e.target.value)}
              />
            </div>

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">Educational Content</label>
              <textarea
                className="hiInput hiTextarea"
                value={editLessonEducationalContent}
                onChange={(e) => setEditLessonEducationalContent(e.target.value)}
              />
            </div>

            {Array.isArray(editLessonExistingModels) && editLessonExistingModels.length ? (
              <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.8 }}>
                Existing Models: {editLessonExistingModels.length}
              </div>
            ) : null}

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">Add 3D Models (Upload)</label>
              <input
                className="hiInput"
                type="file"
                multiple
                onChange={(e) => setEditLessonModels(Array.from(e.target.files || []))}
              />
              <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.75 }}>
                {editLessonModels.length ? `${editLessonModels.length} new file(s) selected` : 'No new files selected'}
              </div>
            </div>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={closeEditLessonModal} disabled={lessonsLoading}>
                Cancel
              </button>
              <button type="button" className="hiPrimaryBtn" onClick={saveEditLesson} disabled={lessonsLoading}>
                {lessonsLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showLessonArchiveModal ? (
        <div className="hiModalOverlay" onMouseDown={() => !lessonsLoading && setShowLessonArchiveModal(false)}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <button type="button" className="hiModalClose" onClick={() => !lessonsLoading && setShowLessonArchiveModal(false)}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Archived Lessons</div>
              <div className="hiModalSub">Restore or delete archived lessons.</div>
            </div>

            <div className="hiArchiveGrid">
              {archivedLessons.map((l) => (
                <div key={l._id} className="hiInnerCard" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{l.title}</div>
                    <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.75 }}>
                      {(l.educationalContent || l.description || '').slice(0, 90)}{(l.educationalContent || l.description || '').length > 90 ? '…' : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="hiIconBtnSm"
                      title="Restore"
                      onClick={() => restoreLesson(l)}
                      disabled={lessonsLoading}
                    >
                      <RestoreIcon />
                    </button>
                    <button
                      type="button"
                      className="hiIconBtnSm danger"
                      title="Delete"
                      onClick={() => deleteLessonPermanent(l)}
                      disabled={lessonsLoading}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}

              {!archivedLessons.length ? (
                <div style={{ fontWeight: 900, opacity: 0.7 }}>No archived lessons.</div>
              ) : null}
            </div>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={() => setShowLessonArchiveModal(false)} disabled={lessonsLoading}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderAssessment = () => (
    <div className="hiCard">
      <div className="hiTop">
        <div className="hiTopLeft">
          <div className="hiPageTitle" style={{ margin: 0 }}>Manage Assessments</div>
          <div className="hiSub">Create quizzes with timer, questions, points, and feedback ranges.</div>
        </div>

        <div className="hiTopRight">
          <button
            type="button"
            className="hiGhostBtn"
            onClick={() => setShowArchiveModal(true)}
            disabled={assLoading}
          >
            <ArchiveIcon />
            Archive
          </button>

          <button
            type="button"
            className="hiPrimaryBtn"
            onClick={() => {
              setShowAddAssessment(true);
              setAssFormError('');
            }}
          >
            + Add New
          </button>
        </div>
      </div>

      {assLoading ? <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.7 }}>Loading...</div> : null}
      {assError ? <div style={{ marginTop: 12, fontWeight: 800, color: 'rgba(0,0,0,0.65)' }}>{assError}</div> : null}

      <div className="hiCardsGrid">
        {assessments.map((a) => (
          <div key={a._id} className="hiInnerCard hiAssCard">
            <div className="hiAssTopRow">
              <div className="hiAssTitle">{a.title}</div>

              <div className="hiAssActions">
                <button
                  type="button"
                  className="hiIconBtnSm"
                  title="Edit"
                  onClick={() => openEdit(a)}
                  disabled={assLoading}
                >
                  <EditIcon />
                </button>

                <button
                  type="button"
                  className="hiIconBtnSm"
                  title="Archive"
                  onClick={() => archiveAssessment(a)}
                  disabled={assLoading}
                >
                  <ArchiveIcon />
                </button>
              </div>
            </div>

            <div className="hiAssMeta">
              {a.timer?.enabled ? `Timer: ${a.timer.minutes} min` : 'No Timer'} • {a.questions?.length || 0} questions
            </div>
          </div>
        ))}

        {!assLoading && assessments.length === 0 ? (
          <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.7 }}>No assessments yet.</div>
        ) : null}
      </div>

      {showAddAssessment ? (
        <div className="hiModalOverlay" onMouseDown={() => !assLoading && setShowAddAssessment(false)}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="hiModalClose" onClick={() => !assLoading && setShowAddAssessment(false)}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Add New Assessment</div>
              <div className="hiModalSub">Fill in the quiz details</div>
            </div>

            {assFormError ? <div className="hiInlineError">{assFormError}</div> : null}

            <div className="hiFormCol">
              <label className="hiLabel">Quiz Title</label>
              <input
                value={assTitle}
                onChange={(e) => setAssTitle(e.target.value)}
                placeholder="Enter title..."
                className="hiInput"
              />
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 900, opacity: 0.85 }}>
                <input type="checkbox" checked={assUseTimer} onChange={(e) => setAssUseTimer(e.target.checked)} />
                Timer
              </label>

              {assUseTimer ? (
                <div className="hiFormCol" style={{ width: 180 }}>
                  <label className="hiLabel">Minutes</label>
                  <input
                    type="number"
                    min="1"
                    value={assTimerMinutes}
                    onChange={(e) => setAssTimerMinutes(e.target.value)}
                    className="hiInput"
                  />
                </div>
              ) : null}
            </div>

            <div className="hiDividerTitle">Questions</div>

            {assQuestions.map((q, idx) => (
              <div key={idx} className="hiPanel">
                <div className="hiPanelTop">
                  <div className="hiPanelTitle">Question #{idx + 1}</div>
                  {assQuestions.length > 1 ? (
                    <button
                      type="button"
                      className="hiGhostBtn"
                      onClick={() => setAssQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="hiFormCol">
                  <label className="hiLabel">Question</label>
                  <input
                    value={q.text}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, text: v } : it)));
                    }}
                    placeholder="Type question..."
                    className="hiInput"
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Points</label>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, points: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>

                  <div className="hiFormCol" style={{ width: 220 }}>
                    <label className="hiLabel">Correct Answer</label>
                    <select
                      value={q.correctIndex}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setAssQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, correctIndex: v } : it)));
                      }}
                      className="hiInput"
                      style={{ height: 42 }}
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
                    <div key={optIndex} className="hiFormCol" style={{ marginBottom: 10 }}>
                      <label className="hiLabel">Option {optIndex + 1}</label>
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
                        className="hiInput"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button type="button" className="hiDashedBtn" onClick={() => setAssQuestions((prev) => [...prev, emptyQuestion()])}>
              + Add Question
            </button>

            <div className="hiDividerTitle">Evaluation / Feedback (Score Ranges)</div>

            {assRanges.map((r, idx) => (
              <div key={idx} className="hiPanel">
                <div className="hiPanelTop">
                  <div className="hiPanelTitle">Range #{idx + 1}</div>
                  {assRanges.length > 1 ? (
                    <button
                      type="button"
                      className="hiGhostBtn"
                      onClick={() => setAssRanges((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Min</label>
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, min: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Max</label>
                    <input
                      type="number"
                      value={r.max}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, max: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>
                </div>

                <div className="hiFormCol" style={{ marginTop: 10 }}>
                  <label className="hiLabel">Feedback Message</label>
                  <input
                    value={r.message}
                    onChange={(e) => {
                      const v = e.target.value;
                      setAssRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, message: v } : it)));
                    }}
                    placeholder="e.g. Excellent!"
                    className="hiInput"
                  />
                </div>
              </div>
            ))}

            <button type="button" className="hiDashedBtn" onClick={() => setAssRanges((prev) => [...prev, emptyRange()])}>
              + Add Range
            </button>

            <div className="hiModalActions">
              <button
                type="button"
                className="hiGhostBtn"
                onClick={() => {
                  setShowAddAssessment(false);
                  resetAssessmentForm();
                }}
                disabled={assLoading}
              >
                Cancel
              </button>
              <button type="button" className="hiPrimaryBtn" onClick={saveAssessment} disabled={assLoading}>
                {assLoading ? 'Saving...' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showArchiveModal ? (
        <div className="hiModalOverlay" onMouseDown={() => !assLoading && setShowArchiveModal(false)}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <button type="button" className="hiModalClose" onClick={() => !assLoading && setShowArchiveModal(false)}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Archived Assessments</div>
              <div className="hiModalSub">Archived items can be restored or deleted here.</div>
            </div>

            <div className="hiArchiveGrid">
              {archived.map((a) => (
                <div key={a._id} className="hiInnerCard hiAssCard">
                  <div className="hiAssTopRow">
                    <div className="hiAssTitle">{a.title}</div>

                    <div className="hiAssActions">
                      <button
                        type="button"
                        className="hiIconBtnSm"
                        title="Restore"
                        onClick={() => restoreArchived(a)}
                        disabled={assLoading}
                      >
                        <RestoreIcon />
                      </button>

                      <button
                        type="button"
                        className="hiIconBtnSm danger"
                        title="Delete permanently"
                        onClick={() => deleteArchivedPermanent(a)}
                        disabled={assLoading}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  <div className="hiAssMeta">
                    {a.timer?.enabled ? `Timer: ${a.timer.minutes} min` : 'No Timer'} • {a.questions?.length || 0} questions
                  </div>
                </div>
              ))}
              {!archived.length ? (
                <div style={{ fontWeight: 900, opacity: 0.7 }}>No archived assessments.</div>
              ) : null}
            </div>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={() => setShowArchiveModal(false)} disabled={assLoading}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div className="hiModalOverlay" onMouseDown={closeEdit}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <button type="button" className="hiModalClose" onClick={closeEdit}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Edit Assessment</div>
              <div className="hiModalSub">Update the full quiz details</div>
            </div>

            {editFormError ? <div className="hiInlineError">{editFormError}</div> : null}

            <div className="hiFormCol">
              <label className="hiLabel">Quiz Title</label>
              <input className="hiInput" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 900, opacity: 0.85 }}>
                <input type="checkbox" checked={editUseTimer} onChange={(e) => setEditUseTimer(e.target.checked)} />
                Timer
              </label>

              {editUseTimer ? (
                <div className="hiFormCol" style={{ width: 180 }}>
                  <label className="hiLabel">Minutes</label>
                  <input
                    type="number"
                    min="1"
                    className="hiInput"
                    value={editTimerMinutes}
                    onChange={(e) => setEditTimerMinutes(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="hiDividerTitle">Questions</div>

            {editQuestions.map((q, idx) => (
              <div key={idx} className="hiPanel">
                <div className="hiPanelTop">
                  <div className="hiPanelTitle">Question #{idx + 1}</div>
                  {editQuestions.length > 1 ? (
                    <button
                      type="button"
                      className="hiGhostBtn"
                      onClick={() => setEditQuestions((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="hiFormCol">
                  <label className="hiLabel">Question</label>
                  <input
                    value={q.text}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, text: v } : it)));
                    }}
                    placeholder="Type question..."
                    className="hiInput"
                  />
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Points</label>
                    <input
                      type="number"
                      min="1"
                      value={q.points}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, points: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>

                  <div className="hiFormCol" style={{ width: 220 }}>
                    <label className="hiLabel">Correct Answer</label>
                    <select
                      value={q.correctIndex}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setEditQuestions((prev) => prev.map((it, i) => (i === idx ? { ...it, correctIndex: v } : it)));
                      }}
                      className="hiInput"
                      style={{ height: 42 }}
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
                    <div key={optIndex} className="hiFormCol" style={{ marginBottom: 10 }}>
                      <label className="hiLabel">Option {optIndex + 1}</label>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditQuestions((prev) =>
                            prev.map((it, i) => {
                              if (i !== idx) return it;
                              const newOpts = [...it.options];
                              newOpts[optIndex] = v;
                              return { ...it, options: newOpts };
                            })
                          );
                        }}
                        placeholder={`Option ${optIndex + 1}...`}
                        className="hiInput"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button type="button" className="hiDashedBtn" onClick={() => setEditQuestions((prev) => [...prev, emptyQuestion()])}>
              + Add Question
            </button>

            <div className="hiDividerTitle">Evaluation / Feedback (Score Ranges)</div>

            {editRanges.map((r, idx) => (
              <div key={idx} className="hiPanel">
                <div className="hiPanelTop">
                  <div className="hiPanelTitle">Range #{idx + 1}</div>
                  {editRanges.length > 1 ? (
                    <button
                      type="button"
                      className="hiGhostBtn"
                      onClick={() => setEditRanges((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Min</label>
                    <input
                      type="number"
                      value={r.min}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, min: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>
                  <div className="hiFormCol" style={{ width: 160 }}>
                    <label className="hiLabel">Max</label>
                    <input
                      type="number"
                      value={r.max}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEditRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, max: v } : it)));
                      }}
                      className="hiInput"
                    />
                  </div>
                </div>

                <div className="hiFormCol" style={{ marginTop: 10 }}>
                  <label className="hiLabel">Feedback Message</label>
                  <input
                    value={r.message}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditRanges((prev) => prev.map((it, i) => (i === idx ? { ...it, message: v } : it)));
                    }}
                    placeholder="e.g. Excellent!"
                    className="hiInput"
                  />
                </div>
              </div>
            ))}

            <button type="button" className="hiDashedBtn" onClick={() => setEditRanges((prev) => [...prev, emptyRange()])}>
              + Add Range
            </button>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={closeEdit} disabled={assLoading}>
                Cancel
              </button>
              <button type="button" className="hiPrimaryBtn" onClick={saveEdit} disabled={assLoading}>
                {assLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderModelLibrary = () => (
    <div className="hiCard">
{/* HEAD */}
      <div className="hiPageTitle">Model Library</div>
      <div className="hiSub">Manage models, references, and downloadable resources.</div>

      <div className="hiInnerCard" style={{ marginTop: 14 }}>
        <div className="hiSectionBody">
          <div className="hiSectionTitle2">Coming soon</div>
          <div className="hiSectionText">
            Add your model list, metadata, and files here.
          </div>
        </div>
      </div>
    </div>
  );

//   const renderMonitoringAndManagement = () => (
//     <div className="hiCard">
//       <div className="hiTop">
//         <div className="hiTopLeft">
//           <div className="hiPageTitle" style={{ margin: 0 }}>Student Monitoring</div>
//           <div className="hiSub">Student list + how many times they took each assessment.</div>
//         </div>

//         <div className="hiTopRight">
//           <button
//             type="button"
//             className="hiGhostBtn"
//             onClick={fetchMonitoring}
//             disabled={monitoringLoading}
//           >
//             Refresh
//           </button>
//         </div>
//       </div>

//       {monitoringError ? <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.75 }}>{monitoringError}</div> : null}
//       {monitoringLoading ? <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.7 }}>Loading...</div> : null}

//       {!monitoringLoading && monitoringData.length === 0 ? (
//         <div style={{ marginTop: 12, fontWeight: 900, opacity: 0.7 }}>
//           No student data yet.
//         </div>
//       ) : null}

//       <div className="hiInnerCard" style={{ marginTop: 14, overflowX: 'auto' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
//           <thead>
//             <tr style={{ textAlign: 'left' }}>
//               <th style={{ padding: 10, fontWeight: 900 }}>Student</th>
//               <th style={{ padding: 10, fontWeight: 900 }}>Assessment</th>
//               <th style={{ padding: 10, fontWeight: 900 }}>Takes</th>
//               <th style={{ padding: 10, fontWeight: 900 }}>Last Score</th>
//               <th style={{ padding: 10, fontWeight: 900 }}>Last Submitted</th>
//             </tr>
//           </thead>
//           <tbody>
//             {monitoringData.flatMap((s) => {
//               const studentName = safeFullName(s) || s.studentName || '—';
//               const rows = (s.assessments || s.items || []).length ? (s.assessments || s.items) : [{ _empty: true }];

//               return rows.map((a, idx) => {
//                 const takeCount = Number(a?.takeCount ?? a?.takes ?? a?.attemptCount ?? 0);
//                 const hasTakes = !a?._empty && takeCount > 0;

//                 return (
//                   <tr key={`${s.studentId || s._id || s.id}_${idx}`} style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
//                     <td style={{ padding: 10, fontWeight: 900 }}>
//                       {idx === 0 ? studentName : ''}
//                     </td>

//                     <td style={{ padding: 10, fontWeight: 800, opacity: 0.9 }}>
//                       {a._empty ? '—' : (a.title || a.assessmentTitle || 'Untitled')}
//                     </td>

//                     <td style={{ padding: 10, fontWeight: 900 }}>
//                       {a._empty ? '—' : (
//                         hasTakes ? (
//                           <button
//                             type="button"
//                             className="hiGhostBtn"
//                             onClick={() => openTakesModal ({ student: s, assessment: a })}
//                             disabled={monitoringLoading}
//                             style={{ padding: '6px 10px', fontWeight: 900 }}
//                           >
//                             {takeCount} take{takeCount > 1 ? 's' : ''}
//                           </button>
//                         ) : (
//                           '0'
//                         )
//                       )}
//                     </td>

//                     <td style={{ padding: 10, fontWeight: 900 }}>
//                       {a._empty
//                         ? '—'
//                         : (typeof a.lastPercent === 'number'
//                           ? `${a.lastPercent}% (${a.lastScore}/${a.lastTotal})`
//                           : (typeof a.lastScorePercent === 'number'
//                             ? `${a.lastScorePercent}%`
//                             : '—'))}
//                     </td>

//                     <td style={{ padding: 10, fontWeight: 800, opacity: 0.85 }}>
//                       {a._empty ? '—' : (a.lastSubmittedAt ? formatDateTime(a.lastSubmittedAt) : '—')}
//                     </td>
//                   </tr>
//                 );
//               });
//             })}
//           </tbody>
//         </table>
//       </div>
// =
//       {takesModalOpen ? (
//         <div className="hiModalOverlay" onMouseDown={closeTakesModal}>
//           <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
//             <button type="button" className="hiModalClose" onClick={closeTakesModal}>
//               ✕
//             </button>

//             <div className="hiModalHead">
//               <div className="hiModalTitle">{takesModalTitle}</div>
//               <div className="hiModalSub">{takesModalSubtitle} • Attempts history</div>
//             </div>

//             {takesModalLoading ? (
//               <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.7 }}>Loading attempts...</div>
//             ) : null}

//             {!takesModalLoading && (!takesModalAttempts || takesModalAttempts.length === 0) ? (
//               <div style={{ marginTop: 10, fontWeight: 900, opacity: 0.75 }}>
//                 No attempts data available for this student and assessment.
//               </div>
//             ) : null}

//             {!takesModalLoading && Array.isArray(takesModalAttempts) && takesModalAttempts.length ? (
//               <div className="hiInnerCard" style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead>
//                     <tr style={{ textAlign: 'left' }}>
//                       <th style={{ padding: 10, fontWeight: 900 }}>#</th>
//                       <th style={{ padding: 10, fontWeight: 900 }}>Submitted</th>
//                       <th style={{ padding: 10, fontWeight: 900 }}>Score</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {takesModalAttempts.map((t, i) => {
//                       const submittedAt = t.submittedAt || t.createdAt || t.date || t.takenAt;
//                       const percent = (typeof t.percent === 'number') ? t.percent : (typeof t.scorePercent === 'number' ? t.scorePercent : null);
//                       const score = (typeof t.score === 'number') ? t.score : t.lastScore;
//                       const total = (typeof t.total === 'number') ? t.total : t.lastTotal;

//                       return (
//                         <tr key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
//                           <td style={{ padding: 10, fontWeight: 900 }}>{i + 1}</td>
//                           <td style={{ padding: 10, fontWeight: 800, opacity: 0.85 }}>{formatDateTime(submittedAt)}</td>
//                           <td style={{ padding: 10, fontWeight: 900 }}>
//                             {percent != null
//                               ? `${percent}%${(typeof score === 'number' && typeof total === 'number') ? ` (${score}/${total})` : ''}`
//                               : ((typeof score === 'number' && typeof total === 'number') ? `${score}/${total}` : '—')}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             ) : null}

//             <div className="hiModalActions">
//               <button type="button" className="hiGhostBtn" onClick={closeTakesModal} disabled={takesModalLoading}>
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>

//       <div className="hiCardHead">
//         <div className="hiCardTitle">Model Library</div>
//         <div className="hiCardSub">Content placeholder</div>
//       </div>
//     </div>
//   );

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
      <div className="hiPageTitle">Profile</div>

      <div className="hiProfilePhotoCard">
        <div className="hiProfilePhotoLeft">
          <div className="hiBigAvatarWrap">
            <div className="hiBigAvatar">
              {profilePreview ? (
                <img src={profilePreview} alt="profile" />
              ) : (
                <span className="hiBigAvatarTxt">{welcomeInitials}</span>
              )}
            </div>

            <label className="hiAvatarEdit" title="Upload new photo">
              <PencilMini />
              <input type="file" onChange={onPickImage} />
            </label>
          </div>

          <div className="hiProfilePhotoText">
            <div className="hiProfilePhotoTitle">Instructor Profile Photo</div>
            <div className="hiProfilePhotoSub">Recommended size: 400×400px. JPG or PNG.</div>
            <label className="hiUploadLink">
              Upload New Photo
              <input type="file" onChange={onPickImage} />
            </label>
          </div>
        </div>
      </div>

      <div className="hiProfileGrid">
        <div className="hiBox">
          <div className="hiBoxHead">
            <div className="hiBoxTitle">FULL NAME</div>
            <button
              type="button"
              className="hiIconBtn"
              title={!editName ? 'Edit' : 'Save'}
              onClick={!editName ? () => setEditName(true) : saveName}
              disabled={savingKey === 'name'}
            >
              {editName ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editName ? (
            <div className="hiTwoColValues">
              <div>
                <div className="hiSmallLabel">First Name</div>
                <div className="hiValueText">{saved.fname || '—'}</div>
              </div>
              <div>
                <div className="hiSmallLabel">Last Name</div>
                <div className="hiValueText">{saved.lname || '—'}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="hiFieldRow">
                <div className="hiFieldBlock">
                  <div className="hiFieldLabel">First Name</div>
                  <input className="hiInput" value={draft.fname} onChange={onDraftChange('fname')} />
                </div>

                <div className="hiFieldBlock">
                  <div className="hiFieldLabel">Last Name</div>
                  <input className="hiInput" value={draft.lname} onChange={onDraftChange('lname')} />
                </div>
              </div>

              <button
                type="button"
                className="hiMiniGhost"
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

        <div className="hiBox">
          <div className="hiBoxHead">
            <div className="hiBoxTitle">EMAIL ADDRESS</div>
            <button
              type="button"
              className="hiIconBtn"
              title={!editEmail ? 'Edit' : 'Save'}
              onClick={!editEmail ? () => setEditEmail(true) : saveEmail}
              disabled={savingKey === 'email'}
            >
              {editEmail ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editEmail ? (
            <>
              <div className="hiValueText">{saved.email || '—'}</div>
              <div className="hiBadgeRow">
                <span className="hiBadge">
                  <CheckMini />
                  VERIFIED
                </span>
              </div>
            </>
          ) : (
            <>
              <input className="hiInput" value={draft.email} onChange={onDraftChange('email')} />
              <button
                type="button"
                className="hiMiniGhost"
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

        <div className="hiBox">
          <div className="hiBoxHead">
            <div className="hiBoxTitle">PHONE NUMBER</div>
            <button
              type="button"
              className="hiIconBtn"
              title={!editNumber ? 'Edit' : 'Save'}
              onClick={!editNumber ? () => setEditNumber(true) : saveNumber}
              disabled={savingKey === 'number'}
            >
              {editNumber ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editNumber ? (
            <div className="hiValueText">{saved.number || '—'}</div>
          ) : (
            <>
              <input className="hiInput" value={draft.number} onChange={onDraftChange('number')} />
              <button
                type="button"
                className="hiMiniGhost"
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

        <div className="hiBox">
          <div className="hiBoxHead">
            <div className="hiBoxTitle">BIRTHDAY</div>
            <button
              type="button"
              className="hiIconBtn"
              title={!editDob ? 'Edit' : 'Save'}
              onClick={!editDob ? () => setEditDob(true) : saveDob}
              disabled={savingKey === 'dob'}
            >
              {editDob ? <CheckIcon /> : <PencilIcon />}
            </button>
          </div>

          {!editDob ? (
            <div className="hiValueText">{formatDOB(saved.dob) || '—'}</div>
          ) : (
            <>
              <input className="hiInput" type="date" value={draft.dob} onChange={onDraftChange('dob')} />
              <button
                type="button"
                className="hiMiniGhost"
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

        <div className="hiBox" style={{ gridColumn: '1 / -1' }}>
          <div className="hiPassRow">
            <div>
              <div className="hiBoxTitle">ACCOUNT PASSWORD</div>
            </div>

            <button type="button" className="hiPrimaryBtn" onClick={openChangePassModal}>
              <GearIcon />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {showChangePass ? (
        <div className="hiModalOverlay" onMouseDown={closeChangePassModal}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" className="hiModalClose" onClick={closeChangePassModal}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Change Password</div>
              <div className="hiModalSub">Enter your current password and a new password</div>
            </div>

            <div className="hiFormCol">
              <label className="hiLabel">Current Password</label>
              <input
                className="hiInput"
                type="password"
                placeholder="Current Password"
                value={passDraft.currentPassword}
                onChange={onPassChange('currentPassword')}
              />
            </div>

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">New Password</label>
              <input
                className="hiInput"
                type="password"
                placeholder="New Password"
                value={passDraft.newPassword}
                onChange={onPassChange('newPassword')}
              />
            </div>

            <div className="hiFormCol" style={{ marginTop: 10 }}>
              <label className="hiLabel">Confirm New Password</label>
              <input
                className="hiInput"
                type="password"
                placeholder="Confirm New Password"
                value={passDraft.confirmNewPassword}
                onChange={onPassChange('confirmNewPassword')}
              />
            </div>

            {passDraft.otpId ? (
              <>
                <div className="hiOtpHint">
                  Enter OTP sent to <b>{passDraft.maskedEmail || 'your email'}</b>
                </div>

                <div className="hiFormCol" style={{ marginTop: 10 }}>
                  <label className="hiLabel">OTP Code</label>
                  <input
                    className="hiInput"
                    type="text"
                    placeholder="OTP Code"
                    value={passDraft.otpCode}
                    onChange={onPassChange('otpCode')}
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="button"
                  className="hiGhostBtn"
                  onClick={resendChangePassOtp}
                  disabled={savingKey === 'password'}
                  style={{ marginTop: 10 }}
                >
                  Resend OTP
                </button>
              </>
            ) : null}

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={closeChangePassModal} disabled={savingKey === 'password'}>
                Cancel
              </button>

              <button type="button" className="hiPrimaryBtn" onClick={savePassword} disabled={savingKey === 'password'}>
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
        <div className="hiModalOverlay" onMouseDown={() => setShowStayOrLogout(false)}>
          <div className="hiModalCard" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button type="button" className="hiModalClose" onClick={() => setShowStayOrLogout(false)}>
              ✕
            </button>

            <div className="hiModalHead">
              <div className="hiModalTitle">Password changed successfully</div>
              <div className="hiModalSub">Do you want to stay logged in or logout?</div>
            </div>

            <div className="hiModalActions">
              <button type="button" className="hiGhostBtn" onClick={() => setShowStayOrLogout(false)} style={{ flex: 1 }}>
                Stay Logged In
              </button>

              <button type="button" className="hiPrimaryBtn" onClick={handleLogoutConfirm} style={{ flex: 1 }}>
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
    <div className={`hiWrap ${sideOpen ? '' : 'collapsed'}`}>
      <aside className="hiSide">
        <div className="hiSideTop">
          <div className="hiLogoRow">
            <div className="hiLogo">MyphoLens</div>

            <button
              type="button"
              className="hiCollapseBtn"
              onClick={() => setSideOpen((p) => !p)}
              title={sideOpen ? 'Collapse menu' : 'Expand menu'}
            >
              {sideOpen ? '❮' : '❯'}
            </button>
          </div>

          <div className="hiSectionTitle">INSTRUCTOR PANEL</div>

          <div className="hiNav">
            <button
              type="button"
              className={`hiNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('Dashboard')}
              title="Dashboard"
            >
              <span className="hiNavIcon"><DashIcon /></span>
              <span className="hiNavText">Dashboard</span>
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Learn Mycology' ? 'active' : ''}`}
              onClick={() => handleNav('Learn Mycology')}
              title="Learn Mycology"
            >
              <span className="hiNavIcon"><BookIcon /></span>
              <span className="hiNavText">Learn Mycology</span>
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Assessment' ? 'active' : ''}`}
              onClick={() => handleNav('Assessment')}
              title="Assessment"
            >
              <span className="hiNavIcon"><QuizIcon /></span>
              <span className="hiNavText">Assessment</span>
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Model Library' ? 'active' : ''}`}
              onClick={() => handleNav('Model Library')}
              title="Model Library"
            >
              <span className="hiNavIcon"><CubeIcon /></span>
              <span className="hiNavText">Model Library</span>
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Student Monitoring and Management' ? 'active' : ''}`}
              onClick={() => handleNav('Student Monitoring and Management')}
              title="Student Monitoring"
            >
              <span className="hiNavIcon"><UsersIcon /></span>
              <span className="hiNavText">Student Monitoring</span>
            </button>

            <button
              type="button"
              className={`hiNavBtn ${active === 'Profile' ? 'active' : ''}`}
              onClick={() => handleNav('Profile')}
              title="Profile"
            >
              <span className="hiNavIcon"><ProfileIcon /></span>
              <span className="hiNavText">Profile</span>
            </button>
          </div>
        </div>

        <div className="hiSideBottom">
          <button
            type="button"
            className="hiLogoutClean"
            onClick={() => {
              if (!window.confirm('Are you sure you want to logout?')) return;
              handleLogout();
            }}
            title="Logout"
          >
            <span className="hiLogoutIcon"><LogoutIcon /></span>
            <span className="hiLogoutText">LOGOUT</span>
          </button>
        </div>
      </aside>

      <section className="hiMain">
        <header className="hiTopbar">
          <div className="hiWelcomeRight">
            <div className="hiWelcome">
              <div className="hiWelcomeText">
                <div className="hiWelcomeTop">Welcome,</div>
                <div className="hiWelcomeUser">{usernameLabel}</div>
              </div>

              <div className="hiAvatarSmall" title="Instructor">
                {profilePreview ? <img src={profilePreview} alt="avatar" /> : welcomeInitials}
              </div>
            </div>
          </div>
        </header>

        <div className="hiContent">{renderMain()}</div>
      </section>

      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}

//ICONS
function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm5 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm5 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z" fill="currentColor" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 7v13h12V7" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 11h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 4h12l1 3H5l1-3Z" fill="currentColor" opacity="0.12" />
    </svg>
  );
}
function PencilMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function CheckMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.2-2-3.5-2.3.7a7.8 7.8 0 0 0-1.7-1L15 4h-6l-.5 2.9a7.8 7.8 0 0 0-1.7 1l-2.3-.7-2 3.5 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.5 2.3-.7a7.8 7.8 0 0 0 1.7 1L9 20h6l.5-2.9a7.8 7.8 0 0 0 1.7-1l2.3.7 2-3.5-2-1.2Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 7h12l-1 14H7L6 7Z" fill="currentColor" opacity="0.9" />
      <path d="M9 4h6l1 2H8l1-2Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M3 4v5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 13h8V4H4v9Zm0 7h8v-5H4v5Zm10 0h6V11h-6v9Zm0-18v7h6V2h-6Z" fill="currentColor" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 19a2 2 0 0 0 2 2h14V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M8 7h8M8 11h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function QuizIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16v16H4V4Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function CubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 22V12" stroke="currentColor" strokeWidth="2.2" />
      <path d="M21 7l-9 5-9-5" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3ZM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Z" fill="currentColor" opacity="0.9" />
      <path d="M8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h7v-2.5c0-2.33-4.67-3.5-7-3.5Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10 17v-2h4v-2h-4v-2l-3 3 3 3Zm-6 4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8v2H4v14h8v2H4Zm12-16h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4v-2h4V7h-4V5Z" fill="currentColor" />
    </svg>
  );
}

export default HomeInstructor;
