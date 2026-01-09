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
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
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
        // Return list without passwords
        const users = await User.find({});
        const userList = users.map(u => ({
            username: u.username,
            name: u.name,
            role: u.role,
            balance: u.balance,
            holdings: u.holdings,
            logs: u.logs,
            equity: u.balance + (u.holdings.BTC || 0) * currentPrice
        }));
        res.json(userList);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin: Update Balance
app.post('/api/admin/update-balance', async (req, res) => {
    const { username, amount } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false });

        user.balance += parseFloat(amount);
        await user.save();
        res.json({ success: true, newBalance: user.balance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// Market Data Loop
async function fetchPrice() {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const price = parseFloat(response.data.price);
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

setInterval(updateMarket, 1000);

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
