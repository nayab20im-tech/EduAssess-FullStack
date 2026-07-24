import { useEffect, useRef, useState } from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowDown,
  FaArrowRight,
  FaBolt,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaFilePdf,
  FaFingerprint,
  FaGraduationCap,
  FaLayerGroup,
  FaMagic,
  FaPause,
  FaPlay,
  FaRobot,
  FaShieldAlt,
  FaStar,
  FaTrophy,
  FaUserGraduate,
  FaUserShield,
  FaChalkboardTeacher
} from 'react-icons/fa';
import NavigationBar from '../components/NavigationBar';
import Footer from '../components/Footer';
import '../styles/LandingPage.css';

const storySteps = [
  {
    id: 'create',
    number: '01',
    kicker: 'Create with momentum',
    title: 'A quiz starts forming while you scroll.',
    copy: 'Pick a topic, mix MCQs and short answers, then let AI prepare an editable first draft.',
    icon: <FaMagic />
  },
  {
    id: 'attempt',
    number: '02',
    kicker: 'Focused student flow',
    title: 'The interface changes into a calm quiz room.',
    copy: 'Private access codes, a clear timer, saved answers, and gentle progress cues keep students focused.',
    icon: <FaFingerprint />
  },
  {
    id: 'evaluate',
    number: '03',
    kicker: 'Evaluation in motion',
    title: 'Scores arrive as the submission is processed.',
    copy: 'MCQs are checked instantly and AI suggestions appear for descriptive answers while teachers retain control.',
    icon: <FaRobot />
  },
  {
    id: 'report',
    number: '04',
    kicker: 'Close the loop',
    title: 'Turn every result into a useful learning story.',
    copy: 'Review feedback, adjust marks, notify students, and download polished reports for both roles.',
    icon: <FaFilePdf />
  }
];

const StoryScreen = ({ activeStep }) => {
  const screens = [
    <div className="story-ui story-ui-create" key="create">
      <div className="story-app-topbar">
        <span><FaLayerGroup /> AI quiz studio</span>
        <small>Draft saved</small>
      </div>
      <div className="story-generator-grid">
        <div className="story-topic-card">
          <small>Topic</small>
          <strong>Database normalization</strong>
          <div className="typing-line"><span /></div>
        </div>
        <div className="story-type-card is-selected"><FaCheck /> 4 MCQs</div>
        <div className="story-type-card is-selected"><FaCheck /> 2 short answers</div>
      </div>
      <div className="story-question-stack">
        <div><span>Q1</span><strong>Which normal form removes partial dependency?</strong></div>
        <div><span>Q2</span><strong>Explain transitive dependency in one example.</strong></div>
        <div><span>Q3</span><strong>Choose the correct decomposition.</strong></div>
      </div>
      <button className="story-primary-action"><FaStar /> Generate assessment</button>
    </div>,
    <div className="story-ui story-ui-attempt" key="attempt">
      <div className="story-app-topbar">
        <span><FaShieldAlt /> Secure assessment</span>
        <small className="story-live-pill">Live</small>
      </div>
      <div className="story-quiz-meta">
        <div><small>Question 4 of 8</small><strong>ACID Properties</strong></div>
        <span><FaClock /> 08:42</span>
      </div>
      <div className="story-progress-track"><span /></div>
      <h4>Which property guarantees all-or-nothing execution?</h4>
      <div className="story-options">
        <button><span>A</span> Consistency</button>
        <button className="active"><span>B</span> Atomicity <FaCheckCircle /></button>
        <button><span>C</span> Isolation</button>
        <button><span>D</span> Durability</button>
      </div>
      <div className="story-answer-saved"><FaCheckCircle /> Answer encrypted and saved</div>
    </div>,
    <div className="story-ui story-ui-evaluate" key="evaluate">
      <div className="story-app-topbar">
        <span><FaRobot /> Runtime evaluation</span>
        <small>Processing 3/3</small>
      </div>
      <div className="story-score-hero">
        <div className="story-score-ring"><strong>86</strong><span>%</span></div>
        <div><small>Provisional result</small><h4>Strong conceptual understanding</h4><p>AI confidence 94%</p></div>
      </div>
      <div className="story-evaluation-list">
        <div><span className="is-correct"><FaCheck /></span><div><strong>MCQ answers</strong><small>4 of 4 correct</small></div><b>4/4</b></div>
        <div><span><FaRobot /></span><div><strong>Short answer 1</strong><small>Clear definition, example needs detail</small></div><b>3.5/5</b></div>
        <div><span><FaRobot /></span><div><strong>Short answer 2</strong><small>All key concepts detected</small></div><b>5/5</b></div>
      </div>
      <div className="story-teacher-control"><span /> Teacher can edit every suggested mark</div>
    </div>,
    <div className="story-ui story-ui-report" key="report">
      <div className="story-app-topbar">
        <span><FaFilePdf /> Result centre</span>
        <small>Ready to share</small>
      </div>
      <div className="story-report-sheet">
        <div className="story-report-brand"><FaGraduationCap /><div><strong>EduAssess</strong><small>Assessment report</small></div></div>
        <div className="story-report-user"><span>FS</span><div><strong>Fatima Sohail</strong><small>Database Systems · 86%</small></div></div>
        <div className="story-report-bars">
          <div><span>Accuracy</span><i><b style={{ width: '86%' }} /></i><strong>86%</strong></div>
          <div><span>Concept mastery</span><i><b style={{ width: '91%' }} /></i><strong>91%</strong></div>
          <div><span>Completion</span><i><b style={{ width: '100%' }} /></i><strong>100%</strong></div>
        </div>
        <div className="story-report-feedback"><FaStar /> Great work. Revise partial dependency examples before the next assessment.</div>
      </div>
      <div className="story-report-actions"><button><FaFilePdf /> Download PDF</button><button><FaArrowRight /> Email result</button></div>
    </div>
  ];

  return (
    <div className="story-device-shell">
      <div className="story-device-camera" />
      <div className="story-device-screen">
        {screens.map((screen, index) => (
          <div
            key={storySteps[index].id}
            className={`story-screen-layer ${index === activeStep ? 'is-active' : ''}`}
            aria-hidden={index !== activeStep}
          >
            {screen}
          </div>
        ))}
      </div>
    </div>
  );
};

const ScrollStory = () => {
  const sectionRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId = 0;

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const distance = Math.max(1, section.offsetHeight - window.innerHeight);
      const nextProgress = Math.min(1, Math.max(0, -rect.top / distance));
      const nextStep = Math.min(storySteps.length - 1, Math.floor(nextProgress * storySteps.length));

      setProgress(nextProgress);
      setActiveStep(nextStep);
      frameId = 0;
    };

    const onScroll = () => {
      if (!frameId) frameId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="scroll-story-section">
      <div className="scroll-story-progress" aria-hidden="true">
        <span style={{ transform: `scaleY(${progress})` }} />
      </div>
      <Container className="scroll-story-container">
        <div className="scroll-story-copy-column">
          {storySteps.map((step, index) => (
            <article
              key={step.id}
              className={`scroll-story-copy ${index === activeStep ? 'is-active' : ''}`}
            >
              <span className="story-step-number">{step.number}</span>
              <div className="story-step-icon">{step.icon}</div>
              <span className="section-kicker">{step.kicker}</span>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
              <div className="story-step-indicator">
                {storySteps.map((item, dotIndex) => (
                  <i key={item.id} className={dotIndex === activeStep ? 'active' : ''} />
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="scroll-story-visual-column">
          <div className="scroll-story-sticky">
            <div className="story-visual-glow" />
            <StoryScreen activeStep={activeStep} />
            <div className="story-floating-label story-label-left"><FaBolt /> Scroll-linked UI</div>
            <div className="story-floating-label story-label-right"><FaCheckCircle /> Changes live</div>
          </div>
        </div>
      </Container>
    </section>
  );
};

const ProductReel = () => {
  const [activeScene, setActiveScene] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;

    const interval = window.setInterval(() => {
      setActiveScene((scene) => (scene + 1) % storySteps.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [playing]);

  const scene = storySteps[activeScene];

  return (
    <section className="product-reel-section" aria-label="EduAssess product experience">
      <Container>
        <div className="product-reel-shell" data-reveal>
          <div className="reel-noise" aria-hidden="true" />

          <div className="reel-copy-panel">
            <div className="reel-status-row">
              <span><i /> Product film</span>
              <small>00:17</small>
            </div>

            <div key={scene.id} className="reel-copy-scene">
              <span className="section-kicker">{scene.kicker}</span>
              <h2>{scene.title}</h2>
              <p>{scene.copy}</p>
            </div>

            <div className="reel-controls">
              <button
                type="button"
                className="reel-play-button"
                onClick={() => setPlaying((isPlaying) => !isPlaying)}
                aria-label={playing ? 'Pause product film' : 'Play product film'}
              >
                {playing ? <FaPause /> : <FaPlay />}
              </button>

              <div className="reel-timeline" aria-label="Product film scenes">
                {storySteps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    className={index === activeScene ? 'is-active' : ''}
                    onClick={() => {
                      setActiveScene(index);
                      setPlaying(false);
                    }}
                    aria-label={`Show scene ${index + 1}: ${step.kicker}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <i>
                      {index === activeScene && playing && (
                        <b key={`${step.id}-${activeScene}`} />
                      )}
                    </i>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="reel-visual-panel">
            <div className="reel-spotlight" aria-hidden="true" />
            <div className="reel-frame-label">
              <span>EduAssess OS</span>
              <small>Live experience</small>
            </div>
            <StoryScreen activeStep={activeScene} />
            <div className="reel-frame-counter">
              <strong>{String(activeScene + 1).padStart(2, '0')}</strong>
              <span>/ {String(storySteps.length).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [previewAnswer, setPreviewAnswer] = useState('Atomicity');

  const handleLogin = (role = 'Student') => navigate('/login', { state: { role } });

  const roles = [
    {
      icon: <FaUserGraduate />,
      title: 'Students',
      description: 'A focused quiz room, instant feedback, progress analytics, and downloadable reports.',
      accent: 'violet',
      action: () => handleLogin('Student')
    },
    {
      icon: <FaChalkboardTeacher />,
      title: 'Educators',
      description: 'Create assessments, follow live activity, adjust AI marks, and share results by email.',
      accent: 'cyan',
      action: () => handleLogin('Teacher')
    },
    {
      icon: <FaUserShield />,
      title: 'Administrators',
      description: 'Control user access and monitor the health of the complete assessment platform.',
      accent: 'amber',
      action: () => handleLogin('Admin')
    }
  ];

  return (
    <div id="top" className="landing-page cinematic-landing">
      <NavigationBar onLoginClick={() => handleLogin()} onSignUpClick={() => navigate('/register')} />

      <main>
        <section className="cinematic-hero">
          <div className="cinematic-grid" />
          <div className="cinematic-orb cinematic-orb-one" />
          <div className="cinematic-orb cinematic-orb-two" />
          <div className="cinematic-orb cinematic-orb-three" />

          <Container className="position-relative">
            <Row className="align-items-center gy-5">
              <Col lg={6}>
                <div className="cinematic-hero-copy">
                  <div className="landing-eyebrow"><FaStar /> Assessment reimagined</div>
                  <h1>
                    Learning that moves
                    <span> with every scroll.</span>
                  </h1>
                  <p className="hero-lead">
                    EduAssess turns quiz creation, secure attempts, AI evaluation, live monitoring, and reports into one fluid experience.
                  </p>
                  <div className="hero-actions">
                    <button className="hero-primary-button" onClick={() => navigate('/register')}>
                      Start your journey <FaArrowRight />
                    </button>
                    <button className="hero-secondary-button" onClick={() => handleLogin()}>
                      <span><FaPlay /></span> Open student portal
                    </button>
                  </div>
                  <div className="hero-proof-row">
                    <div className="hero-proof-card"><FaShieldAlt /><span><strong>Private access</strong><small>Code-protected quizzes</small></span></div>
                    <div className="hero-proof-card"><FaRobot /><span><strong>Human-controlled AI</strong><small>Editable evaluation</small></span></div>
                  </div>
                </div>
              </Col>

              <Col lg={6}>
                <div className="hero-stage">
                  <div className="hero-stage-halo" />
                  <div className="hero-stage-chip hero-chip-top"><FaTrophy /> +120 learning XP</div>
                  <div className="hero-quiz-window">
                    <div className="hero-window-toolbar">
                      <div><span /><span /><span /></div>
                      <small>eduassess.app / secure-quiz</small>
                      <FaShieldAlt />
                    </div>
                    <div className="hero-window-content">
                      <div className="hero-question-top">
                        <div><span>Database systems</span><strong>Question 3 of 8</strong></div>
                        <div className="preview-timer"><FaClock /> 08:42</div>
                      </div>
                      <div className="hero-progress"><span /></div>
                      <h3>Which ACID property means a transaction happens fully or not at all?</h3>
                      <div className="hero-option-list">
                        {['Consistency', 'Atomicity', 'Isolation', 'Durability'].map((answer, index) => (
                          <button
                            key={answer}
                            className={previewAnswer === answer ? 'selected' : ''}
                            onClick={() => setPreviewAnswer(answer)}
                          >
                            <span>{String.fromCharCode(65 + index)}</span>
                            {answer}
                            {previewAnswer === answer && <FaCheckCircle />}
                          </button>
                        ))}
                      </div>
                      <div className="hero-answer-feedback">
                        <FaCheckCircle />
                        <div><strong>{previewAnswer === 'Atomicity' ? 'Correct — beautifully done.' : 'Answer selected.'}</strong><small>Your response is saved instantly.</small></div>
                      </div>
                    </div>
                  </div>
                  <div className="hero-stage-chip hero-chip-bottom"><FaChartLine /> Live progress +18%</div>
                </div>
              </Col>
            </Row>

            <a className="hero-scroll-cue" href="#how-it-works">
              <span>Scroll to watch the product story</span><FaArrowDown />
            </a>
          </Container>
        </section>

        <section className="landing-trust-ribbon" data-reveal>
          <Container>
            <div><strong>Code protected</strong><span>Only invited students enter</span></div>
            <div><strong>AI + teacher</strong><span>Automation without losing control</span></div>
            <div><strong>Live insight</strong><span>Submission activity as it happens</span></div>
            <div><strong>Report ready</strong><span>PDF and email sharing</span></div>
          </Container>
        </section>

        <ProductReel />

        <ScrollStory />

        <section id="features" className="landing-section bento-section">
          <Container>
            <div className="landing-section-heading" data-reveal>
              <span className="section-kicker">Built to feel alive</span>
              <h2>Every interaction gives the user a response.</h2>
              <p>Motion supports clarity: it shows progress, confirms actions, and helps each role understand what comes next.</p>
            </div>

            <div className="bento-grid">
              <article className="bento-card bento-card-large" data-reveal>
                <div className="bento-icon"><FaMagic /></div>
                <span className="bento-tag">AI studio</span>
                <h3>Build mixed assessments with exact question counts.</h3>
                <p>Teachers control MCQ and short-answer quantities, difficulty, evaluation mode, and every generated detail.</p>
                <div className="bento-mini-builder">
                  <div><span>MCQ</span><strong>04</strong></div>
                  <div><span>Short answer</span><strong>02</strong></div>
                  <button><FaStar /> Generate</button>
                </div>
              </article>

              <article className="bento-card bento-card-dark" data-reveal>
                <div className="bento-icon"><FaFingerprint /></div>
                <span className="bento-tag">Controlled access</span>
                <h3>A private code opens the assessment.</h3>
                <div className="bento-code">A7K9P2XZ</div>
                <div className="bento-pulse"><i /><span>Waiting for students</span></div>
              </article>

              <article className="bento-card" data-reveal>
                <div className="bento-icon"><FaChartLine /></div>
                <span className="bento-tag">Live insight</span>
                <h3>Watch the class move in real time.</h3>
                <div className="bento-chart">
                  {[35, 58, 46, 72, 64, 90, 82].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
                </div>
              </article>

              <article className="bento-card bento-card-wide" data-reveal>
                <div className="bento-icon"><FaRobot /></div>
                <span className="bento-tag">Editable intelligence</span>
                <h3>AI suggests. Teachers decide.</h3>
                <p>Every descriptive score and feedback message can be reviewed, changed, approved, and emailed to the student.</p>
                <div className="bento-evaluation-row"><span><FaRobot /> AI suggestion</span><strong>4.0 / 5</strong><button>Review mark</button></div>
              </article>
            </div>
          </Container>
        </section>

        <section id="roles" className="landing-section role-section">
          <Container>
            <div className="landing-section-heading" data-reveal>
              <span className="section-kicker">One platform, three perspectives</span>
              <h2>A workspace shaped around each role.</h2>
            </div>
            <Row className="g-4">
              {roles.map((role) => (
                <Col lg={4} key={role.title}>
                  <article className={`role-experience-card role-${role.accent}`} data-reveal onClick={role.action}>
                    <div className="role-experience-icon">{role.icon}</div>
                    <span>Workspace</span>
                    <h3>{role.title}</h3>
                    <p>{role.description}</p>
                    <button>Enter {role.title.toLowerCase()} portal <FaArrowRight /></button>
                  </article>
                </Col>
              ))}
            </Row>
          </Container>
        </section>

        <section className="landing-final-cta">
          <Container>
            <div className="final-cta-panel" data-reveal>
              <div className="final-cta-orb" />
              <span className="section-kicker">Ready when you are</span>
              <h2>Make assessment feel less like a form and more like an experience.</h2>
              <p>Start with a free account and explore the complete quiz journey.</p>
              <div>
                <button className="hero-primary-button" onClick={() => navigate('/register')}>Create account <FaArrowRight /></button>
                <button className="hero-secondary-button" onClick={() => handleLogin('Teacher')}>Teacher login</button>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
