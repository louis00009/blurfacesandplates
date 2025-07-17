import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Person,
  Email,
  CalendarToday,
  Diamond,
  Logout,
  Edit,
  Upgrade,
  Timeline,
  Security
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface ProfilePageProps {
  onClose: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onClose }) => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
    onClose();
  };

  const getMembershipColor = (level: string) => {
    switch (level) {
      case 'free': return 'default';
      case 'premium': return 'warning';
      case 'enterprise': return 'success';
      default: return 'default';
    }
  };

  const getMembershipIcon = (level: string) => {
    switch (level) {
      case 'premium': return <Diamond />;
      case 'enterprise': return <Security />;
      default: return null;
    }
  };

  const usagePercentage = (user.usageCount / user.usageLimit) * 100;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        p: 2,
      }}
      onClick={onClose}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          overflowY: 'auto',
          p: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box sx={{ p: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              src={user.avatar}
              sx={{ width: 80, height: 80, bgcolor: 'white', color: 'primary.main' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" gutterBottom>
                {user.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  icon={getMembershipIcon(user.membershipLevel) || undefined}
                  label={user.membershipLevel.toUpperCase()}
                  color={getMembershipColor(user.membershipLevel) as any}
                  size="small"
                />
                <Chip
                  label={user.subscriptionStatus.toUpperCase()}
                  color={user.subscriptionStatus === 'active' ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Edit />}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Personal Information
                  </Typography>
                  
                  {isEditing ? (
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        InputProps={{
                          startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                      <TextField
                        fullWidth
                        label="Email Address"
                        value={editData.email}
                        onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSaveProfile}
                        fullWidth
                      >
                        Save Changes
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Full Name
                        </Typography>
                        <Typography variant="body1">
                          {user.name}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Email Address
                        </Typography>
                        <Typography variant="body1">
                          {user.email}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Member Since
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(user.registrationDate)}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Last Login
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(user.lastLoginDate)}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Membership Details */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Membership Details
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Current Plan
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                          {user.membershipLevel}
                        </Typography>
                        {user.membershipLevel !== 'enterprise' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Upgrade />}
                            onClick={() => console.log('Upgrade clicked')}
                          >
                            Upgrade
                          </Button>
                        )}
                      </Stack>
                    </Box>

                    {user.membershipExpiry && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Expires On
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(user.membershipExpiry)}
                        </Typography>
                      </Box>
                    )}

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={user.subscriptionStatus.toUpperCase()}
                        color={user.subscriptionStatus === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Usage Statistics */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Timeline />
                    <Typography variant="h6">
                      Usage Statistics
                    </Typography>
                  </Stack>
                  
                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Images Processed This Month
                      </Typography>
                      <Typography variant="body2">
                        {user.usageCount} / {user.usageLimit}
                      </Typography>
                    </Stack>
                    
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(usagePercentage, 100)}
                      color={usagePercentage > 90 ? 'error' : usagePercentage > 70 ? 'warning' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {Math.round(100 - usagePercentage)}% remaining this month
                    </Typography>
                  </Box>

                  {usagePercentage > 90 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      You're approaching your monthly limit. Consider upgrading your plan for unlimited processing.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              color="error"
              startIcon={<Logout />}
              onClick={() => setShowLogoutDialog(true)}
            >
              Sign Out
            </Button>
            
            <Button
              variant="outlined"
              onClick={onClose}
            >
              Close
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      >
        <DialogTitle>Sign Out</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out of your account?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogoutDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;