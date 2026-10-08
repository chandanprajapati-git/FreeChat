import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthField, AuthShell, Icon, PasswordAction } from '../components/AuthUI';
import Button from '@mui/material/Button';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'We couldn’t create your account. Please check your details.');
        return;
      }
      navigate('/', { state: { notice: 'Your account is ready. Sign in to start chatting.' } });
    } catch {
      setError('We couldn’t reach the server. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthShell signup>
    <header className="auth-heading"><p className="auth-kicker">Start connecting</p><h2>Bring your people together.</h2><p>Create your space for the conversations that matter.</p></header>
    <form className="auth-form" onSubmit={handleSignup}>
      <AuthField id="name" label="Your name" icon="user" value={name} onChange={(e) => setName(e.target.value)} placeholder="How should we call you?" autoComplete="name"/>
      <AuthField id="email" label="Email address" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
      <AuthField id="password" label="Create a password" icon="lock" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" action={<PasswordAction visible={showPassword} onClick={() => setShowPassword(!showPassword)}/>}/>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <Button className="auth-submit" variant="contained" type="submit" disabled={loading} endIcon={!loading && <Icon name="arrow" size={18}/>}>{loading ? 'Creating your account…' : 'Create account'}</Button>
    </form>
    <p className="auth-switch">Already on Connect? <Link to="/">Sign in</Link></p>
  </AuthShell>;
}

export default Signup;
