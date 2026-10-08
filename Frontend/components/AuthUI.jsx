import { Link } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import ForumRounded from '@mui/icons-material/ForumRounded';

export function Icon({ name, size = 20, ...props }) {
  const paths = {
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8 8 0 0 1-3.4-.75L4 20l1.35-4.25A7.4 7.4 0 0 1 5 12a7.5 7.5 0 1 1 15-.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    phone: <><path d="M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    eyeOff: <><path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.1 3.8M6.2 6.3C3.5 8 2 12 2 12s3.5 6 10 6c1 0 1.9-.2 2.7-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.chat}</svg>;
}

export function Brand({ className = '' }) {
  return <Link to="/" className={`brand ${className}`} aria-label="Connect home"><span className="brand-mark"><ForumRounded className="brand-icon-default"/><ForumOutlined className="brand-icon-hover"/></span><span className="brand-name">Connect</span></Link>;
}

export function AuthShell({ children, signup = false }) {
  return <main className={`auth-page${signup ? ' auth-page-signup' : ''}`}>
    <section className="auth-stage" aria-label={signup ? 'Create your Connect account' : 'Sign in to Connect'}>
      <header className="auth-navbar">
        <Brand />
        <nav aria-label="Authentication navigation">
          {signup
            ? <Link to="/">Sign in</Link>
            : <Link to="/signup" className="auth-nav-cta">Create account</Link>}
        </nav>
      </header>
      <section className="auth-panel"><div className="auth-card"><Brand className="mobile-brand"/>{children}</div></section>
    </section>
    <footer className="auth-page-footer">A calmer place for the conversations that matter.</footer>
  </main>;
}

export function AuthField({ id, label, icon, type = 'text', value, onChange, placeholder, autoComplete, action, required = true }) {
  return <div className="auth-field"><label htmlFor={id}>{label}</label><TextField id={id} name={id} type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required={required} fullWidth size="medium" variant="outlined" slotProps={{ input: { startAdornment: <InputAdornment position="start"><span className="auth-input-icon"><Icon name={icon} size={18}/></span></InputAdornment>, endAdornment: action ? <InputAdornment position="end">{action}</InputAdornment> : undefined } }} sx={{ '& .MuiOutlinedInput-root': { minHeight: 54, borderRadius: '12px', backgroundColor: 'rgba(255,255,255,.07)', color: '#f7faf9', fontSize: 13, '& fieldset': { borderColor: 'rgba(255,255,255,.17)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,.32)' }, '&.Mui-focused fieldset': { borderColor: 'rgba(133,202,255,.6)', borderWidth: '1px', boxShadow: '0 0 0 3px rgba(133,202,255,.1)' } }, '& .MuiInputBase-input': { padding: '15px 4px', outline: 'none', color: '#f7faf9' }, '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,.45)', opacity: 1 } }} /> </div>;
}

export function PasswordAction({ visible, onClick }) {
  return <IconButton className="field-action" size="small" type="button" onClick={onClick} aria-label={visible ? 'Hide password' : 'Show password'}><Icon name={visible ? 'eyeOff' : 'eye'} size={18}/></IconButton>;
}
