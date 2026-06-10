import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/api';
import { LicenseContext } from '../App';
import LockScreen from './LockScreen';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = authService.getRole();
  const license = useContext(LicenseContext);

  if (!token) return <Navigate to="/login" replace />;

  if (userRole === 'system_admin') {
    return children;
  }

  if (license && license.licenseStatus && !license.licenseStatus.valid) {
    return (
      <LockScreen
        status={license.licenseStatus}
        onUnlock={() => {
          license.refreshLicense();
        }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // redirect users without access
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;