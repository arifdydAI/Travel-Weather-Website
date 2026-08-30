const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// Admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@traventure.local';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const JWT_SECRET = process.env.JWT_SECRET || 'traventure-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'traventure_admin_token';


const JWT_SECRET_KEY = process.env.JWT_SECRET || 'traventure-dev-secret-change-in-production';

// Helper to hash password
async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Helper to verify password
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

// Generate JWT token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Set auth cookie
function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('traventure_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

// Clear auth cookie
function clearAuthCookie(res) {
  res.clearCookie('traventure_admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Auth middleware - protects admin routes
function authMiddleware(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.admin = decoded;
  next();
}

// Optional auth - doesn't require auth but adds admin info if present
function optionalAuth(req, res, next) {
  const token = req.cookies?.traventure_admin_token;
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.admin = decoded;
    }
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  authMiddleware,
  optionalAuth,
  COOKIE_NAME: 'traventure_admin_token'
};