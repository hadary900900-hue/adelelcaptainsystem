import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BranchPickerModal from './BranchPickerModal';
import UnpaidInvoicesNotification from './UnpaidInvoicesNotification';
import { useAuth } from '../auth/AuthContext';

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, activeBranchId, isLoading } = useAuth();

  const userBranches = user?.branches || [];
  const needsBranchSelection =
    !isLoading &&
    user &&
    (!activeBranchId || !userBranches.some((b: any) => b.id === activeBranchId));

  const toggleSidebar = () => {
    // On mobile: toggle overlay open/close
    // On desktop: collapse/expand
    if (window.innerWidth <= 1024) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="main-content">
        <TopBar toggleSidebar={toggleSidebar} />
        <main className="p-4 flex-grow-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <Toaster position="top-right" />
      <UnpaidInvoicesNotification />
      {needsBranchSelection && <BranchPickerModal />}
    </div>
  );
}
