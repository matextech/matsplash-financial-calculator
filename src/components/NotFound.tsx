import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import HomeIcon from '@mui/icons-material/Home';

export default function NotFound() {
  const navigate = useNavigate();
  const secretPath = import.meta.env?.VITE_LOGIN_SECRET_PATH || 'matsplash-fin-2jg1wCHqcMOEhlBr';

  // Debug: Log when NotFound is rendered
  useEffect(() => {
    console.log('[NotFound] Component rendered');
    console.log('[NotFound] Current pathname:', window.location.pathname);
  }, []);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" component="h1" gutterBottom sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'text.secondary' }}>
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          The page you are looking for does not exist or you don't have permission to access it.
        </Typography>
        <Button
          variant="contained"
          startIcon={<HomeIcon />}
          onClick={() => navigate(`/login/${secretPath}`)}
          size="large"
        >
          Go to Login
        </Button>
      </Box>
    </Container>
  );
}

