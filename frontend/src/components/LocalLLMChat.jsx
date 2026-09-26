import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function LocalLLMChat() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]); // { role: 'user' | 'assistant', text }
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setHistory((prev) => [...prev, { role: 'user', text: trimmed }]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/local-llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', text: data.reply ?? data.error ?? 'No response' },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', text: 'Error reaching server.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card
      sx={{
        maxWidth: 480,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: { xs: '100dvh', sm: 600 },
        borderRadius: { xs: 0, sm: 3 },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Local LLM Chat
        </Typography>
      </Box>

      <CardContent
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          py: 2,
        }}
      >
        {history.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
            Ask me anything.
          </Typography>
        )}

        {history.map((msg, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
              color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
              px: 1.5,
              py: 1,
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </Typography>
          </Box>
        ))}

        {loading && (
          <Box sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Thinking...
            </Typography>
          </Box>
        )}

        <div ref={scrollRef} />
      </CardContent>

      <Box
        sx={{
          p: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={5}
            size="small"
            placeholder="Ask the local LLM..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={loading || !message.trim()}
          >
            <SendIcon />
          </IconButton>
        </Stack>
      </Box>
    </Card>
  );
}