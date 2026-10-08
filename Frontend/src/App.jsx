import './App.css'
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatHome from '../pages/ChatHome';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
  <ThemeProvider theme={theme}>
  <CssBaseline />
  <BrowserRouter>
  <Routes>
    <Route path="/" element={<Login/>}/>
    <Route path="/signup" element={<Signup/>}/>
    <Route path="/chat" element={<ProtectedRoute>
      <ChatHome/>
      </ProtectedRoute>}/>
  </Routes>
  </BrowserRouter>
  </ThemeProvider>
  );
}

export default App
