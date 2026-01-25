import React, { useEffect, useMemo, useState } from 'react';
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
    if (!user) return 'username';
    if (user.username) return user.username;
    const full = `${user.fname || ''} ${user.lname || ''}`.trim();
    return full || user.email || 'username';
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Login');
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
    if (digits.length < 7 || digits.length > 15) return 'Phone number must be 7–15 digits.';
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

  const savePassword = async () => {
    const err = validatePassword();
    if (err) return alert(err);

    try {
      setSavingKey('password');

      await axios.post('http://localhost:8000/api/auth/change-password', {
        userId,
        currentPassword: passDraft.currentPassword,
        newPassword: passDraft.newPassword,
      });

      setPassDraft({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setEditPassword(false);
      alert('Password updated securely!');
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingKey('');
    }
  };

  const renderDashboard = () => (
    <div className="hpCard">
      <div className="hpCardHead">
        <div className="hpCardTitle">Dashboard</div>
        <div className="hpCardSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderLearn = () => (
    <div className="hpCard">
      <div className="hpCardHead">
        <div className="hpCardTitle">Learn</div>
        <div className="hpCardSub">Content placeholder</div>
      </div>
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
    <div className="hpCard">
      <div className="hpCardHead">
        <div className="hpCardTitle">Progress &amp; Performance</div>
        <div className="hpCardSub">Content placeholder</div>
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
            </div>
          )}

          <div className="hpActionsRow">
            {!editPassword ? (
              <button className="hpBtn" type="button" onClick={() => setEditPassword(true)}>
                Change
              </button>
            ) : (
              <button className="hpBtn" type="button" onClick={savePassword} disabled={savingKey === 'password'}>
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
    if (active === 'Learn') return renderLearn();
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
          <button type="button" className="hpLogout" onClick={handleLogout}>
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
