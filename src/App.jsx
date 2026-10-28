
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Loading from './components/Loading.jsx';

// Public homepage and authentication pages
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// Dashboard pages
import Dashboard from './pages/Dashboard.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleDetails from './pages/VehicleDetails.jsx';
import Drivers from './pages/Drivers.jsx';
import DriverDetails from './pages/DriverDetails.jsx';
import Trips from './pages/Trips.jsx';
import Fuel from './pages/Fuel.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Expenses from './pages/Expenses.jsx';
import Analytics from './pages/Analytics.jsx';
import Reports from './pages/Reports.jsx';
import Notifications from './pages/Notifications.jsx';
import FleetAI from './pages/FleetAI.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();

  // Public page navigation
  // home | login | register | forgot
  const [authView, setAuthView] = useState('home');

  // Dashboard tab state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState(null);

  // Show the loading screen while authentication is initialized
  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0d14',
        }}
      >
        <Loading message="Initializing FLEETNOVA Telematics Engine..." />
      </div>
    );
  }

  // Public homepage and authentication screens
  if (!isAuthenticated) {
    if (authView === 'home') {
      return (
        <Home
          onSignIn={() => setAuthView('login')}
          onGetStarted={() => setAuthView('register')}
        />
      );
    }

    if (authView === 'register') {
      return (
        <Register
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'forgot') {
      return (
        <ForgotPassword
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <Login
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToForgot={() => setAuthView('forgot')}
      />
    );
  }

  // Dashboard page titles
  const titles = {
    dashboard: 'Operations Dashboard',
    vehicles: 'Vehicles Fleet Registry',
    'vehicle-details': 'Vehicle Telematics & History',
    drivers: 'Commercial Drivers',
    'driver-details': 'Driver Service Record',
    trips: 'Trip Logistics & Dispatch',
    fuel: 'Fuel Consumption & Costs',
    maintenance: 'Preventive Maintenance',
    expenses: 'Operating Expenses',
    analytics: 'Fleet Analytics & Insights',
    reports: 'Audit & Compliance Reports',
    notifications: 'Notifications & Alerts',
    'fleet-ai': 'FleetAI Operations Co-Pilot',
    settings: 'System & Organization Settings',
    profile: 'User Profile Settings',
  };

  // Dashboard navigation
  const navigateTo = (tab) => {
    setCurrentTab(tab);
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Authenticated dashboard
  return (
    <DashboardLayout
      currentTab={currentTab}
      onSelectTab={navigateTo}
      currentTitle={titles[currentTab] || 'FLEETNOVA'}
    >
      {currentTab === 'dashboard' && (
        <Dashboard onNavigate={navigateTo} />
      )}

      {currentTab === 'vehicles' && (
        <Vehicles
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            setCurrentTab('vehicle-details');
          }}
        />
      )}

      {currentTab === 'vehicle-details' && (
        <VehicleDetails
          vehicleId={selectedVehicleId}
          onBack={() => setCurrentTab('vehicles')}
        />
      )}

      {currentTab === 'drivers' && (
        <ProtectedRoute allowedRoles={['admin', 'fleet_manager']}>
          <Drivers
            onSelectDriver={(id) => {
              setSelectedDriverId(id);
              setCurrentTab('driver-details');
            }}
          />
        </ProtectedRoute>
      )}

      {currentTab === 'driver-details' && (
        <ProtectedRoute allowedRoles={['admin', 'fleet_manager']}>
          <DriverDetails
            driverId={selectedDriverId}
            onBack={() => setCurrentTab('drivers')}
          />
        </ProtectedRoute>
      )}

      {currentTab === 'trips' && <Trips />}

      {currentTab === 'fuel' && (
        <ProtectedRoute
          allowedRoles={['admin', 'fleet_manager', 'driver']}
        >
          <Fuel />
        </ProtectedRoute>
      )}

      {currentTab === 'maintenance' && <Maintenance />}

      {currentTab === 'expenses' && (
        <ProtectedRoute allowedRoles={['admin', 'fleet_manager']}>
          <Expenses />
        </ProtectedRoute>
      )}

      {currentTab === 'analytics' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <Analytics />
        </ProtectedRoute>
      )}

      {currentTab === 'reports' && (
        <ProtectedRoute allowedRoles={['admin', 'fleet_manager']}>
          <Reports />
        </ProtectedRoute>
      )}

      {currentTab === 'notifications' && <Notifications />}

      {currentTab === 'fleet-ai' && <FleetAI />}

      {currentTab === 'settings' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <Settings />
        </ProtectedRoute>
      )}

      {currentTab === 'profile' && <Profile />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
