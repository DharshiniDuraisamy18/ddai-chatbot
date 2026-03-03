require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbot')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const User    = mongoose.model('User', UserSchema);
const Message = mongoose.model('Message', MessageSchema);

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, password: hashed });
    const token = jwt.sign({ id: user._id, username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'User already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── UPDATED CHAT ROUTE WITH GROQ ────────────────────────────
app.post('/api/chat', auth, async (req, res) => {
  try {
    const { message, sessionId, history = [] } = req.body;
    if (!message || !sessionId)
      return res.status(400).json({ error: 'Message and sessionId required' });

    await Message.create({ userId: req.user.id, sessionId, role: 'user', content: message });

    const groqApiKey = process.env.GROQ_API_KEY;
    let botReply = '';

    if (groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 1024,
            messages: [
              { role: 'system', content: 'You are DDAi, a helpful and friendly AI assistant. Be concise and clear.' },
              ...history.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: message }
            ]
          })
        });

        const data = await response.json();

        if (data.choices && data.choices[0]) {
          botReply = data.choices[0].message.content;
        } else {
          console.error('❌ Groq error:', data);
          botReply = 'Sorry, I could not get a response. Please try again.';
        }
      } catch (aiError) {
        console.error('❌ Groq fetch error:', aiError.message);
        botReply = 'AI service error. Please try again.';
      }
    } else {
      botReply = 'No API key found. Please add GROQ_API_KEY to your .env file.';
    }

    await Message.create({ userId: req.user.id, sessionId, role: 'assistant', content: botReply });
    res.json({ reply: botReply });

  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: 'Chat error' });
  }
});

app.get('/api/chat/history/:sessionId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.id, sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/chat/sessions', auth, async (req, res) => {
  try {
    const sessions = await Message.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$sessionId', lastMessage: { $first: '$content' }, lastTime: { $first: '$timestamp' }, count: { $sum: 1 } } },
      { $sort: { lastTime: -1 } },
      { $limit: 20 }
    ]);
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/chat/session/:sessionId', auth, async (req, res) => {
  try {
    await Message.deleteMany({ userId: req.user.id, sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));