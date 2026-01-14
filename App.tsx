
import React, { useState, useEffect } from 'react';
import { AppState, User } from './types';
import LoginForm from './components/LoginForm';
import PermissionOverlay from './components/PermissionOverlay';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.LOGIN);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (email: string) => {
    setUser({ email, isLoggedIn: true });
    setCurrentState(AppState.PERMISSION_REQUEST);
  };

  const handlePermissionsComplete = () => {
    setCurrentState(AppState.DASHBOARD);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      {currentState === AppState.LOGIN && (
        <LoginForm onLogin={handleLogin} />
      )}
      
      {currentState === AppState.PERMISSION_REQUEST && (
        <PermissionOverlay onComplete={handlePermissionsComplete} />
      )}

      {currentState === AppState.DASHBOARD && user && (
        <Dashboard user={user} />
      )}
    </div>
  );
};

export default App;
