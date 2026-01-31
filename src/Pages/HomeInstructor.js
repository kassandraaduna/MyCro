import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './HomeInstructor.css';
import toast from '../Components/Toast'

function HomeInstructor() {
  const [toast, setToast] = useState('');
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
  });

  const [draft, setDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
  });

  const [editName, setEditName] = useState(false);
  const [editEmail, setEditEmail] = useState(false);
  const [editNumber, setEditNumber] = useState(false);
  const [editPassword, setEditPassword] = useState(false);

  const [passDraft, setPassDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [profilePreview, setProfilePreview] = useState('');
  const [savingKey, setSavingKey] = useState('');

  // ✅ load user same approach as student (location state OR localStorage)
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
    };

    setSaved(base);
    setDraft(base);

    setEditName(false);
    setEditEmail(false);
    setEditNumber(false);
    setEditPassword(false);
    setPassDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  }, [user]);

  const userId = user?._id || '';

  const usernameLabel = useMemo(() => {
    if (!user) return 'instructor';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'instructor';
  }, [user]);

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Landing');
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

  // ✅ SAME endpoint pattern as student (adjust if your route is different)
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
    if (digits.length === 11) return 'Enter 11-digit mobile number.';
    return null;
  };

  const validatePassword = () => {
    const { currentPassword, newPassword, confirmNewPassword } = passDraft;
    if (!currentPassword) return 'Enter your current password.';
    if (!newPassword) return 'Enter your new password.';
    if (newPassword.length < 8) return 'Password must be at least 8 characters.';
    if (!/[!@#$%^&*]/.test(newPassword)) return 'Must contain a special character.';
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

  const savePassword = async () => {
    const err = validatePassword();
    if (err) return setToast(err);

    try {
      setSavingKey('password');

      await axios.post('http://localhost:8000/api/auth/change-password', {
        userId,
        currentPassword: passDraft.currentPassword,
        newPassword: passDraft.newPassword,
      });

      setPassDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setEditPassword(false);
      setToast('Password updated!');
    } catch (error) {
      setToast(error?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingKey('');
    }
  };

  // ---------- PAGES ----------
  const renderDashboard = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Dashboard</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderEducationalContent = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Manage Educational Content</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderAssessment = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Manage Assessments</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderModelLibrary = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Manage Model Library</div>
        <div className="hiCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderMonitoringAndManagement = () => (
    <div className="hiCard">
      <div className="hiCardHead">
        <div className="hiCardTitle">Student Performance Monitoring and Management</div>
        <div className="hiCardSub">Content placeholder</div>
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
            </div>
          )}

          <div className="hiActionsRow">
            {!editPassword ? (
              <button className="hiBtn" type="button" onClick={() => setEditPassword(true)}>
                Change
              </button>
            ) : (
              <button className="hiBtn" type="button" onClick={savePassword} disabled={savingKey === 'password'}>
                {savingKey === 'password' ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMain = () => {
    if (active === 'Dashboard') return renderDashboard();
    if (active === 'Educational Content') return renderEducationalContent();
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
              className={`hiNavBtn ${active === 'Educational Content' ? 'active' : ''}`}
              onClick={() => setActive('Educational Content')}
            >
              <span className="hiDot" />
              Educational Content
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
          <button type="button" className="hiLogout" onClick={handleLogout}>
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
    </div>
  );
}

export default HomeInstructor;
