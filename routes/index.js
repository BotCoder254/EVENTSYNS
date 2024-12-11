const express = require('express');

const router = express.Router();

const Event = require('../models/Event');

const User = require('../models/User');

const nodemailer = require('nodemailer');

const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const {
    contactConfirmationTemplate,
    newsletterWelcomeTemplate,
    adminNotificationTemplate,
    passwordResetTemplate
} = require('../utils/emailTemplate');



router.get('/', async(req, res) => {

    try {

        // Get current date

        const currentDate = new Date();



        // Fetch popular events (events with most attendees and not ended)

        const popularEvents = await Event.aggregate([

            {

                $match: {

                    status: 'published',

                    date: { $gte: currentDate }

                }

            },

            {

                $addFields: {

                    attendeeCount: { $size: "$attendees" }

                }

            },

            {

                $sort: { attendeeCount: -1, date: 1 }

            },

            {

                $limit: 3

            }

        ]);



        // Populate creator details for popular events

        await Event.populate(popularEvents, { path: 'creator' });



        // Fetch upcoming events (nearest future events)

        const upcomingEvents = await Event.find({

            status: 'published',

            date: { $gte: currentDate }

        })

            .sort({ date: 1 })

            .populate('creator')

            .limit(3);



        // Fetch trending events (recent events with high registration rate)

        const trendingEvents = await Event.aggregate([

            {

                $match: {

                    status: 'published',

                    date: { $gte: currentDate }

                }

            },

            {

                $addFields: {

                    registrationRate: {

                        $divide: [

                            { $size: "$attendees" },

                            {

                                $add: [

                                    {

                                        $divide: [

                                            { $subtract: [new Date(), "$createdAt"] },

                                            1000 * 60 * 60 * 24 // Convert to days

                                        ]

                                    },

                                    1

                                ]

                            }

                        ]

                    }

                }

            },

            {

                $sort: { registrationRate: -1 }

            },

            {

                $limit: 3

            }

        ]);



        // Populate creator details for trending events

        await Event.populate(trendingEvents, { path: 'creator' });



        res.render('index', {

            title: 'Home',

            popularEvents,

            upcomingEvents,

            featuredEvents: trendingEvents,

            isAuthenticated: req.isAuthenticated(),

            moment: require('moment')

        });

    } catch (error) {

        console.error('Home Page Error:', error);

        res.status(500).render('error', {

            title: 'Error',

            message: 'Error loading home page'

        });

    }

});



router.get('/about', (req, res) => {

    res.render('about', { 

        title: 'About Us',

        isAuthenticated: req.isAuthenticated()

    });

});



router.get('/contact', (req, res) => {

    res.render('contact', { 

        title: 'Contact Us',

        isAuthenticated: req.isAuthenticated()

    });

});



router.post('/contact', async (req, res) => {

    const { name, email, subject, message } = req.body;

    

    try {

        const transporter = nodemailer.createTransport({

            host: process.env.SMTP_HOST,

            port: process.env.SMTP_PORT,

            secure: false,

            auth: {

                user: process.env.SMTP_USER,

                pass: process.env.SMTP_PASS

            }

        });



        // Send email to admin

        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: process.env.ADMIN_EMAIL,

            subject: `Contact Form: ${subject}`,

            html: adminNotificationTemplate('New Contact Form Submission', `

                <p><strong>From:</strong> ${name} (${email})</p>

                <p><strong>Subject:</strong> ${subject}</p>

                <p><strong>Message:</strong></p>

                <p>${message}</p>

            `)

        });



        // Send confirmation to user

        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: email,

            subject: 'Thank you for contacting EventSys',

            html: contactConfirmationTemplate(name)

        });



        req.flash('success', 'Your message has been sent successfully! We will get back to you soon.');

        res.redirect('/contact');

    } catch (error) {

        console.error('Contact Form Error:', error);

        req.flash('error', 'There was an error sending your message. Please try again later.');

        res.redirect('/contact');

    }

});



// Newsletter subscription route

router.post('/subscribe', async (req, res) => {

    const { email } = req.body;

    

    try {

        const transporter = nodemailer.createTransport({

            host: process.env.SMTP_HOST,

            port: process.env.SMTP_PORT,

            secure: false,

            auth: {

                user: process.env.SMTP_USER,

                pass: process.env.SMTP_PASS

            }

        });



        // Send welcome email to subscriber

        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: email,

            subject: 'Welcome to EventSys Newsletter!',

            html: newsletterWelcomeTemplate()

        });



        // Notify admin about new subscriber

        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: process.env.ADMIN_EMAIL,

            subject: 'New Newsletter Subscription',

            html: adminNotificationTemplate('New Newsletter Subscriber', `

                <p>A new user has subscribed to the newsletter:</p>

                <p><strong>Email:</strong> ${email}</p>

                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>

            `)

        });



        res.json({ 

            success: true, 

            message: 'Thank you for subscribing to our newsletter!' 

        });

    } catch (error) {

        console.error('Newsletter Subscription Error:', error);

        res.status(500).json({ 

            success: false, 

            message: 'Failed to subscribe. Please try again later.' 

        });

    }

});



// Password Reset Routes

router.post('/auth/forgot-password', async (req, res) => {

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



        // Create transporter

        const transporter = nodemailer.createTransport({

            host: process.env.SMTP_HOST,

            port: process.env.SMTP_PORT,

            secure: false,

            auth: {

                user: process.env.SMTP_USER,

                pass: process.env.SMTP_PASS

            }

        });



        // Send reset email

        const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;

        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: user.email,

            subject: 'Password Reset Request',

            html: passwordResetTemplate(user.name, resetUrl)

        });



        req.flash('success', 'Password reset link has been sent to your email.');

        res.redirect('/auth/forgot-password');

    } catch (error) {

        console.error('Password Reset Error:', error);

        req.flash('error', 'There was an error sending the password reset email.');

        res.redirect('/auth/forgot-password');

    }

});



router.get('/auth/reset-password/:token', async (req, res) => {

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

            token: req.params.token

        });

    } catch (error) {

        console.error('Reset Password Error:', error);

        req.flash('error', 'An error occurred. Please try again.');

        res.redirect('/auth/forgot-password');

    }

});



router.post('/auth/reset-password/:token', async (req, res) => {

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

        const hashedPassword = await bcrypt.hash(password, 10);

        user.password = hashedPassword;

        user.resetPasswordToken = undefined;

        user.resetPasswordExpires = undefined;

        await user.save();



        // Send confirmation email

        const transporter = nodemailer.createTransport({

            host: process.env.SMTP_HOST,

            port: process.env.SMTP_PORT,

            secure: false,

            auth: {

                user: process.env.SMTP_USER,

                pass: process.env.SMTP_PASS

            }

        });



        await transporter.sendMail({

            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,

            to: user.email,

            subject: 'Your password has been changed',

            html: adminNotificationTemplate('Password Changed Successfully', `

                <p>Dear ${user.name},</p>

                <p>This is a confirmation that the password for your account ${user.email} has just been changed.</p>

                <p>If you did not make this change, please contact us immediately.</p>

            `)

        });



        req.flash('success', 'Your password has been updated! Please log in with your new password.');

        res.redirect('/auth/login');

    } catch (error) {

        console.error('Password Update Error:', error);

        req.flash('error', 'An error occurred while updating your password.');

        res.redirect(`/auth/reset-password/${req.params.token}`);

    }

});



module.exports = router;


