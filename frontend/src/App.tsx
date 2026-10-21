import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import BlackjackTable from './components/BlackjackTable'; 
import Scoreboard from './components/Scoreboard';
import { SocketProvider } from './context/SocketContext';
import { isTokenExpired } from './utils/auth';


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('casino_auth_token');
  const isValid = token !== null && !isTokenExpired(token);

  if (!isValid && token) {
    localStorage.removeItem('casino_auth_token');
    localStorage.removeItem('casino_username');
    localStorage.removeItem('casino_chips');
    return <Navigate to="/login?expired=true" replace />;
  }

  return isValid ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Nueva ruta para la mesa de juego */}
          <Route 
            path="/game" 
            element={
              <ProtectedRoute>
                <BlackjackTable />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ranking" 
            element={
              <ProtectedRoute>
                <Scoreboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;