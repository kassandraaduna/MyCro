import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Admin() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('Dashboard');
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    username: '',
    role: '',
  });

  // ✅ CREATE INSTRUCTOR FORM
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    fname: '',
    lname: '',
    email: '',
    number: '',
    username: '',
    password: '',
  });

  const [activityType, setActivityType] = useState('All Activities');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const actorPayload = useMemo(() => {
    let admin = null;
    try {
      const raw = localStorage.getItem('user');
      admin = raw ? JSON.parse(raw) : null;
    } catch {
      admin = null;
    }

    const actorName =
      `${admin?.fname || ''} ${admin?.lname || ''}`.trim() ||
      admin?.username ||
      'Admin';

    return {
      actorUser: admin?._id || null,
      actorName,
      actorRole: admin?.role || 'admin',
      actorEmail: admin?.email || '',
    };
  }, []);

  const handleSearch = (e) => e.preventDefault();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/Login');
  };

  const handleNav = (name) => setActive(name);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await axios.get('http://localhost:8000/api/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await axios.get('http://localhost:8000/api/admin/logs');
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to load logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const full = `${u.fname || ''} ${u.lname || ''}`.toLowerCase();
      return (
        full.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.number || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const normalizeAction = (l) => {
    const a = (l.action || l.type || '').toLowerCase();
    if (a.includes('login')) return 'Login';
    if (a.includes('register') || a.includes('signup')) return 'Registration';
    if (a.includes('create instructor')) return 'Create Instructor';
    if (a.includes('deactivate') || a.includes('activate') || a.includes('status')) return 'Status Change';
    if (a.includes('update') || a.includes('edit')) return 'Update';
    if (a.includes('delete') || a.includes('remove')) return 'Delete';
    return l.action || l.type || 'Activity';
  };

  const getLogDate = (l) => {
    const raw = l.createdAt || l.date || l.timestamp;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };

  const getLogUser = (l) => l.userName || l.user || l.actorName || l.actor || '-';
  const getLogRole = (l) => l.role || l.actorRole || '-';
  const getLogEmail = (l) => l.targetEmail || l.email || l.actorEmail || '-';
  const getLogDetails = (l) => l.details || l.message || l.note || '-';

  const inDateRange = (d) => {
    if (!d) return true;
    if (fromDate) {
      const f = new Date(fromDate);
      f.setHours(0, 0, 0, 0);
      if (d < f) return false;
    }
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      if (d > t) return false;
    }
    return true;
  };

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((l) => {
      const actionLabel = normalizeAction(l);
      const d = getLogDate(l);

      if (activityType !== 'All Activities') {
        if (actionLabel.toLowerCase() !== activityType.toLowerCase()) return false;
      }

      if (!inDateRange(d)) return false;

      if (!q) return true;

      const haystack = [
        actionLabel,
        getLogUser(l),
        getLogRole(l),
        getLogEmail(l),
        getLogDetails(l),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [logs, search, activityType, fromDate, toDate]);

  const totalLogins = useMemo(
    () => filteredLogs.filter((l) => normalizeAction(l) === 'Login').length,
    [filteredLogs]
  );

  const totalRegistrations = useMemo(
    () => filteredLogs.filter((l) => normalizeAction(l) === 'Registration').length,
    [filteredLogs]
  );

  const clearFilters = () => {
    setActivityType('All Activities');
    setFromDate('');
    setToDate('');
  };

  const toggleActive = async (user) => {
    try {
      await axios.put(`http://localhost:8000/api/admin/users/${user._id}/status`, {
        active: !user.active,
        ...actorPayload,
        details: `Admin changed status of ${user.email} to ${!user.active ? 'Active' : 'Inactive'}`,
      });
      await fetchUsers();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setEditDraft({
      fname: user.fname || '',
      lname: user.lname || '',
      email: user.email || '',
      number: user.number || '',
      username: user.username || '',
      role: user.role || '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditDraft({ fname: '', lname: '', email: '', number: '', username: '', role: '' });
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editDraft.fname.trim() || !editDraft.lname.trim()) {
      alert('First Name and Last Name are required.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(editDraft.email.trim())) {
      alert('Please enter a valid email.');
      return;
    }

    try {
      await axios.put(`http://localhost:8000/api/admin/users/${editingId}`, {
        fname: editDraft.fname.trim(),
        lname: editDraft.lname.trim(),
        email: editDraft.email.trim(),
        number: editDraft.number.trim(),
        username: editDraft.username.trim(),
        // role: editDraft.role, // optional: kung gusto mo ma-edit role sa admin
        ...actorPayload,
        details: `Admin updated account fields for userId=${editingId}`,
      });

      cancelEdit();
      await fetchUsers();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to update user.');
    }
  };

  const deleteUser = async (user) => {
    const ok = window.confirm(`Delete account for ${user.email}? This cannot be undone.`);
    if (!ok) return;

    try {
      await axios.delete(`http://localhost:8000/api/admin/users/${user._id}`, {
        data: {
          ...actorPayload,
          details: `Admin deleted account for ${user.email}`,
        },
      });

      await fetchUsers();
      await fetchLogs();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Failed to delete user.');
    }
  };

  // ✅ CREATE INSTRUCTOR
  const validateCreate = () => {
    const d = createDraft;
    if (!d.fname.trim() || !d.lname.trim()) return 'First name and last name are required.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(d.email.trim())) return 'Please enter a valid email.';
    if (!d.username.trim()) return 'Username is required.';
    if (!d.password || d.password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleCreateInstructor = async () => {
    const err = validateCreate();
    if (err) return alert(err);

    try {
      setCreating(true);

      await axios.post('http://localhost:8000/api/admin/create-instructor', {
        fname: createDraft.fname.trim(),
        lname: createDraft.lname.trim(),
        email: createDraft.email.trim(),
        number: createDraft.number.trim(),
        username: createDraft.username.trim(),
        password: createDraft.password,
        role: 'instructor',
        ...actorPayload,
        action: 'Create Instructor',
        details: `Admin created instructor account for ${createDraft.email.trim()}`,
        targetEmail: createDraft.email.trim(),
      });

      alert('Instructor account created!');

      setCreateDraft({ fname: '', lname: '', email: '', number: '', username: '', password: '' });

      await fetchUsers();
      await fetchLogs();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || 'Failed to create instructor.');
    } finally {
      setCreating(false);
    }
  };

  const renderDashboard = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Dashboard</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderInstitution = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Institution Management</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderDataset = () => (
    <div className="adminCard">
      <div className="adminCardHead">
        <div className="adminTitle">Dataset Management</div>
        <div className="adminSub">Content placeholder</div>
      </div>
    </div>
  );

  const renderAccountManagement = () => (
    <>
      <div className="adminTop">
        <div>
          <div className="adminTitle">Account Management</div>
          <div className="adminSub">Activate / Deactivate / Update / Delete accounts</div>
        </div>
      </div>

      {/* ✅ CREATE INSTRUCTOR CARD */}
      <div className="adminCard" style={{ marginTop: 12 }}>
        <div className="adminCardHead">
          <div className="adminTitle" style={{ fontSize: 18 }}>Create Instructor Account</div>
          <div className="adminSub">This will appear in Account Management and Audit Logs.</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          <input
            style={miniInputFullWide}
            placeholder="First name"
            value={createDraft.fname}
            onChange={(e) => setCreateDraft((p) => ({ ...p, fname: e.target.value }))}
          />
          <input
            style={miniInputFullWide}
            placeholder="Last name"
            value={createDraft.lname}
            onChange={(e) => setCreateDraft((p) => ({ ...p, lname: e.target.value }))}
          />
          <input
            style={miniInputFullWide}
            placeholder="Email"
            value={createDraft.email}
            onChange={(e) => setCreateDraft((p) => ({ ...p, email: e.target.value }))}
          />
          <input
            style={miniInputFullWide}
            placeholder="Number"
            value={createDraft.number}
            onChange={(e) => setCreateDraft((p) => ({ ...p, number: e.target.value }))}
          />
          <input
            style={miniInputFullWide}
            placeholder="Username"
            value={createDraft.username}
            onChange={(e) => setCreateDraft((p) => ({ ...p, username: e.target.value }))}
          />
          <input
            style={miniInputFullWide}
            placeholder="Temporary Password"
            type="password"
            value={createDraft.password}
            onChange={(e) => setCreateDraft((p) => ({ ...p, password: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="adminMiniBtn"
            onClick={handleCreateInstructor}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Instructor'}
          </button>
        </div>
      </div>

      {loadingUsers ? (
        <p>Loading users...</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Role</th>
                <th style={th}>Number</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td style={td}>
                    {editingId === u._id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={editDraft.fname}
                          onChange={(e) => setEditDraft((p) => ({ ...p, fname: e.target.value }))}
                          placeholder="First"
                          style={miniInput}
                        />
                        <input
                          value={editDraft.lname}
                          onChange={(e) => setEditDraft((p) => ({ ...p, lname: e.target.value }))}
                          placeholder="Last"
                          style={miniInput}
                        />
                      </div>
                    ) : (
                      `${u.fname || ''} ${u.lname || ''}`
                    )}
                  </td>

                  <td style={td}>
                    {editingId === u._id ? (
                      <input
                        value={editDraft.email}
                        onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Email"
                        style={miniInputFull}
                      />
                    ) : (
                      u.email
                    )}
                  </td>

                  <td style={td}>
                    {editingId === u._id ? (
                      <input
                        value={editDraft.role}
                        disabled
                        placeholder="role"
                        style={miniInputFull}
                      />
                    ) : (
                      u.role || 'user'
                    )}
                  </td>

                  <td style={td}>
                    {editingId === u._id ? (
                      <input
                        value={editDraft.number}
                        onChange={(e) => setEditDraft((p) => ({ ...p, number: e.target.value }))}
                        placeholder="Number"
                        style={miniInputFull}
                      />
                    ) : (
                      u.number || '-'
                    )}
                  </td>

                  <td style={td}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontWeight: 800,
                        background: u.active ? 'rgba(0, 200, 100, 0.12)' : 'rgba(255, 0, 80, 0.10)',
                        border: u.active ? '1px solid rgba(0, 200, 100, 0.25)' : '1px solid rgba(255, 0, 80, 0.22)',
                      }}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="adminMiniBtn" onClick={() => toggleActive(u)}>
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>

                      {editingId === u._id ? (
                        <>
                          <button type="button" className="adminMiniBtn" onClick={saveEdit}>
                            Save
                          </button>
                          <button type="button" className="adminMiniBtn" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" className="adminMiniBtn" onClick={() => startEdit(u)}>
                          Update
                        </button>
                      )}

                      <button type="button" className="adminMiniBtn danger" onClick={() => deleteUser(u)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderAuditLogs = () => (
    <>
      <div className="auditTop">
        <div>
          <div className="adminTitle">Audit Logs</div>
          <div className="adminSub">Track user activities: logins and registrations</div>
        </div>
      </div>

      <div className="auditFilters">
        <div className="auditField">
          <label>Activity Type</label>
          <select value={activityType} onChange={(e) => setActivityType(e.target.value)}>
            <option>All Activities</option>
            <option>Login</option>
            <option>Registration</option>
            <option>Create Instructor</option>
            <option>Status Change</option>
            <option>Update</option>
            <option>Delete</option>
          </select>
        </div>

        <div className="auditField">
          <label>From Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="auditField">
          <label>To Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button type="button" className="auditClearBtn" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      <div className="auditStats">
        <div className="auditStatCard">
          <div className="auditStatNum">{totalLogins}</div>
          <div className="auditStatLabel">Total Logins</div>
        </div>

        <div className="auditStatCard">
          <div className="auditStatNum">{totalRegistrations}</div>
          <div className="auditStatLabel">Registrations</div>
        </div>
      </div>

      {loadingLogs ? (
        <p>Loading logs...</p>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Date & Time</th>
                <th style={th}>Activity</th>
                <th style={th}>User</th>
                <th style={th}>Role</th>
                <th style={th}>Email</th>
                <th style={th}>Details</th>
              </tr>
            </thead>

            <tbody>
              {filteredLogs.map((l) => {
                const d = getLogDate(l);
                const actionLabel = normalizeAction(l);

                return (
                  <tr key={l._id}>
                    <td style={td}>{d ? d.toLocaleString() : '-'}</td>
                    <td style={td}>{actionLabel}</td>
                    <td style={td}>{getLogUser(l)}</td>
                    <td style={td}>{getLogRole(l)}</td>
                    <td style={td}>{getLogEmail(l)}</td>
                    <td style={td}>{getLogDetails(l)}</td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td style={td} colSpan={6}>
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderMain = () => {
    if (active === 'Dashboard') return renderDashboard();
    if (active === 'Institution Management') return renderInstitution();
    if (active === 'Dataset Management') return renderDataset();
    if (active === 'Account Management') return renderAccountManagement();
    if (active === 'Audit Logs') return renderAuditLogs();
    return renderDashboard();
  };

  return (
    <div className="adWrap">
      <aside className="adSide">
        <div className="adSideTop">
          <div className="adLogo">MyphoLens</div>
          <div className="adSectionTitle">ADMIN</div>

          <div className="adNav">
            <button
              type="button"
              className={`adNavBtn ${active === 'Dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('Dashboard')}
            >
              <span className="adDot" />
              Dashboard
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Institution Management' ? 'active' : ''}`}
              onClick={() => handleNav('Institution Management')}
            >
              <span className="adDot" />
              Institution Management
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Account Management' ? 'active' : ''}`}
              onClick={() => handleNav('Account Management')}
            >
              <span className="adDot" />
              Account Management
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Dataset Management' ? 'active' : ''}`}
              onClick={() => handleNav('Dataset Management')}
            >
              <span className="adDot" />
              Dataset Management
            </button>

            <button
              type="button"
              className={`adNavBtn ${active === 'Audit Logs' ? 'active' : ''}`}
              onClick={() => handleNav('Audit Logs')}
            >
              <span className="adDot" />
              Audit Logs
            </button>
          </div>
        </div>

        <div className="adSideBottom">
          <button type="button" className="adLogout" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </aside>

      <section className="adMain">
        <header className="adTopbar">
          <form className="adSearch" onSubmit={handleSearch}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                active === 'Audit Logs'
                  ? 'Search logs...'
                  : active === 'Account Management'
                    ? 'Search users...'
                    : 'Search...'
              }
            />
            <button type="submit">⌕</button>
          </form>
        </header>

        <div className="adContent">{renderMain()}</div>
      </section>
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  fontWeight: 900,
};

const td = {
  padding: '10px 8px',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  verticalAlign: 'top',
};

const miniInput = {
  width: 120,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.18)',
};

const miniInputFull = {
  width: 220,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.18)',
};

const miniInputFullWide = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.14)',
  outline: 'none',
};

export default Admin;
