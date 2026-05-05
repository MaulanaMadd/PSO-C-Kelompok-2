import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import PotDetailPage from './pages/PotDetailPage';
import NotificationPage from './pages/NotificationPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PotlineMapPage from './pages/PotlineMapPage';
import NotificationMonitor from './components/common/NotificationMonitor';
import ProtectedRoute from './components/common/ProtectedRoute';
import { UserProvider } from './context/UserContext';
import { SettingsProvider } from './context/SettingsContext';
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  // Effect to update body class and localStorage when theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <Router>
      <UserProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={<DashboardPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
              <Route
                path="/pot/:id"
                element={<PotDetailPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
              <Route
                path="/notifications"
                element={<NotificationPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
              <Route
                path="/profile"
                element={<ProfilePage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
              <Route
                path="/settings"
                element={<SettingsPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
              <Route
                path="/potline-map"
                element={<PotlineMapPage isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
              />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          {/* <NotificationMonitor /> */}
        </SettingsProvider>
      </UserProvider>
    </Router >
  );
}

export default App;
