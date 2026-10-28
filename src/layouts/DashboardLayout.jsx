import React, { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Navbar from '../components/Navbar.jsx';
import FleetAIChat from '../components/FleetAIChat.jsx';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  currentTab,
  onSelectTab,
  currentTitle,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const isMobile = () =>
    typeof window !== 'undefined' && window.innerWidth <= 992;

  const handleToggleSidebar = () => {
    if (isMobile()) {
      setIsMobileOpen((previous) => !previous);
    } else {
      setIsSidebarOpen((previous) => !previous);
    }
  };

  const handleCloseSidebar = () => {
    setIsMobileOpen(false);
    setIsSidebarOpen(false);
  };

  const handleSelectTab = (tab) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    }

    if (isMobile()) {
      setIsMobileOpen(false);
    }

    setIsAIChatOpen(false);
  };

  return (
    <div
      className={`app-container ${
        !isSidebarOpen ? 'sidebar-collapsed' : ''
      }`}
    >
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isSidebarOpen={isSidebarOpen}
        isMobileOpen={isMobileOpen}
        onToggleSidebar={handleToggleSidebar}
        onCloseSidebar={handleCloseSidebar}
      />

      <div className="main-content-wrapper">
        <Navbar
          currentTitle={currentTitle}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onNavigate={handleSelectTab}
          onOpenFleetAI={() => setIsAIChatOpen(true)}
        />

        <main className="page-body">
          {children}
        </main>
      </div>

      {currentTab !== 'fleet-ai' && (
        <button
          type="button"
          className="floating-ai-btn"
          onClick={() =>
            setIsAIChatOpen((previous) => !previous)
          }
          title="Open FleetAI Assistant"
          aria-label="Open FleetAI Assistant"
          aria-expanded={isAIChatOpen}
        >
          <Sparkles size={24} />
        </button>
      )}

      {isAIChatOpen && currentTab !== 'fleet-ai' && (
        <div className="floating-chat-drawer">
          <FleetAIChat
            isDrawer={true}
            onClose={() => setIsAIChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
