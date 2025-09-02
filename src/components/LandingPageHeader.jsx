import { useState, useEffect, useRef  } from "react";

export default function LandingPageHeader() {
  /* Header scroll behavior */
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      setLastScrollY(currentScrollY);

      // Reset timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setVisible(true);
      }, 150);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lastScrollY]);

  return (
    <header className={`landing-header ${visible ? "show" : "hide"}`}>
      <a href="/">
        <img src="/logo.svg" alt="Droptimize Logo" className="landing-logo" />
      </a>

      <nav className="landing-nav">
        <a href="/" className="landing-nav-link">Home</a>
        <a href="#features" className="landing-nav-link">Features</a>
        <a href="#about" className="landing-nav-link">About</a>
        <a href="#contact" className="landing-nav-link">Contact</a>
      </nav>

      <div className="landing-auth-buttons">
        <a href="/login" className="landing-login-button">Login</a>
        <a href="/signup" className="landing-signup-button">Sign Up</a>
      </div>
    </header>
  );
};
