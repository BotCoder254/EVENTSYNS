const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Base styles */
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        
        /* Header */
        .header { background: linear-gradient(to right, #2563eb, #7c3aed); padding: 24px; text-align: center; border-radius: 12px 12px 0 0; }
        .logo { color: #ffffff; font-size: 28px; font-weight: bold; text-decoration: none; }
        
        /* Content */
        .content { background-color: #ffffff; padding: 32px 24px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        
        /* Typography */
        h1 { color: #1f2937; font-size: 24px; font-weight: bold; margin-bottom: 16px; }
        h2 { color: #374151; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
        p { color: #4b5563; font-size: 16px; margin-bottom: 16px; }
        
        /* Buttons */
        .button { display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #2563eb, #7c3aed); 
                 color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 16px; }
        .button:hover { background: linear-gradient(to right, #1d4ed8, #6d28d9); }
        
        /* Lists */
        ul { padding-left: 24px; margin-bottom: 16px; }
        li { color: #4b5563; margin-bottom: 8px; }
        
        /* Footer */
        .footer { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .social-links { margin-bottom: 16px; }
        .social-link { display: inline-block; margin: 0 8px; color: #6b7280; text-decoration: none; }
        .footer-text { color: #9ca3af; font-size: 14px; }
    </style>
</head>
<body style="background-color: #f3f4f6;">
    <div class="container">
        <div class="header">
            <div class="logo">EventSys</div>
        </div>
        <div class="content">
            ${content}
            <div class="footer">
                <div class="social-links">
                    <a href="#" class="social-link">Facebook</a>
                    <a href="#" class="social-link">Twitter</a>
                    <a href="#" class="social-link">Instagram</a>
                    <a href="#" class="social-link">LinkedIn</a>
                </div>
                <p class="footer-text">
                    &copy; ${new Date().getFullYear()} EventSys. All rights reserved.<br>
                    You're receiving this email because you're part of the EventSys community.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
`;

// Email template for contact form confirmation
const contactConfirmationTemplate = (name) => baseTemplate(`
    <h1>Thank You for Contacting Us!</h1>
    <p>Dear ${name},</p>
    <p>We've received your message and appreciate you taking the time to reach out. Our team will review your inquiry and get back to you as soon as possible.</p>
    <p>In the meantime, feel free to:</p>
    <ul>
        <li>Browse our upcoming events</li>
        <li>Check out our FAQ section</li>
        <li>Follow us on social media for updates</li>
    </ul>
    <a href="${process.env.BASE_URL}/events" class="button">Explore Events</a>
`);

// Email template for newsletter subscription
const newsletterWelcomeTemplate = () => baseTemplate(`
    <h1>Welcome to EventSys Newsletter!</h1>
    <p>Thank you for subscribing to our newsletter! You're now part of our community and will receive updates about:</p>
    <ul>
        <li>Upcoming events and festivals</li>
        <li>Exclusive offers and early bird tickets</li>
        <li>Event planning tips and insights</li>
        <li>Community highlights and success stories</li>
    </ul>
    <p>Stay tuned for exciting updates and don't forget to check out our current events!</p>
    <a href="${process.env.BASE_URL}/events" class="button">Browse Events</a>
`);

// Email template for admin notifications
const adminNotificationTemplate = (subject, details) => baseTemplate(`
    <h1>${subject}</h1>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        ${details}
    </div>
    <a href="${process.env.BASE_URL}/admin/dashboard" class="button">View Dashboard</a>
`);

// Email template for event registration
const eventRegistrationTemplate = (eventName, userName, eventDetails) => baseTemplate(`
    <h1>Event Registration Confirmed!</h1>
    <p>Dear ${userName},</p>
    <p>Your registration for <strong>${eventName}</strong> has been confirmed!</p>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h2>Event Details</h2>
        ${eventDetails}
    </div>
    <p>Add this event to your calendar and we'll see you there!</p>
    <a href="${process.env.BASE_URL}/users/dashboard" class="button">View My Events</a>
`);

// Email template for payment confirmation
const paymentConfirmationTemplate = (eventName, amount, transactionId) => baseTemplate(`
    <h1>Payment Confirmed!</h1>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h2>Payment Details</h2>
        <p><strong>Event:</strong> ${eventName}</p>
        <p><strong>Amount:</strong> KES ${amount}</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    <p>Thank you for your payment. Your ticket has been confirmed!</p>
    <a href="${process.env.BASE_URL}/users/tickets" class="button">View My Tickets</a>
`);

// Password reset template
const passwordResetTemplate = (name, resetUrl) => baseTemplate(`
    <h1>Password Reset Request</h1>
    <p>Dear ${name},</p>
    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" 
           class="button" 
           style="font-size: 16px; padding: 16px 32px;">
            Reset Password
        </a>
    </div>
    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        This link will expire in 1 hour for security reasons.<br>
        If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
        <span style="color: #3b82f6;">${resetUrl}</span>
    </p>
    <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 32px;">
        <p style="color: #374151; font-size: 14px; margin: 0;">
            <strong>Security Tip:</strong> Never share your password or reset link with anyone. EventSys will never ask for your password via email.
        </p>
    </div>
`);

module.exports = {
    baseTemplate,
    contactConfirmationTemplate,
    newsletterWelcomeTemplate,
    adminNotificationTemplate,
    eventRegistrationTemplate,
    paymentConfirmationTemplate,
    passwordResetTemplate
};