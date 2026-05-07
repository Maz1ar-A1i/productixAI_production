import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="flex" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar — fixed width on md+ */}
      <Sidebar />

      {/* Main content — offset by sidebar width on md+ */}
      <div
        className="flex-1 md:ml-60"
        style={{ minHeight: '100vh', overflow: 'auto' }}
      >
        {children}
      </div>
    </div>
  );
};

export default Layout;
