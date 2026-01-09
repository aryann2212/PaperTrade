const mongoose = require('mongoose');

const tradeLogSchema = new mongoose.Schema({
    type: { type: String, enum: ['BUY', 'SELL'] },
    price: Number,
    amountUSD: Number,
    amountBTC: Number,
    balanceAfter: Number,
    pnl: Number, // Only for SELL
    timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
    balance: { type: Number, default: 0 },
    holdings: {
        BTC: { type: Number, default: 0 }
    },
    avgBuyPrice: { type: Number, default: 0 },
    logs: [tradeLogSchema]
});

module.exports = mongoose.model('User', userSchema);
