import React from 'react';
import { Button, Box } from '@mui/material';
import { Google } from '@mui/icons-material';

interface GoogleLoginButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  loading?: boolean;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  loading = false
}) => {
  const handleGoogleLogin = async () => {
    try {
      // For demo purposes, simulate Google OAuth flow
      // In a real app, you would use Google OAuth 2.0 flow
      const mockToken = 'mock_google_oauth_token_' + Date.now();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess(mockToken);
    } catch (error) {
      onError('Google login failed. Please try again.');
    }
  };

  return (
    <Button
      variant="outlined"
      fullWidth
      onClick={handleGoogleLogin}
      disabled={loading}
      startIcon={
        <Box
          component="img"
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3LjY0IDkuMjA0NTVDMTcuNjQgOC41NjY4MiAxNy41ODI3IDcuOTUyMjcgMTcuNDc2NCA3LjM2MzY0SDE2LjJWMTAuODQ1SDE0LjE4OTFWNy4zNjM2NEgxMi43MDkxVjEwLjg0NUgxMC42OTgyVjcuMzYzNjRIOS4yVjEzLjVIMTcuNjRWOS4yMDQ1NVoiIGZpbGw9IiM0Mjg1RjQiLz4KPHBhdGggZD0iTTkuMiA3LjM2MzY0SDcuNjMwOTFWMTAuODQ1SDUuNjJWNy4zNjM2NEg0LjE0VjEwLjg0NUgyLjEyOTA5VjcuMzYzNjRIMC42NVYxMy41SDkuMlY3LjM2MzY0WiIgZmlsbD0iI0VBNDMzNSIvPgo8cGF0aCBkPSJNMTcuNjQgNC41SDlWN0gxNy42NFY0LjVaIiBmaWxsPSIjNDI4NUY0Ii8+CjxwYXRoIGQ9Ik05IDRINy4zNjM2NEg5WiIgZmlsbD0iI0VBNDMzNSIvPgo8L3N2Zz4K"
          alt="Google"
          sx={{ width: 18, height: 18 }}
        />
      }
      sx={{
        borderColor: '#dadce0',
        color: '#3c4043',
        '&:hover': {
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.04)',
        },
        textTransform: 'none',
        fontSize: '14px',
        fontWeight: 500,
        py: 1.5,
      }}
    >
      Continue with Google
    </Button>
  );
};

export default GoogleLoginButton;