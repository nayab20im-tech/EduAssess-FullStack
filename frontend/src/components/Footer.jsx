import { Container, Row, Col } from 'react-bootstrap';
import { FaArrowUp, FaGithub, FaLinkedinIn, FaTwitter } from 'react-icons/fa';
import LogoIcon from './LogoIcon';

const Footer = () => (
  <footer className="site-footer">
    <Container>
      <div className="footer-cta">
        <div>
          <span className="eyebrow-light">Ready for smarter assessments?</span>
          <h2>Turn every quiz into useful learning.</h2>
        </div>
        <a href="/register" className="footer-cta-button">Create free account <FaArrowUp /></a>
      </div>

      <Row className="g-4 footer-main">
        <Col lg={5}>
          <div className="footer-brand">
            <span className="brand-mark"><LogoIcon size={25} variant="white" /></span>
            <strong>EduAssess</strong>
          </div>
          <p className="footer-description">
            A modern quiz and assessment experience for students, educators, and academic teams.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="Twitter"><FaTwitter /></a>
            <a href="#" aria-label="LinkedIn"><FaLinkedinIn /></a>
            <a href="#" aria-label="GitHub"><FaGithub /></a>
          </div>
        </Col>
        <Col sm={4} lg={2}>
          <h6>Platform</h6>
          <a href="#features">Features</a>
          <a href="#roles">User roles</a>
          <a href="/login">Log in</a>
        </Col>
        <Col sm={4} lg={2}>
          <h6>Resources</h6>
          <a href="#how-it-works">How it works</a>
          <a href="#">Help center</a>
          <a href="#">Privacy</a>
        </Col>
        <Col sm={4} lg={3}>
          <h6>Built for education</h6>
          <p className="footer-small">Secure assessment workflows, useful analytics, and engaging quiz experiences.</p>
        </Col>
      </Row>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} EduAssess. All rights reserved.</span>
        <span>Designed for better learning outcomes.</span>
      </div>
    </Container>
  </footer>
);

export default Footer;
