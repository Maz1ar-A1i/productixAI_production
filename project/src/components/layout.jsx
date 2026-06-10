import React from 'react';
import Sidebar from './Sidebar';
import OfflineBanner from './OfflineBanner';

const Layout = ({ children }) => {
  return (
    <div className="flex" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar — fixed width on md+ */}
      <Sidebar />

      {/* Main content — offset by sidebar width on md+ */}
      <div
        className="flex-1 md:ml-60 flex flex-col"
        style={{ minHeight: '100vh', overflow: 'auto' }}
      >
        <OfflineBanner />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
