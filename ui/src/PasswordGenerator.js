import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Slider,
  Button,
  Container,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';

const PasswordGenerator = () => {
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });
  const [length, setLength] = useState(16);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOptionChange = (event) => {
    setOptions({ ...options, [event.target.name]: event.target.checked });
  };

  const handleLengthChange = (event, newValue) => {
    setLength(newValue);
  };

  const generatePassword = async () => {
    const chars = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    };

    const selectedChars = Object.keys(options)
      .filter((key) => options[key])
      .map((key) => chars[key])
      .join('');

    if (selectedChars.length === 0) {
      setError('请至少选择一种字符类型');
      setPassword('');
      return;
    }

    setLoading(true);
    setError(null);
    setPassword('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await axios.get(`/api/v1/generate?length=${length}&type=uint8`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.data.code !== 'Success') {
        throw new Error(response.data.message || '未知错误');
      }

      const randomNumbers = response.data.data;
      let newPassword = '';

      for (let i = 0; i < length; i++) {
        const randomIndex = randomNumbers[i] % selectedChars.length;
        newPassword += selectedChars[randomIndex];
      }

      setPassword(newPassword);
    } catch (error) {
      console.error('Error generating password:', error);
      if (error.name === 'AbortError') {
        setError('请求超时，请重试');
      } else {
        setError(error.message || '生成密码时出错，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          随机密码生成器
        </Typography>

        <Box mb={2}>
          {Object.keys(options).map((option) => (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  checked={options[option]}
                  onChange={handleOptionChange}
                  name={option}
                />
              }
              label={
                option === 'uppercase' ? '大写字母' :
                option === 'lowercase' ? '小写字母' :
                option === 'numbers' ? '数字' : '特殊字符'
              }
            />
          ))}
        </Box>

        <Typography id="length-slider" gutterBottom>
          密码长度: {length}
        </Typography>
        <Slider
          value={length}
          onChange={handleLengthChange}
          aria-labelledby="length-slider"
          valueLabelDisplay="auto"
          step={1}
          marks
          min={8}
          max={32}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={generatePassword}
          disabled={loading}
          fullWidth
          sx={{ 
            mt: 2, 
            height: 48,
            position: 'relative',
          }}
        >
          {loading ? (
            <CircularProgress
              size={24}
              sx={{
                color: 'white',
              }}
            />
          ) : (
            '生成密码'
          )}
        </Button>

        {error && (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        {password && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="h6" sx={{ mr: 1, wordBreak: 'break-all' }}>
              {password}
            </Typography>
            <Tooltip title={copied ? "已复制!" : "复制到剪贴板"} placement="top">
              <IconButton onClick={copyToClipboard} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default PasswordGenerator;