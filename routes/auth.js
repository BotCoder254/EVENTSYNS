const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { isNotAuthenticated } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { passwordResetTemplate } = require('../utils/emailTemplate');

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('auth/login', {
        title: 'Login',
        currentUser: req.user
    });
});

// Handle login
router.post('/login', isNotAuthenticated, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Basic validation
        if (!username || !password) {
            req.flash('error', 'Please provide both username and password');
            return res.redirect('/auth/login');
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });

        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/auth/login');
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/auth/login');
        }

        // Log in the user
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login Error:', err);
                req.flash('error', 'An error occurred during login');
                return res.redirect('/auth/login');
            }

            // Redirect to dashboard
            res.redirect('/users/dashboard');
        });
    } catch (error) {
        console.error('Login Error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/auth/login');
    }
});

// Register page
router.get('/register', isNotAuthenticated, (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        currentUser: req.user
    });
});

// Handle registration
router.post('/register', isNotAuthenticated, async (req, res) => {
    try {
        const { username, email, password, confirmPassword, name } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/auth/register');
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        });

        if (existingUser) {
            req.flash('error', 'Username or email already exists');
            return res.redirect('/auth/register');
        }

        // Create new user
        const user = new User({
            username,
            email,
            password,
            name: name || username
        });

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        await user.save();

        // Send verification email
        const verificationUrl = `${process.env.BASE_URL}/auth/verify/${verificationToken}`;
        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: user.email,
            subject: 'Verify your email address',
            html: `
                <h1>Welcome to EventSys!</h1>
                <p>Please click the button below to verify your email address:</p>
                <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 16px 0;">Verify Email</a>
                <p>If you did not create an account, please ignore this email.</p>
            `
        });

        req.flash('success', 'Registration successful! Please check your email to verify your account.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration Error:', error);
        req.flash('error', 'An error occurred during registration');
        res.redirect('/auth/register');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout Error:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// Forgot Password page
router.get('/forgot-password', isNotAuthenticated, (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        currentUser: req.user
    });
});

// Handle forgot password request
router.post('/forgot-password', isNotAuthenticated, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', 'No account found with that email address.');
            return res.redirect('/auth/forgot-password');
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        // Save token to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Send reset email
        const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;
        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: user.email,
            subject: 'Password Reset Request',
            html: passwordResetTemplate(user.name || user.username, resetUrl)
        });

        req.flash('success', 'Password reset link has been sent to your email.');
        res.redirect('/auth/forgot-password');
    } catch (error) {
        console.error('Password Reset Error:', error);
        req.flash('error', 'There was an error sending the password reset email.');
        res.redirect('/auth/forgot-password');
    }
});

// Reset password page
router.get('/reset-password/:token', isNotAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            token: req.params.token,
            currentUser: req.user
        });
    } catch (error) {
        console.error('Reset Password Error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/auth/forgot-password');
    }
});

// Handle password reset
router.post('/reset-password/:token', isNotAuthenticated, async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        // Validate password match
        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/auth/reset-password/${req.params.token}`);
        }

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/auth/forgot-password');
        }

        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Send confirmation email
        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: user.email,
            subject: 'Your password has been changed',
            html: `
                <h1>Password Changed Successfully</h1>
                <p>Dear ${user.name || user.username},</p>
                <p>This is a confirmation that the password for your account ${user.email} has just been changed.</p>
                <p>If you did not make this change, please contact us immediately.</p>
            `
        });

        req.flash('success', 'Your password has been updated! Please log in with your new password.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Password Update Error:', error);
        req.flash('error', 'An error occurred while updating your password.');
        res.redirect(`/auth/reset-password/${req.params.token}`);
    }
});

// Email verification
router.get('/verify/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            verificationToken: req.params.token,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Invalid or expired verification token');
            return res.redirect('/auth/login');
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        req.flash('success', 'Email verified successfully! You can now log in.');
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Verification Error:', error);
        req.flash('error', 'An error occurred during verification');
        res.redirect('/auth/login');
    }
});

module.exports = router;