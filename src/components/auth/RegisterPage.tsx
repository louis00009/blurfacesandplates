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
  Stack,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { PersonAdd, Email, Lock, Person } from '@mui/icons-material';
import { useAuth, RegisterData } from '../../contexts/AuthContext';
import GoogleLoginButton from './GoogleLoginButton';

interface RegisterPageProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onClose, onSwitchToLogin }) => {
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      return;
    }

    try {
      await register(formData);
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
    console.error('Google registration error:', error);
  };

  const passwordsMatch = formData.password === formData.confirmPassword;
  const isFormValid = formData.name && formData.email && formData.password && 
                     formData.confirmPassword && passwordsMatch && acceptTerms;

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
          maxWidth: 450,
          m: 2,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <PersonAdd sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join us to start anonymizing your images
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
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            InputProps={{
              startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />

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
            helperText="Password must be at least 8 characters"
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            disabled={isLoading}
            error={formData.confirmPassword !== '' && !passwordsMatch}
            helperText={formData.confirmPassword !== '' && !passwordsMatch ? 'Passwords do not match' : ''}
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                name="acceptTerms"
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{' '}
                <Link href="#" onClick={(e) => e.preventDefault()}>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" onClick={(e) => e.preventDefault()}>
                  Privacy Policy
                </Link>
              </Typography>
            }
            sx={{ mb: 2 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || !isFormValid}
            sx={{ mb: 2, py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Create Account'
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

        <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            Already have an account?
          </Typography>
          <Link
            component="button"
            variant="body2"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToLogin();
            }}
            sx={{ textDecoration: 'none', fontWeight: 500 }}
          >
            Sign In
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

export default RegisterPage;