require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const LEVERAGE = 500;

// Connect to MongoDB
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/papertrade')
    .then(async () => {
        console.log('MongoDB Connected');
        // Seed Admin
        try {
            const adminExists = await User.findOne({ username: 'admin' });
            if (!adminExists) {
                await User.create({
                    username: 'admin',
                    name: 'Administrator',
                    password: 'admin123',
                    role: 'ADMIN',
                    balance: 0,
                    holdings: { 'BTC': 0 }
                });
                console.log('Admin Account Created');
            }
        } catch (err) {
            console.error('Admin Seed Error:', err);
        }
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

// Market State
let currentPrice = 0;
let currentCandle = {
    time: Math.floor(Date.now() / 1000),
    open: 0, high: 0, low: 0, close: 0
};

// API Endpoints for Auth & Admin

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && user.password === password) {
            res.json({ success: true, user: { username: user.username, name: user.name, role: user.role } });
        } else {
            console.warn(`Login failed for ${username}: Invalid password or user not found`);
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('LOGIN ERROR:', err); // Log the specific error
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Create User
app.post('/api/admin/create-user', async (req, res) => {
    const { username, name, password, initialBalance } = req.body;

    try {
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const newUser = await User.create({
            username,
            name: name || username,
            password,
            role: 'USER',
            balance: parseFloat(initialBalance) || 1000,
            holdings: { 'BTC': 0 },
            avgBuyPrice: 0,
            logs: []
        });

        console.log(`Created user: ${username} (${newUser.name})`);
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Get All Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});

        // Calculate YTD Timestamp (Jan 1st of current year)
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();

        const userList = users.map(u => {
            // 1. Calculate Unrealized PnL
            const btcHoldings = u.holdings.BTC || 0;
            const avgPrice = u.avgBuyPrice || 0;
            const costBasis = btcHoldings * avgPrice;
            const marketValue = btcHoldings * currentPrice;
            const rawPnL = marketValue - costBasis;
            const unrealizedPnL = rawPnL * LEVERAGE;

            // 2. Calculate Realized PnL (YTD)
            let realizedPnL = 0;
            if (u.logs && u.logs.length > 0) {
                realizedPnL = u.logs.reduce((acc, log) => {
                    const logTime = new Date(log.timestamp).getTime();
                    // Only sum PnL from this year
                    if (log.pnl && logTime >= startOfYear) {
                        return acc + log.pnl;
                    }
                    return acc;
                }, 0);
            }

            return {
                username: u.username,
                name: u.name,
                role: u.role,
                balance: u.balance,
                holdings: u.holdings,
                logs: u.logs,
                equity: u.balance + (marketValue), // Total Equity (Cash + BTC Value) approx
                unrealizedPnL: unrealizedPnL,
                realizedPnL: realizedPnL
            };
        });
        res.json(userList);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Update Balance
app.post('/api/admin/update-balance', async (req, res) => {
    try {
        const { username, amount, logTransaction } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const oldBalance = user.balance;
        user.balance = parseFloat(amount);

        if (logTransaction) {
            const diff = user.balance - oldBalance;
            const type = diff >= 0 ? 'DEPOSIT' : 'WITHDRAW';

            user.logs.push({
                type: type,
                price: 0, // N/A for cash adjustments
                amountUSD: Math.abs(diff),
                amountBTC: 0,
                balanceAfter: user.balance,
                pnl: 0,
                timestamp: new Date()
            });
        }

        await user.save();
        res.json({ success: true, balance: user.balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

// Admin: Update User Details
app.post('/api/admin/update-user', async (req, res) => {
    try {
        const { username, newName, newPassword } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (newName !== undefined) user.name = newName;

        // In a real app, hash this password!
        if (newPassword && newPassword.trim() !== '') {
            user.password = newPassword;
        }

        await user.save();
        res.json({ success: true, user: { username: user.username, name: user.name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Admin: Delete User
app.post('/api/admin/delete-user', async (req, res) => {
    try {
        const { username } = req.body;
        // Prevent deleting admin
        if (username === 'admin') {
            return res.status(403).json({ error: 'Cannot delete the main admin account' });
        }

        const deleted = await User.findOneAndDelete({ username });
        if (!deleted) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, message: `User ${username} deleted` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});


// Market Data Loop
async function fetchPrice() {
    try {
        // Switch to CoinBase (US-Friendly, Faster than CoinGecko)
        const response = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const price = parseFloat(response.data.data.amount);
        // console.log(`BTC Price Log: $${price}`); // Reduced logging
        currentPrice = price;
        return price;
    } catch (error) {
        console.error('Error fetching price:', error.message);
        return null;
    }
}

async function updateMarket() {
    const price = await fetchPrice();
    if (!price) return;

    const now = Math.floor(Date.now() / 1000);

    if (currentCandle.open === 0) {
        currentCandle.open = price;
        currentCandle.high = price;
        currentCandle.low = price;
        currentCandle.close = price;
        currentCandle.time = now;
    }

    if (price > currentCandle.high) currentCandle.high = price;
    if (price < currentCandle.low) currentCandle.low = price;
    currentCandle.close = price;
    currentCandle.time = now;

    io.emit('price-update', {
        symbol: 'BTC/USD',
        price: price,
        candle: currentCandle
    });
}

// Update market every 2 seconds (CoinBase allows faster polling)
setInterval(updateMarket, 2000);

// Socket Logic
io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    socket.on('join', async (username) => {
        socket.username = username;

        try {
            let user = await User.findOne({ username });

            if (!user) {
                // Creating temp/transient user or blocking? 
                // Since we have auth, we generally expect user to exist.
                // IF admin/login creates them. 
                // We'll return if not found to enforce creation via Auth.
                // EXCEPT for 'admin' - we must ensure admin exists on boot or here?
                // Let's ensure admin exists if DB is empty
                if (username === 'admin') {
                    user = await User.create({
                        username: 'admin',
                        name: 'Administrator',
                        password: 'admin123',
                        role: 'ADMIN',
                        balance: 0,
                        holdings: { 'BTC': 0 }
                    });
                } else {
                    return; // Don't create random users anymore
                }
            }

            socket.emit('market-snapshot', { symbol: 'BTC/USD', price: currentPrice });
            socket.emit('portfolio-update', user);
            socket.emit('leverage-update', LEVERAGE);
        } catch (err) {
            console.error("Join error:", err);
        }
    });

    socket.on('trade', async ({ type, amount, unit = 'USD' }) => {
        const username = socket.username;
        if (!username) return;

        try {
            const user = await User.findOne({ username });
            if (!user) return;

            const price = currentPrice;
            if (!price) return;

            let portfolioUpdated = false;

            if (type === 'BUY') {
                let usdAmount = amount;
                if (unit === 'BTC') usdAmount = amount * price;

                if (user.balance >= usdAmount) {
                    const cryptoAmount = usdAmount / price;

                    const currentHoldings = user.holdings.BTC || 0;
                    const currentAvg = user.avgBuyPrice || 0;
                    const totalCost = (currentHoldings * currentAvg) + usdAmount;
                    const newHoldings = currentHoldings + cryptoAmount;

                    user.avgBuyPrice = newHoldings > 0 ? totalCost / newHoldings : 0;
                    user.balance -= usdAmount;
                    user.holdings.BTC = newHoldings;
                    user.markModified('holdings'); // Vital for Mixed types or nested changes

                    user.logs.unshift({
                        type: 'BUY',
                        price: price,
                        amountUSD: usdAmount,
                        amountBTC: cryptoAmount,
                        balanceAfter: user.balance,
                        timestamp: Date.now()
                    });
                    portfolioUpdated = true;
                }
            } else if (type === 'SELL') {
                let usdFaceValue = amount;
                if (unit === 'BTC') usdFaceValue = amount * price;

                const cryptoToSell = usdFaceValue / price;
                const currentHoldings = user.holdings.BTC || 0;

                if (currentHoldings >= cryptoToSell) {
                    const costBasis = cryptoToSell * user.avgBuyPrice;
                    const realValue = cryptoToSell * price;
                    const rawPnL = realValue - costBasis;
                    const leveragedPnL = rawPnL * LEVERAGE;
                    const payout = costBasis + leveragedPnL;

                    user.balance += payout;
                    user.holdings.BTC = currentHoldings - cryptoToSell;

                    if (user.holdings.BTC <= 0.00000001) {
                        user.avgBuyPrice = 0;
                        user.holdings.BTC = 0;
                    }

                    user.markModified('holdings');

                    user.logs.unshift({
                        type: 'SELL',
                        price: price,
                        amountUSD: usdFaceValue,
                        amountBTC: cryptoToSell,
                        pnl: leveragedPnL,
                        balanceAfter: user.balance,
                        timestamp: Date.now()
                    });
                    portfolioUpdated = true;
                }
            }

            if (portfolioUpdated) {
                await user.save();
                socket.emit('portfolio-update', user);
            }

        } catch (err) {
            console.error("Trade error:", err);
        }
    });

    socket.on('disconnect', () => { });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
