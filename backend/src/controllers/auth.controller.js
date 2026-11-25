const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// UC-02: register + create a default personal workspace.
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const workspace = await Workspace.create({
      name: `${name}'s Workspace`,
      owner: user._id,
      members: [{ user: user._id, role: 'Owner' }],
    });
    const token = signToken(user);
    res.status(201).json({ token, user, workspace });
  } catch (err) {
    next(err);
  }
}

// UC-01: login with email + password, returns a timed JWT.
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

// UC-20: JWTs are stateless — logout means the client drops the token.
function logout(req, res) {
  res.json({ message: 'Logged out' });
}

module.exports = { register, login, me, logout };
