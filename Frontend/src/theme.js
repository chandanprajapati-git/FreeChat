import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#563070', dark: '#3e2058', light: '#8a62a4' },
    secondary: { main: '#9d7ab5' },
    background: { default: '#eee5fb', paper: '#ffffff' },
    text: { primary: '#302638', secondary: '#82788d' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiIconButton: { defaultProps: { disableRipple: true } },
  },
});

export default theme;
