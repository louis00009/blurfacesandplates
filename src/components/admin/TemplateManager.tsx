import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Grid,
  Tabs,
  Tab,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Preview,
  FileCopy,
  Send,
  Refresh,
  Code,
  Email,
  Receipt,
  Description
} from '@mui/icons-material';
import { EmailTemplate, DocumentTemplate } from '../../types/admin';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TemplateManager: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | DocumentTemplate>();
  const [formData, setFormData] = useState<Partial<EmailTemplate | DocumentTemplate>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      // Mock data for development - replace with real API call when backend is ready
      const { mockTemplates } = await import('../../utils/mockData');
      
      setEmailTemplates(mockTemplates.email);
      setDocumentTemplates(mockTemplates.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template?: EmailTemplate | DocumentTemplate, type: 'email' | 'document' = 'email') => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({ ...template });
    } else {
      setSelectedTemplate(undefined);
      if (type === 'email') {
        setFormData({
          templateCode: '',
          name: '',
          description: '',
          subjectTemplate: '',
          htmlTemplate: '',
          textTemplate: '',
          availableVariables: [],
          isActive: true,
          isSystemTemplate: false,
          category: 'notification',
          priority: 1,
          version: 1
        });
      } else {
        setFormData({
          templateCode: '',
          name: '',
          description: '',
          htmlTemplate: '',
          cssStyles: '',
          documentType: 'receipt',
          pageSize: 'A4',
          orientation: 'portrait',
          availableVariables: [],
          isActive: true,
          isSystemTemplate: false,
          includeLogo: true,
          includeCompanyDetails: true,
          version: 1
        });
      }
    }
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const isEmailTemplate = 'subjectTemplate' in formData;
      const templateType = isEmailTemplate ? 'email' : 'document';
      
      const url = selectedTemplate 
        ? `/api/admin/templates/${templateType}/${selectedTemplate.id}`
        : `/api/admin/templates/${templateType}`;
      
      const method = selectedTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${selectedTemplate ? 'update' : 'create'} template`);
      }

      setSuccess(`Template ${selectedTemplate ? 'updated' : 'created'} successfully`);
      setEditDialogOpen(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const isEmailTemplate = 'subjectTemplate' in selectedTemplate;
      const templateType = isEmailTemplate ? 'email' : 'document';
      
      const response = await fetch(`/api/admin/templates/${templateType}/${selectedTemplate.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setSuccess('Template deleted successfully');
      setDeleteDialogOpen(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handlePreview = async (template: EmailTemplate | DocumentTemplate) => {
    try {
      const isEmailTemplate = 'subjectTemplate' in template;
      const templateType = isEmailTemplate ? 'email' : 'document';
      
      const response = await fetch(`/api/admin/templates/${templateType}/${template.id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sampleData: template.sampleData || {}
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      const data = await response.json();
      setPreviewHtml(data.html);
      setPreviewDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  };

  const duplicateTemplate = async (template: EmailTemplate | DocumentTemplate) => {
    const isEmailTemplate = 'subjectTemplate' in template;
    const newTemplate = {
      ...template,
      id: undefined,
      templateCode: `${template.templateCode}_copy`,
      name: `${template.name} (Copy)`,
      isSystemTemplate: false
    };
    
    setSelectedTemplate(undefined);
    setFormData(newTemplate);
    setEditDialogOpen(true);
  };

  const sendTestEmail = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/admin/templates/email/${template.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recipient: 'admin@example.com', // You might want to make this configurable
          sampleData: template.sampleData || {}
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      setSuccess('Test email sent successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    }
  };

  const addVariable = () => {
    const variables = Array.isArray(formData.availableVariables) ? formData.availableVariables : [];
    setFormData({
      ...formData,
      availableVariables: [...variables, '']
    });
  };

  const updateVariable = (index: number, value: string) => {
    const variables = Array.isArray(formData.availableVariables) ? [...formData.availableVariables] : [];
    variables[index] = value;
    setFormData({
      ...formData,
      availableVariables: variables
    });
  };

  const removeVariable = (index: number) => {
    const variables = Array.isArray(formData.availableVariables) ? [...formData.availableVariables] : [];
    variables.splice(index, 1);
    setFormData({
      ...formData,
      availableVariables: variables
    });
  };

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading templates...</Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Template Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchTemplates}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleEdit(undefined, selectedTab === 0 ? 'email' : 'document')}
          >
            Add {selectedTab === 0 ? 'Email' : 'Document'} Template
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Template Type Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab icon={<Email />} label="Email Templates" />
          <Tab icon={<Receipt />} label="Document Templates" />
        </Tabs>
      </Box>

      {/* Email Templates */}
      <TabPanel value={selectedTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emailTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Box>
                      <Typography fontWeight="medium">{template.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.templateCode}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={template.category} 
                      size="small"
                      color={template.category === 'receipt' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.isActive ? 'Active' : 'Inactive'}
                      color={template.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {template.isSystemTemplate && (
                      <Chip 
                        label="System" 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>v{template.version}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => handlePreview(template)}>
                          <Preview />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(template)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => duplicateTemplate(template)}>
                          <FileCopy />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send Test Email">
                        <IconButton size="small" onClick={() => sendTestEmail(template)}>
                          <Send />
                        </IconButton>
                      </Tooltip>
                      {!template.isSystemTemplate && (
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Document Templates */}
      <TabPanel value={selectedTab} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Template</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Page Setup</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Box>
                      <Typography fontWeight="medium">{template.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.templateCode}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={template.documentType} 
                      size="small"
                      color={template.documentType === 'receipt' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {template.pageSize} • {template.orientation}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.isActive ? 'Active' : 'Inactive'}
                      color={template.isActive ? 'success' : 'default'}
                      size="small"
                    />
                    {template.isSystemTemplate && (
                      <Chip 
                        label="System" 
                        size="small" 
                        variant="outlined" 
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>v{template.version}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => handlePreview(template)}>
                          <Preview />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(template)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => duplicateTemplate(template)}>
                          <FileCopy />
                        </IconButton>
                      </Tooltip>
                      {!template.isSystemTemplate && (
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Template Code"
                value={formData.templateCode || ''}
                onChange={(e) => setFormData({ ...formData, templateCode: e.target.value })}
                helperText="Unique identifier for the template"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Template Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>

            {/* Email Template Fields */}
            {'subjectTemplate' in formData && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category || 'notification'}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      <MenuItem value="notification">Notification</MenuItem>
                      <MenuItem value="receipt">Receipt</MenuItem>
                      <MenuItem value="marketing">Marketing</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Priority"
                    type="number"
                    value={formData.priority || 1}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Subject Template"
                    value={formData.subjectTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
                    helperText="Use {{variable}} syntax for dynamic content"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={10}
                    label="HTML Template"
                    value={formData.htmlTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
                    helperText="HTML content with {{variable}} placeholders"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Text Template (Optional)"
                    value={formData.textTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, textTemplate: e.target.value })}
                    helperText="Plain text version for email clients that don't support HTML"
                  />
                </Grid>
              </>
            )}

            {/* Document Template Fields */}
            {'documentType' in formData && (
              <>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Document Type</InputLabel>
                    <Select
                      value={formData.documentType || 'receipt'}
                      label="Document Type"
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
                    >
                      <MenuItem value="receipt">Receipt</MenuItem>
                      <MenuItem value="invoice">Invoice</MenuItem>
                      <MenuItem value="certificate">Certificate</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Page Size</InputLabel>
                    <Select
                      value={formData.pageSize || 'A4'}
                      label="Page Size"
                      onChange={(e) => setFormData({ ...formData, pageSize: e.target.value })}
                    >
                      <MenuItem value="A4">A4</MenuItem>
                      <MenuItem value="Letter">Letter</MenuItem>
                      <MenuItem value="Legal">Legal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Orientation</InputLabel>
                    <Select
                      value={formData.orientation || 'portrait'}
                      label="Orientation"
                      onChange={(e) => setFormData({ ...formData, orientation: e.target.value as any })}
                    >
                      <MenuItem value="portrait">Portrait</MenuItem>
                      <MenuItem value="landscape">Landscape</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    label="HTML Template"
                    value={formData.htmlTemplate || ''}
                    onChange={(e) => setFormData({ ...formData, htmlTemplate: e.target.value })}
                    helperText="HTML content with {{variable}} placeholders"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="CSS Styles"
                    value={formData.cssStyles || ''}
                    onChange={(e) => setFormData({ ...formData, cssStyles: e.target.value })}
                    helperText="CSS styles for the document"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.includeLogo || false}
                        onChange={(e) => setFormData({ ...formData, includeLogo: e.target.checked })}
                      />
                    }
                    label="Include Company Logo"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.includeCompanyDetails || false}
                        onChange={(e) => setFormData({ ...formData, includeCompanyDetails: e.target.checked })}
                      />
                    }
                    label="Include Company Details"
                  />
                </Grid>
              </>
            )}

            {/* Available Variables */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Available Variables
              </Typography>
              {Array.isArray(formData.availableVariables) && formData.availableVariables.map((variable, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    value={variable}
                    onChange={(e) => updateVariable(index, e.target.value)}
                    placeholder="Variable name (e.g., customerName, amount)"
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => removeVariable(index)}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addVariable}
              >
                Add Variable
              </Button>
            </Grid>

            {/* Template Settings */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive || false}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isSystemTemplate || false}
                      onChange={(e) => setFormData({ ...formData, isSystemTemplate: e.target.checked })}
                    />
                  }
                  label="System Template"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
          >
            {selectedTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Template Preview</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '1px solid #ccc',
              borderRadius: 1,
              p: 2,
              minHeight: 400,
              backgroundColor: 'white'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{selectedTemplate?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateManager;