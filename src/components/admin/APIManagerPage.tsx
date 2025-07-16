// API Manager Admin Page - 完整的API管理界面
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Switch, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, LinearProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControlLabel, Grid, Alert, IconButton,
  Tooltip, Divider, Stack
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  RestoreFromTrash as ResetIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { apiManager } from '../../utils/apiManager';
import { APIConfig, APIManagerState } from '../../types';

interface APIManagerPageProps {
  onClose: () => void;
}

const APIManagerPage: React.FC<APIManagerPageProps> = ({ onClose }) => {
  const [state, setState] = useState<APIManagerState>(apiManager.getState());
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<APIConfig>>({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importConfig, setImportConfig] = useState('');
  const [stats, setStats] = useState(apiManager.getAPIStats());

  // 刷新数据
  const refreshData = () => {
    setState(apiManager.getState());
    setStats(apiManager.getAPIStats());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'disabled': return 'default';
      case 'quota_exceeded': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '正常';
      case 'disabled': return '已禁用';
      case 'quota_exceeded': return '额度用完';
      case 'error': return '错误';
      default: return status;
    }
  };

  // 开始编辑API
  const startEditing = (api: APIConfig) => {
    setEditingApi(api.id);
    setEditValues({
      apiKey: api.apiKey,
      freeLimit: api.freeLimit,
      priority: api.priority,
      maxErrors: api.maxErrors
    });
  };

  // 保存编辑
  const saveEditing = () => {
    if (editingApi && editValues) {
      if (editValues.apiKey !== undefined) {
        apiManager.updateAPIKey(editingApi, editValues.apiKey);
      }
      if (editValues.freeLimit !== undefined) {
        apiManager.setFreeLimit(editingApi, editValues.freeLimit);
      }
      if (editValues.priority !== undefined) {
        apiManager.setAPIPriority(editingApi, editValues.priority);
      }
      if (editValues.maxErrors !== undefined) {
        apiManager.updateAPI(editingApi, { maxErrors: editValues.maxErrors });
      }
      
      setEditingApi(null);
      setEditValues({});
      refreshData();
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingApi(null);
    setEditValues({});
  };

  // 切换API启用状态
  const toggleAPI = (apiId: string, enabled: boolean) => {
    apiManager.toggleAPI(apiId, enabled);
    refreshData();
  };

  // 重置使用计数
  const resetUsage = (apiId: string) => {
    apiManager.resetUsageCount(apiId);
    refreshData();
  };

  // 导出配置
  const exportConfig = () => {
    const config = apiManager.exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const importConfigFile = () => {
    if (apiManager.importConfig(importConfig)) {
      setShowImportDialog(false);
      setImportConfig('');
      refreshData();
    }
  };

  // 重置配置
  const resetConfig = () => {
    if (window.confirm('确定要重置所有API配置吗？这将清除所有自定义设置。')) {
      apiManager.resetToDefaults();
      refreshData();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 页面标题 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          🤖 API管理中心
        </Typography>
        <Button variant="outlined" onClick={onClose}>
          返回主页
        </Button>
      </Box>

      {/* 统计概览 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                总API数量
              </Typography>
              <Typography variant="h4">
                {stats.totalAPIs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                已启用API
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.enabledAPIs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                正常运行
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.activeAPIs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                总使用量
              </Typography>
              <Typography variant="h4">
                {stats.totalUsage}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                / {stats.totalLimit}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 全局设置 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🔧 全局设置
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={state.autoFallback}
                    onChange={(e) => {
                      apiManager.setAutoFallback(e.target.checked);
                      refreshData();
                    }}
                  />
                }
                label="自动切换API"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={state.fallbackToLocal}
                    onChange={(e) => {
                      apiManager.setFallbackToLocal(e.target.checked);
                      refreshData();
                    }}
                  />
                }
                label="回退到本地检测"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={<RefreshIcon />}
                  onClick={refreshData}
                  size="small"
                >
                  刷新
                </Button>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={exportConfig}
                  size="small"
                >
                  导出
                </Button>
                <Button
                  startIcon={<UploadIcon />}
                  onClick={() => setShowImportDialog(true)}
                  size="small"
                >
                  导入
                </Button>
                <Button
                  startIcon={<ResetIcon />}
                  onClick={resetConfig}
                  size="small"
                  color="warning"
                >
                  重置
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* API列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 API详细管理
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>API名称</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>启用</TableCell>
                  <TableCell>优先级</TableCell>
                  <TableCell>API密钥</TableCell>
                  <TableCell>使用量</TableCell>
                  <TableCell>免费限额</TableCell>
                  <TableCell>错误次数</TableCell>
                  <TableCell>最后使用</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.apis.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {api.name}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={getStatusText(api.status)}
                        color={getStatusColor(api.status) as any}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Switch
                        checked={api.enabled}
                        onChange={(e) => toggleAPI(api.id, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      {editingApi === api.id ? (
                        <TextField
                          type="number"
                          value={editValues.priority || api.priority}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            priority: parseInt(e.target.value)
                          })}
                          size="small"
                          sx={{ width: 80 }}
                        />
                      ) : (
                        api.priority
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingApi === api.id ? (
                        <TextField
                          type="password"
                          value={editValues.apiKey || api.apiKey}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            apiKey: e.target.value
                          })}
                          size="small"
                          sx={{ width: 150 }}
                          placeholder="输入API密钥"
                        />
                      ) : (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {api.apiKey ? `${api.apiKey.substring(0, 8)}...` : '未设置'}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {api.usedCount} / {api.freeLimit}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((api.usedCount / api.freeLimit) * 100, 100)}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {editingApi === api.id ? (
                        <TextField
                          type="number"
                          value={editValues.freeLimit || api.freeLimit}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            freeLimit: parseInt(e.target.value)
                          })}
                          size="small"
                          sx={{ width: 100 }}
                        />
                      ) : (
                        api.freeLimit
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color={api.errorCount > 0 ? 'error' : 'textSecondary'}>
                        {api.errorCount} / {api.maxErrors}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {api.lastUsed ? new Date(api.lastUsed).toLocaleString() : '从未使用'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {editingApi === api.id ? (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={saveEditing}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={cancelEditing}
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            onClick={() => startEditing(api)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                        
                        <Tooltip title="重置使用计数">
                          <IconButton
                            size="small"
                            onClick={() => resetUsage(api.id)}
                            disabled={api.usedCount === 0}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 导入配置对话框 */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>导入API配置</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={importConfig}
            onChange={(e) => setImportConfig(e.target.value)}
            placeholder="粘贴JSON配置文件内容..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>取消</Button>
          <Button onClick={importConfigFile} variant="contained">导入</Button>
        </DialogActions>
      </Dialog>

      {/* 使用说明 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 使用说明：
        </Typography>
        <Typography variant="body2">
          • <strong>优先级</strong>：数字越小优先级越高，系统会按优先级顺序尝试API<br/>
          • <strong>自动切换</strong>：当API失败时自动尝试下一个可用API<br/>
          • <strong>免费限额</strong>：可以手动设置每个API的月度免费调用次数<br/>
          • <strong>错误次数</strong>：连续失败达到上限时会暂时禁用该API<br/>
          • <strong>重置使用计数</strong>：手动重置API的使用次数（通常每月自动重置）
        </Typography>
      </Alert>
    </Box>
  );
};

export default APIManagerPage;