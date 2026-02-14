import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';

// Load env vars
dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@tododjs.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@tododjs.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@tododjs.com',
      password: 'admin123', // Will be hashed automatically by the User model
      role: 'admin',
      subscription: {
        plan: 'pro',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      isActive: true,
      emailVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('-----------------------------------');
    console.log('Email: admin@tododjs.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('Subscription: Pro (Active)');
    console.log('-----------------------------------');
    console.log('Use these credentials to login and access the admin panel');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
