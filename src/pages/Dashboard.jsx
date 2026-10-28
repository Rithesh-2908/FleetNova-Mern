import React from 'react';
import {
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  ArrowUpRight,
} from 'lucide-react';

const stats = [
  {
    title: 'Total Vehicles',
    value: '—',
    description: 'Fleet overview',
    icon: Truck,
  },
  {
    title: 'Active Drivers',
    value: '—',
    description: 'Driver availability',
    icon: Users,
  },
  {
    title: 'Active Trips',
    value: '—',
    description: 'Trip operations',
    icon: Route,
  },
  {
    title: 'Maintenance',
    value: '—',
    description: 'Maintenance overview',
    icon: Wrench,
  },
];

const quickActions = [
  {
    title: 'Vehicle Fleet',
    description: 'View and manage registered vehicles.',
    tab: 'vehicles',
    icon: Truck,
  },
  {
    title: 'Trip Logistics',
    description: 'Review trip and dispatch operations.',
    tab: 'trips',
    icon: Route,
  },
  {
    title: 'Fuel Management',
    description: 'Review fuel usage and costs.',
    tab: 'fuel',
    icon: Fuel,
  },
  {
    title: 'Maintenance',
    description: 'Review vehicle maintenance activities.',
    tab: 'maintenance',
    icon: Wrench,
  },
];

export default function Dashboard({ onNavigate }) {
  const navigate = (tab) => {
    if (typeof onNavigate === 'function') {
      onNavigate(tab);
    }
  };

  return (
    <div className="fleet-dashboard">
      <section className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">
            FLEET OPERATIONS
          </p>

          <h1>Welcome to FleetNova</h1>

          <p>
            Monitor your fleet and access your daily
            operations from one place.
          </p>
        </div>
      </section>

      <section className="dashboard-stats">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <article
              className="dashboard-stat-card"
              key={item.title}
            >
              <div className="dashboard-stat-top">
                <span>{item.title}</span>
                <Icon size={22} />
              </div>

              <h2>{item.value}</h2>

              <p>{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <h2>Quick Access</h2>
            <p>Navigate to your fleet operations.</p>
          </div>
        </div>

        <div className="dashboard-actions">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className="dashboard-action-card"
                key={item.tab}
                onClick={() => navigate(item.tab)}
              >
                <span className="dashboard-action-icon">
                  <Icon size={22} />
                </span>

                <span className="dashboard-action-text">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                <ArrowUpRight size={18} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
