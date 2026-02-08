import React, { useEffect, useState } from 'react';
import './LandingPage.css';
import Login from './Login';
import Register from './Register';

function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); 

  const openLogin = () => {
    setAuthView('login');
    setAuthOpen(true);
  };

  const openRegister = () => {
    setAuthView('register');
    setAuthOpen(true);
  };

  const closeAuth = () => setAuthOpen(false);
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
      <div className={`lpBackdrop ${authOpen ? 'blurred' : ''}`}>
        {/* TOP NAV */}
        <header className="lpHeader">
          <div className="lpBrand" role="button" tabIndex={0}>
            <span className="lpBrandText">MyphoLens</span>
          </div>

          <div className="lpTopActions">
            <button type="button" className="lpLinkBtn" onClick={openLogin}>
              Sign In
            </button>

            <button type="button" className="lpPrimaryBtn" onClick={openRegister}>
              Sign Up
            </button>
          </div>
        </header>

        <main className="lpMain">
            <div className="lpHeroInner">
              <div className="lpLeft">
                <div className="lpPill">M2KP InnoVance</div>

                <h1 className="lpTitle">
                  Redefining precision
                  <br />
                  in <span className="lpAccent">diagnostic</span>
                  <br />
                  imaging.
                </h1>

                <p className="lpSub">
                  Artificial Intelligence (AI) and Augmented Reality 
                  <br />
                  (AR)-Powered Fungal Morphology Learning Tool for the Medical
                  <br />
                  Technology Department of National University - Mall of Asia.
                </p>

                <button type="button" className="lpCta" onClick={openLogin}>
                  <span>Get Started</span>
                  <span className="lpArrow">→</span>
                </button>
              </div>

              <div className="lpRight">
                <div className="lpBlob lpBlob1" />
                <div className="lpBlob lpBlob2" />
                <div className="lpBlob lpBlob3" />
              </div>
            </div>
        </main>
      </div>

      {authOpen && (
        <div className="lpModalOverlay" onClick={closeAuth}>
          <div className="lpModalCard" onClick={(e) => e.stopPropagation()}>

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
