const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Event = require('../models/Event');
const { isAuthenticated } = require('../middleware/auth');

// Multer configuration for profile pictures
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/profiles');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpg, jpeg, png) are allowed!'));
    }
});

// Dashboard route
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Fetch events created by the user
        const eventsCreated = await Event.find({ creator: user._id });
        
        // Fetch events user is attending
        const eventsAttending = await Event.find({
            'attendees.user': user._id
        }).populate('creator');

        // Get upcoming events (events that haven't happened yet)
        const upcomingEvents = eventsAttending.filter(event => {
            return new Date(event.date) > new Date();
        });

        // Calculate total events and upcoming events count
        const totalEventsCreated = eventsCreated.length;
        const totalEventsAttending = eventsAttending.length;
        const upcomingEventsCount = upcomingEvents.length;

        // Get notifications
        const notifications = user.notifications || [];

        res.render('users/dashboard', {
            title: 'Dashboard',
            currentUser: user,
            eventsCreated: eventsCreated,
            eventsAttending: eventsAttending,
            upcomingEvents: upcomingEvents,
            totalEventsCreated,
            totalEventsAttending,
            upcomingEventsCount,
            notifications
        });
    } catch (error) {
        console.error('Dashboard Error:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Profile route
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        // Fetch events created by the user
        const eventsCreated = await Event.find({ creator: user._id });
        
        // Fetch events user is attending
        const eventsAttending = await Event.find({
            'attendees.user': user._id
        }).populate('creator');

        // Get past events
        const pastEvents = eventsAttending.filter(event => {
            return new Date(event.date) < new Date();
        });

        // Get notifications
        const notifications = user.notifications || [];

        res.render('users/profile', {
            title: 'Profile',
            user: user,
            currentUser: user,
            eventsCreated: eventsCreated,
            eventsAttending: eventsAttending,
            pastEvents: pastEvents,
            notifications: notifications
        });
    } catch (error) {
        console.error('Profile Error:', error);
        req.flash('error', 'Error loading profile');
        res.redirect('/dashboard');
    }
});

// Update profile
router.put('/profile', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) {
            updateData.profilePicture = '/uploads/profiles/' + req.file.filename;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        );

        req.flash('success', 'Profile updated successfully!');
        res.redirect('/users/profile');
    } catch (error) {
        console.error('Profile Update Error:', error);
        req.flash('error', 'Error updating profile');
        res.redirect('/users/profile');
    }
});

// View other user's profile
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        // Fetch events created by the user
        const eventsCreated = await Event.find({ creator: user._id });
        
        // Fetch events user is attending
        const eventsAttending = await Event.find({
            'attendees.user': user._id
        }).populate('creator');

        // Get past events
        const pastEvents = eventsAttending.filter(event => {
            return new Date(event.date) < new Date();
        });

        res.render('users/profile', {
            title: `${user.name}'s Profile`,
            user: user,
            currentUser: req.user,
            eventsCreated: eventsCreated,
            eventsAttending: eventsAttending,
            pastEvents: pastEvents,
            notifications: []
        });
    } catch (error) {
        console.error('View Profile Error:', error);
        req.flash('error', 'Error loading user profile');
        res.redirect('/');
    }
});

module.exports = router;


