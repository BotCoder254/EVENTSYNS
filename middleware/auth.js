// middleware/auth.js
// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'You must be logged in to view this page');
    res.redirect('/auth/login');
};

// Middleware to check if user is NOT authenticated
const isNotAuthenticated = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/dashboard');
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash('error', 'You do not have permission to view this page');
    res.redirect('back');
};

module.exports = {
    isAuthenticated,
    isNotAuthenticated,
    isAdmin
};
  