
import React from 'react';
import '../index.css';
import {
  Truck,
  ArrowRight,
  MapPinned,
  Activity,
  ShieldCheck,
  BarChart3,
  Fuel,
  Wrench,
  Clock3
} from 'lucide-react';

const features = [
  {
    icon: MapPinned,
    title: 'Live Fleet Visibility',
    description:
      'Keep vehicles, trips and daily operations organized in one centralized workspace.'
  },
  {
    icon: Activity,
    title: 'Smarter Operations',
    description:
      'Monitor fleet activity, identify delays and make informed operational decisions.'
  },
  {
    icon: Wrench,
    title: 'Preventive Maintenance',
    description:
      'Organize service records and stay ahead of vehicle maintenance requirements.'
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description:
      'Understand fleet performance, fuel consumption and expenses through useful insights.'
  }
];

export default function Home({ onSignIn, onGetStarted }) {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  return (
    <main className="fn-home">
      <header className="fn-navbar">
        <a
          href="#home"
          className="fn-brand"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="fn-logo">
            <Truck size={25} strokeWidth={2.5} />
          </span>
          <span>FleetNova<span className="fn-dot">.</span></span>
        </a>

        <nav className="fn-nav-links">
          <button onClick={() => scrollTo('fn-features')}>Features</button>
          <button onClick={() => scrollTo('fn-solutions')}>Solutions</button>
          <button onClick={() => scrollTo('fn-how')}>How It Works</button>
        </nav>

        <div className="fn-nav-actions">
          <button
            className="fn-button fn-button-dark"
            onClick={onSignIn}
          >
            Sign In
          </button>
          <button
            className="fn-button fn-button-blue"
            onClick={onGetStarted}
          >
            Get Started <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="fn-hero" id="home">
        <div className="fn-hero-glow" />

        <div className="fn-hero-content">
          <div className="fn-eyebrow">
            <span className="fn-live-dot" />
            SMART FLEET MANAGEMENT PLATFORM
          </div>

          <h1>
            Move Your Fleet Forward.
            <br />
            <span>Manage Smarter.</span>
          </h1>

          <p className="fn-hero-description">
            A unified platform to manage vehicles, drivers, trips,
            fuel and maintenance. Bring your fleet operations
            together and turn everyday data into better decisions.
          </p>

          <div className="fn-hero-buttons">
            <button
              className="fn-button fn-button-blue fn-hero-primary"
              onClick={onGetStarted}
            >
              Get Started for Free <ArrowRight size={18} />
            </button>

            <button
              className="fn-button fn-button-dark fn-hero-secondary"
              onClick={onSignIn}
            >
              Sign In to Dashboard
            </button>
          </div>

          <div className="fn-trust-row">
            <span><ShieldCheck size={17} /> Centralized fleet control</span>
            <i />
            <span><Activity size={17} /> Data-driven insights</span>
            <i />
            <span><Clock3 size={17} /> Simplified operations</span>
          </div>
        </div>

        <div className="fn-dashboard-preview">
          <div className="fn-preview-topbar">
            <div className="fn-preview-brand">
              <span className="fn-preview-mark">
                <Truck size={19} />
              </span>
              <span>
                FleetNova
                <small>OPERATIONS CENTER</small>
              </span>
            </div>

            <div className="fn-preview-live">
              <span className="fn-live-dot" />
              DASHBOARD PREVIEW
            </div>
          </div>

          <div className="fn-preview-content">
            <div className="fn-preview-heading">
              <div>
                <span className="fn-preview-label">OVERVIEW</span>
                <h3>Fleet Command Center</h3>
              </div>
              <span className="fn-preview-date">Fleet Overview</span>
            </div>

            <div className="fn-stat-grid">
              <div className="fn-stat-card">
                <span className="fn-stat-icon blue">
                  <Truck size={19} />
                </span>
                <p>Total Vehicles</p>
                <h3>128</h3>
                <small>Fleet registry</small>
              </div>

              <div className="fn-stat-card">
                <span className="fn-stat-icon cyan">
                  <Activity size={19} />
                </span>
                <p>Active Trips</p>
                <h3>36</h3>
                <small>Trip activity</small>
              </div>

              <div className="fn-stat-card">
                <span className="fn-stat-icon purple">
                  <Fuel size={19} />
                </span>
                <p>Fuel Efficiency</p>
                <h3>8.4 <small>km/L</small></h3>
                <small>Fleet average</small>
              </div>
            </div>

            <div className="fn-preview-bottom">
              <div className="fn-chart-card">
                <div className="fn-card-heading">
                  <h4>Fleet Activity</h4>
                  <span>Weekly overview</span>
                </div>

                <div className="fn-chart">
                  <div className="fn-chart-line line-1" />
                  <div className="fn-chart-line line-2" />
                  <div className="fn-chart-line line-3" />

                  <svg
                    viewBox="0 0 500 150"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Illustrative fleet activity chart"
                  >
                    <defs>
                      <linearGradient
                        id="fnChartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#2784ff" stopOpacity=".35" />
                        <stop offset="100%" stopColor="#2784ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    <path
                      d="M0 115 C35 110 45 70 85 85 S135 110 175 65 S225 80 265 48 S315 70 355 35 S405 52 445 18 S475 30 500 10 L500 150 L0 150 Z"
                      fill="url(#fnChartGradient)"
                    />

                    <path
                      d="M0 115 C35 110 45 70 85 85 S135 110 175 65 S225 80 265 48 S315 70 355 35 S405 52 445 18 S475 30 500 10"
                      fill="none"
                      stroke="#36a3ff"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="fn-chart-days">
                    <span>MON</span>
                    <span>TUE</span>
                    <span>WED</span>
                    <span>THU</span>
                    <span>FRI</span>
                    <span>SAT</span>
                    <span>SUN</span>
                  </div>
                </div>
              </div>

              <div className="fn-maintenance-card">
                <div className="fn-card-heading">
                  <h4>Maintenance</h4>
                </div>

                <div className="fn-maintenance-circle">
                  <div>
                    <strong>84%</strong>
                    <small>Illustrative</small>
                  </div>
                </div>

                <div className="fn-legend">
                  <span><i className="legend-blue" /> Operational</span>
                  <span><i className="legend-cyan" /> Service due</span>
                  <span><i className="legend-purple" /> Attention needed</span>
                </div>
              </div>
            </div>

            <p className="fn-preview-note">
              Illustrative dashboard preview — statistics are sample values.
            </p>
          </div>
        </div>
      </section>

      <section className="fn-features-section" id="fn-features">
        <div className="fn-section-heading">
          <span className="fn-section-label">
            ONE PLATFORM. EVERY MOVING PART.
          </span>

          <h2>
            Everything your fleet needs.
            <br />
            <span>All in one place.</span>
          </h2>

          <p>
            Simplify your fleet workflows with tools designed
            to bring your everyday operations together.
          </p>
        </div>

        <div className="fn-features-grid" id="fn-solutions">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article className="fn-feature-card" key={feature.title}>
                <div className={`fn-feature-icon icon-${index}`}>
                  <Icon size={23} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="fn-feature-number">
                  0{index + 1}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="fn-how-section" id="fn-how">
        <div className="fn-how-copy">
          <span className="fn-section-label">
            A CLEARER WAY TO OPERATE
          </span>

          <h2>
            From daily activity to
            <br />
            <span>better decisions.</span>
          </h2>

          <p>
            FleetNova brings essential fleet management tools
            into one connected workspace, helping teams stay
            organized and operate more efficiently.
          </p>

          <button
            className="fn-button fn-button-blue"
            onClick={onGetStarted}
          >
            Explore FleetNova <ArrowRight size={17} />
          </button>
        </div>

        <div className="fn-steps">
          <div className="fn-step">
            <span>01</span>
            <div>
              <h3>Organize your fleet</h3>
              <p>Manage vehicles, drivers and fleet information.</p>
            </div>
          </div>

          <div className="fn-step">
            <span>02</span>
            <div>
              <h3>Manage daily operations</h3>
              <p>Coordinate trips, fuel, expenses and maintenance.</p>
            </div>
          </div>

          <div className="fn-step">
            <span>03</span>
            <div>
              <h3>Make informed decisions</h3>
              <p>Use reports and analytics to understand performance.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="fn-footer">
        <a
          href="#home"
          className="fn-brand"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="fn-logo">
            <Truck size={22} />
          </span>
          <span>FleetNova<span className="fn-dot">.</span></span>
        </a>

        <p>Smarter fleet management starts here.</p>

        <button className="fn-footer-link" onClick={onSignIn}>
          Access Dashboard <ArrowRight size={15} />
        </button>
      </footer>
    </main>
  );
}
