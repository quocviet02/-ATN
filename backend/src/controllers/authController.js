const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { User, RefreshToken } = require('../models');
const ioInstance = require('../utils/ioInstance');

const SALT_ROUNDS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signAccessToken(userId) {
  return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  });
}

async function createRefreshToken(userId) {
  const token   = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
  const decoded   = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);
  await RefreshToken.create({ token, userId, expiresAt });
  return token;
}

function toPublic(user) {
  const obj = user.toJSON();
  delete obj.password;
  return obj;
}

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await User.findOne({ email: email?.toLowerCase() })) {
      return err(res, 409, 'Email already in use', 'Conflict');
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user   = await User.create({ name, email, password: hashed });

    const accessToken  = signAccessToken(user.id);
    const refreshToken = await createRefreshToken(user.id);

    res.status(201).json({ user: toPublic(user), accessToken, refreshToken });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
    if (!user) return err(res, 401, 'Invalid email or password', 'Unauthorized');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return err(res, 401, 'Invalid email or password', 'Unauthorized');

    const accessToken  = signAccessToken(user.id);
    const refreshToken = await createRefreshToken(user.id);

    res.json({ user: toPublic(user), accessToken, refreshToken });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Revoke the refresh token from database
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    // Force-disconnect all active socket connections for this user (if JWT was valid)
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token   = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const io      = ioInstance.getIO();
        if (io && decoded?.userId) {
          const sockets = await io.in(`user_${decoded.userId}`).fetchSockets();
          for (const socket of sockets) {
            socket.disconnect(true);
          }
        }
      }
    } catch {
      // Token may be expired — still allow logout
    }

    res.json({ statusCode: 200, message: 'Logged out successfully' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/auth/refresh-token ────────────────────────────────────────────

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return err(res, 400, 'refreshToken is required', 'Bad Request');

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return err(res, 401, 'Invalid or expired refresh token', 'Unauthorized');
    }

    const stored = await RefreshToken.findOne({ token: refreshToken });
    if (!stored || stored.expiresAt < new Date()) {
      return err(res, 401, 'Refresh token not found or expired', 'Unauthorized');
    }

    // Rotate: delete old, issue new pair
    await stored.deleteOne();
    const newAccessToken  = signAccessToken(decoded.userId);
    const newRefreshToken = await createRefreshToken(decoded.userId);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  res.json({ user: toPublic(req.user) });
};

// ─── PUT /api/auth/profile ────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = req.user;

    if (name   !== undefined) user.name   = name.trim();
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({ user: toPublic(user) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/auth/change-password ───────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Re-fetch with password field (authMiddleware excludes it)
    const user = await User.findById(req.user.id).select('+password');
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return err(res, 400, 'Old password is incorrect', 'Bad Request');

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.save();

    // Revoke all sessions for security
    await RefreshToken.deleteMany({ userId: user._id });

    res.json({ statusCode: 200, message: 'Password changed successfully' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
