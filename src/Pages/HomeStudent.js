import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function HomePageStudent() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('Dashboard');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    alert(`Searching for: ${search}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user'); 
    navigate('/Login');
  };

  const handleNav = (name) => {
    setActive(name);
    if (name === 'Settings') setSettingsOpen((v) => !v);
    else setSettingsOpen(false);
  };

  const handleAccSet = () => {
    setSettingsOpen(false);

    let user = null;
    try {
      const raw = localStorage.getItem('user');
      user = raw ? JSON.parse(raw) : null;
    } catch {
      user = null;
    }

    navigate('/AccountSettings', {
      state: { employee: user },
    });
  };

  return (
    <div className="homeBody">
      <aside className="homeSidebar">
        <div className="homeLogo">
          <div className="logoMark">M</div>
          <div className="logoText">
            <h2>MyCro</h2>
            <p>Dashboard</p>
          </div>
        </div>

        <nav className="sideNav">
          <button
            className={`sideBtn ${active === 'Dashboard' ? 'active' : ''}`}
            onClick={() => handleNav('Dashboard')}
            type="button"
          >
            Dashboard
          </button>

          <button
            className={`sideBtn ${active === 'Lessons' ? 'active' : ''}`}
            onClick={() => handleNav('Lessons')}
            type="button"
          >
            Lesson
          </button>

          <button
            className={`sideBtn ${active === 'Task' ? 'active' : ''}`}
            onClick={() => handleNav('Task')}
            type="button"
          >
            Task
          </button>

          <button
            className={`sideBtn ${active === 'Settings' ? 'active' : ''}`}
            onClick={() => handleNav('Settings')}
            type="button"
          >
            Settings
            <span className={`chev ${settingsOpen ? 'open' : ''}`}>›</span>
          </button>

          <div className={`settingsDrop ${settingsOpen ? 'open' : ''}`}>
            <button type="button" className="dropBtn" onClick={handleAccSet}>
              Account
            </button>

            <button
              type="button"
              className="dropBtn"
              onClick={() => alert('Privacy (placeholder)')}
            >
              Privacy
            </button>

            <button
              type="button"
              className="dropBtn"
              onClick={() => alert('About (placeholder)')}
            >
              About
            </button>

            <div className="dropLine" />

            <button type="button" className="dropBtn danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <section className="homeContent">
        <header className="homeHeader">
          <form className="searchForm" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">🔍</button>
          </form>
        </header>

        <main className="homeMain">
          <div className="contentCard">
            <h1>Welcome mga cute!</h1>
            <p>blahblahblahblahblah</p>

            <div className="activePill">
              Current: <b>{active}</b>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}

export default HomePageStudent;
