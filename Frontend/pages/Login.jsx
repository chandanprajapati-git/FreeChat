import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthField, AuthShell, Icon, PasswordAction } from '../components/AuthUI';
import Button from '@mui/material/Button';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('https://freechat-ydqe.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'We couldn’t sign you in. Check your details and try again.');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('profileName', data.user?.name || '');
      navigate('/chat');
    } catch {
      setError('We couldn’t reach the server. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell>
    <header className="auth-heading"><p className="auth-kicker">Welcome back</p><h2>Catch up with your people.</h2><p>Your conversations are right where you left them.</p></header>
    <form className="auth-form" onSubmit={handleLogin}>
      {location.state?.notice && <div className="auth-notice" role="status">{location.state.notice}</div>}
      <AuthField id="email" label="Email address" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
      <AuthField id="password" label="Password" icon="lock" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" action={<PasswordAction visible={showPassword} onClick={() => setShowPassword(!showPassword)}/>}/>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <Button className="auth-submit" variant="contained" type="submit" disabled={loading} endIcon={!loading && <Icon name="arrow" size={18}/>}>{loading ? 'Signing you in…' : 'Sign in'}</Button>
    </form>
    <p className="auth-switch">New to Connect? <Link to="/signup">Create your account</Link></p>
  </AuthShell>;
}

export default Login;
