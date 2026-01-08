import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function DashboardLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">CalScheduler</div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard/event-types" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Event Types
          </NavLink>
          <NavLink to="/dashboard/availability" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Availability
          </NavLink>
          <NavLink to="/dashboard/bookings" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Bookings
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">Dashboard</h1>
        </header>
        <section className="page-container">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
