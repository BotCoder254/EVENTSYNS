const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: '/images/default-event.jpg'
    },
    capacity: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        },
        paymentReference: String,
        paymentDate: Date
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled'],
        default: 'published'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for checking if event is full
eventSchema.virtual('isFull').get(function() {
    return this.attendees.length >= this.capacity;
});

// Virtual for remaining spots
eventSchema.virtual('remainingSpots').get(function() {
    return Math.max(0, this.capacity - this.attendees.length);
});

// Virtual for checking if event has ended
eventSchema.virtual('hasEnded').get(function() {
    return new Date(this.date) < new Date();
});

// Pre-save middleware to ensure image path is set
eventSchema.pre('save', function(next) {
    if (!this.image) {
        this.image = '/images/default-event.jpg';
    }
    next();
});

module.exports = mongoose.model('Event', eventSchema);