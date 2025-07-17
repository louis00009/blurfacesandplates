import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Link,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { Lock, Email } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';

interface LoginPageProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onClose, onSwitchToRegister }) => {
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password);
      onClose();
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  const handleGoogleSuccess = async (token: string) => {
    try {
      await loginWithGoogle(token);
      onClose();
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  const handleGoogleError = (error: string) => {
    console.error('Google login error:', error);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
      }}
      onClick={onClose}
    >
      <Paper
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          m: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Lock sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your account to continue
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading}
            sx={{ mb: 2, py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>

        <GoogleLoginButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          loading={isLoading}
        />

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault();
              console.log('Forgot password clicked');
            }}
            sx={{ textDecoration: 'none' }}
          >
            Forgot Password?
          </Link>
          
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToRegister();
            }}
            sx={{ textDecoration: 'none', fontWeight: 500 }}
          >
            Create Account
          </Link>
        </Stack>

        <Button
          fullWidth
          variant="text"
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Cancel
        </Button>
      </Paper>
    </Box>
  );
};

export default LoginPage;