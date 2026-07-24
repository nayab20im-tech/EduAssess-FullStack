import { useEffect, useState } from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { FaArrowRight } from 'react-icons/fa';
import LogoIcon from './LogoIcon';

const NavigationBar = ({ onLoginClick, onSignUpClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 18);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Navbar expand="lg" fixed="top" className={`public-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
      <Container>
        <Navbar.Brand href="#top" className="brand-lockup">
          <span className="brand-mark"><LogoIcon size={25} variant="white" /></span>
          <span>
            <strong>EduAssess</strong>
            <small>Learn. Play. Grow.</small>
          </span>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="public-nav" className="public-nav-toggle" />

        <Navbar.Collapse id="public-nav">
          <Nav className="mx-auto public-nav-links">
            <Nav.Link href="#features">Features</Nav.Link>
            <Nav.Link href="#roles">For everyone</Nav.Link>
            <Nav.Link href="#how-it-works">How it works</Nav.Link>
          </Nav>

          <div className="public-nav-actions">
            <button className="btn-nav-ghost" onClick={onLoginClick}>Log in</button>
            <button className="btn-nav-primary" onClick={onSignUpClick}>
              Start free <FaArrowRight size={12} />
            </button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
