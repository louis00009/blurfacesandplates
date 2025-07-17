import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  Chip
} from '@mui/material';
import { Menu as MenuIcon, AccountCircle, Login, PersonAdd, Upgrade, AdminPanelSettings } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface NavigationBarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onProfileClick: () => void;
  onUpgradeClick: () => void;
  onMenuItemClick: (item: string) => void;
  onAdminClick?: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  onLoginClick,
  onRegisterClick,
  onProfileClick,
  onUpgradeClick,
  onMenuItemClick,
  onAdminClick
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleMenuItemClick = (item: string) => {
    onMenuItemClick(item);
    handleMenuClose();
  };

  return (
    <AppBar position="static" sx={{ mb: 3 }}>
      <Toolbar>
        {/* Menu Button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleMenuOpen}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* App Title */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Image Anonymizer
        </Typography>

        {/* User Authentication Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isAuthenticated && user ? (
            <>
              {/* Upgrade button for free users */}
              {user.membershipLevel === 'free' && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={onUpgradeClick}
                  startIcon={<Upgrade />}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  Upgrade
                </Button>
              )}

              {/* User info and membership */}
              <Chip
                label={user.membershipLevel.toUpperCase()}
                size="small"
                color={user.membershipLevel === 'free' ? 'default' : 'secondary'}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
              />
              
              {/* User Menu */}
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
              >
                {user.avatar ? (
                  <Avatar
                    src={user.avatar}
                    sx={{ width: 32, height: 32 }}
                  />
                ) : (
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </Avatar>
                )}
              </IconButton>
              
              <Menu
                id="user-menu"
                anchorEl={userMenuAnchor}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
              >
                <MenuItem onClick={() => { onProfileClick(); handleUserMenuClose(); }}>
                  Profile
                </MenuItem>
                <MenuItem onClick={() => { handleMenuItemClick('settings'); handleUserMenuClose(); }}>
                  Settings
                </MenuItem>
                {user.email === 'admin@yourapp.com' && onAdminClick && (
                  <MenuItem onClick={() => { onAdminClick(); handleUserMenuClose(); }}>
                    <AdminPanelSettings sx={{ mr: 1 }} />
                    Admin Panel
                  </MenuItem>
                )}
                <MenuItem onClick={() => { logout(); handleUserMenuClose(); }}>
                  Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              {/* Login/Register buttons for non-authenticated users */}
              <Button
                color="inherit"
                onClick={onLoginClick}
                startIcon={<Login />}
                sx={{ mr: 1 }}
              >
                Login
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                onClick={onRegisterClick}
                startIcon={<PersonAdd />}
                sx={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Box>

        {/* Main Navigation Menu */}
        <Menu
          id="main-menu"
          anchorEl={menuAnchor}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleMenuItemClick('home')}>Home</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('gallery')}>Image Gallery</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('settings')}>Settings</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('help')}>Help</MenuItem>
          <MenuItem onClick={() => handleMenuItemClick('about')}>About</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;