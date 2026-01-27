import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import Login from './Login';
import Register from './Register';

function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // login | register

  const openLogin = () => {
    setAuthView('login');
    setAuthOpen(true);
  };

  const openRegister = () => {
    setAuthView('register');
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
  };

  // ESC close + lock body scroll
  useEffect(() => {
    if (!authOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeAuth();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('lpNoScroll');

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('lpNoScroll');
    };
  }, [authOpen]);

  return (
    <div className="lpBody">
      {/* background content */}
      <div className={`lpBackdrop ${authOpen ? 'blurred' : ''}`}>
        <header className="lpHeader">
          <div className="lpBrand" role="button" tabIndex={0}>
            <span className="lpBrandText">MyphoLens</span>
          </div>

          <div className="lpSearchWrap">
            <span className="lpSearchIcon">⌕</span>
            <input className="lpSearch" type="text" placeholder="Search Mycology Topics" />
          </div>

          <div className="lpTopActions">
            <button type="button" className="lpLinkBtn" onClick={openLogin}>
              SIGN IN
            </button>

            <button type="button" className="lpOutlineBtn" onClick={openRegister}>
              SIGN UP
            </button>
          </div>
        </header>

        <main className="lpMain">
          <section className="lpHero">
            <div className="lpLeft">
              <h1 className="lpTitle">HEADLINE ABOUT MYPHOLENS</h1>
              <p className="lpSub">SUBTITLE OR TAGLINE ABOUT MYPHOLENS</p>

              <button type="button" className="lpCta" onClick={openLogin}>
                GET STARTED
              </button>
            </div>

            <div className="lpRight">
              <div className="lpArtStack">
                <div className="lpArt lpArtBig" />
                <div className="lpArt lpArtMid" />
                <div className="lpArt lpArtSmall" />
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* modal */}
      {authOpen && (
        <div className="lpModalOverlay" onClick={closeAuth}>
          <div className="lpModalCard" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lpModalClose" onClick={closeAuth} aria-label="Close">
              ✕
            </button>

            {authView === 'login' ? (
              <Login
                isModal
                onClose={closeAuth}
                onSwitchToRegister={() => setAuthView('register')}
              />
            ) : (
              <Register
                isModal
                onClose={closeAuth}
                onSwitchToLogin={() => setAuthView('login')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
