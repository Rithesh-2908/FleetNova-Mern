import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DataEngine } from '../models/dataEngine.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'fleetnova_super_secure_jwt_secret_key_2026';

const generateToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  status: user.status || 'active',
});

// Local development demo accounts
const DEMO_ACCOUNTS = {
  'admin@fleetnova.com': {
    password: 'admin123',
    name: 'Rithesh',
    role: 'admin',
  },
  'manager@fleetnova.com': {
    password: 'manager123',
    name: 'Reena',
    role: 'fleet_manager',
  },
  'driver@fleetnova.com': {
    password: 'driver123',
    name: 'Rajesh Kumar',
    role: 'driver',
  },
  'rajesh.kumar@fleetnova.com': {
    password: 'driver123',
    name: 'Rajesh Kumar',
    role: 'driver',
  },
};

// @desc Register user
// @route POST /api/auth/register
export const registerUser = async (req, res, next) => {
  try {
    const { name, password, phone = '' } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      !email ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await DataEngine.findOne('users', { email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await DataEngine.create('users', {
      name: name.trim(),
      email,
      password: hashedPassword,
      role: 'driver',
      phone,
      status: 'active',
    });

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        ...publicUser(newUser),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Login user
// @route POST /api/auth/login
export const loginUser = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and password',
      });
    }

    const user = await DataEngine.findOne('users', { email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact Administrator.',
      });
    }

    let passwordHash = user.password;
    const demoAccount = DEMO_ACCOUNTS[email];
    let repairedDemoAccount = false;

    // Correct bcrypt hashes begin with $2a$, $2b$, or $2y$.
    const hasValidBcryptHash =
      typeof passwordHash === 'string' &&
      /^\$2[aby]\$\d{2}\$/.test(passwordHash);

    // Repair only known demo accounts when their documented password
    // is supplied and their stored password hash is invalid.
    if (!hasValidBcryptHash) {
      if (!demoAccount || password !== demoAccount.password) {
        console.error(
          `[AUTH] Missing or invalid password hash for user: ${email}`
        );

        return res.status(500).json({
          success: false,
          message:
            'This account has no valid password hash. Contact the administrator.',
          code: 'PASSWORD_HASH_MISSING',
        });
      }

      passwordHash = await bcrypt.hash(demoAccount.password, 10);

      const updatedUser = await DataEngine.findByIdAndUpdate(
        'users',
        user._id,
        {
          password: passwordHash,
          name: demoAccount.name,
          role: demoAccount.role,
          status: user.status || 'active',
        }
      );

      if (!updatedUser) {
        console.error(
          `[AUTH] Could not save repaired demo account: ${email}`
        );

        return res.status(500).json({
          success: false,
          message:
            'Could not repair the demo account. Check the database update logic.',
          code: 'DEMO_ACCOUNT_REPAIR_FAILED',
        });
      }

      repairedDemoAccount = true;

      console.log(`[AUTH] Repaired demo account: ${email}`);
    }

    // Verify the submitted password against the bcrypt hash.
    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    const responseUser = {
      ...user,
      ...(repairedDemoAccount
        ? {
            name: demoAccount.name,
            role: demoAccount.role,
          }
        : {}),
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        ...publicUser(responseUser),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current user
// @route GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await DataEngine.findById('users', req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile
// @route PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    const updateData = {};

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (password !== undefined && password !== '') {
      if (
        typeof password !== 'string' ||
        password.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters',
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await DataEngine.findByIdAndUpdate(
      'users',
      req.user._id,
      updateData
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: publicUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// @desc Forgot password
// @route POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const user = await DataEngine.findOne('users', { email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Password reset instructions have been sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Admin get all users
// @route GET /api/auth/users
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await DataEngine.find('users');

    const sanitized = users.map((user) => ({
      ...publicUser(user),
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Admin update user status or role
// @route PUT /api/auth/users/:id/status
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status, role } = req.body;
    const updateData = {};

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be active or inactive',
        });
      }

      updateData.status = status;
    }

    if (role !== undefined) {
      if (!['admin', 'fleet_manager', 'driver'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user role',
        });
      }

      updateData.role = role;
    }

    const user = await DataEngine.findByIdAndUpdate(
      'users',
      req.params.id,
      updateData
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};
