const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const useragent = require('useragent');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/honeypot_logs', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Schemas
const logSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  referrer: String,
  uniqueUserId: String,
  interactionType: String,
  details: Object,
  botScore: Number,
  classification: String
});

const traceSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  uniqueUserId: String,
  leakUrls: [String]
});

const Log = mongoose.model('Log', logSchema);
const Trace = mongoose.model('Trace', traceSchema); // ✅ Added for Phase 4 Tracing

// Bot Scoring Logic
function calculateBotScore(interactionType, details) {
  let score = 0;
  if (interactionType === 'decoy_form' && details.formData?.honeypot_field) score += 5;
  if (interactionType === 'hidden_link') score += 3;
  if (interactionType === 'fake_api') score += 2;
  if (interactionType === 'dynamic_trap') score += 4;
  if (interactionType === 'decoy_logout') score += 3;
  if (interactionType === 'hidden_random') score += 2;
  if (interactionType === 'invisible_trap') score += 3;
  return score;
}

// Logger
async function logInteraction(req, interactionType, extraDetails = {}) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  const userAgentStr = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';
  const uniqueUserId =
    extraDetails.uniqueUserId ||
    req.query?.uid ||
    req.body?.uniqueUserId ||
    req.headers['x-unique-user-id'] ||
    '';

  const details = {
    query: (req.query && Object.keys(req.query).length > 0) ? req.query : undefined,
    formData: (req.body && Object.keys(req.body).length > 0) ? req.body : undefined,
    trapId: extraDetails.trapId,
    uniqueUserId: extraDetails.uniqueUserId || uniqueUserId,
    ...extraDetails
  };

  const botScore = calculateBotScore(interactionType, details);
  const classification = botScore >= 3 ? 'bot' : 'human';

  const logEntry = new Log({
    ip,
    userAgent: userAgentStr,
    referrer,
    uniqueUserId,
    interactionType,
    details,
    botScore,
    classification
  });

  try {
    await logEntry.save();
    console.log(`[Logged] ${interactionType} | IP: ${ip} | UID: ${uniqueUserId} | Class: ${classification} | Score: ${botScore}`);
  } catch (err) {
    console.error("Error saving log:", err);
  }
}

// Honeypot Routes
app.get('/api/hidden', async (req, res) => {
  await logInteraction(req, 'hidden_link', { query: req.query });
  res.status(404).send('Not Found');
});

app.post('/api/decoy-login', async (req, res) => {
  if (req.body.honeypot_field) {
    await logInteraction(req, 'decoy_form', { formData: req.body });
    return res.status(403).send('Forbidden');
  }
  res.send('Login successful (not really)');
});

app.post('/api/decoy-logout', async (req, res) => {
  await logInteraction(req, 'decoy_logout', { formData: req.body });
  res.status(403).send('Decoy logout triggered');
});

app.get('/api/fake-endpoint', async (req, res) => {
  await logInteraction(req, 'fake_api', { query: req.query });
  res.status(404).send('Not Found');
});

app.get('/trap/:uid_token', async (req, res) => {
  const [uniqueUserId] = req.params.uid_token.split('_');
  await logInteraction(req, 'dynamic_trap', {
    trapId: req.params.uid_token,
    uniqueUserId,
    query: req.query
  });
  res.status(404).send('Not Found');
});

app.get('/api/hidden-random', async (req, res) => {
  await logInteraction(req, 'hidden_random', { query: req.query });
  res.status(404).send('Hidden random triggered');
});

app.post('/api/invisible-trap', async (req, res) => {
  await logInteraction(req, 'invisible_trap', { formData: req.body });
  res.status(204).send();
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
