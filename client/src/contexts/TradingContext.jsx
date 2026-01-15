import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const TradingContext = createContext();

export const useTrading = () => useContext(TradingContext);

export const TradingProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [user, setUser] = useState(null); // { username, role }

    // Market Data
    const [currentPrice, setCurrentPrice] = useState(0);
    const [lastCandle, setLastCandle] = useState(null);
    const [portfolio, setPortfolio] = useState({
        balance: 0,
        holdings: { 'BTC': 0 },
        avgBuyPrice: 0,
        logs: []
    });
    const [leverage, setLeverage] = useState(1000);

    // Restore Session or Connect as Guest
    useEffect(() => {
        const storedUser = localStorage.getItem('userSession');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                connectSocket(parsed.username);
            } catch (e) {
                console.error("Failed to parse stored session", e);
                localStorage.removeItem('userSession');
                connectSocket(null); // Guest
            }
        } else {
            connectSocket(null); // Guest
        }
    }, []); // Run only once on mount

    const login = async (username, password) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await axios.post(`${apiBase}/api/login`, { username, password });
            if (res.data.success) {
                const userData = res.data.user;
                setUser(userData);
                localStorage.setItem('userSession', JSON.stringify(userData)); // Persist
                connectSocket(userData.username);
                return true;
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const register = async (name, username, password) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await axios.post(`${apiBase}/api/register`, { name, username, password });
            if (res.data.success) {
                const userData = res.data.user;
                setUser(userData);
                localStorage.setItem('userSession', JSON.stringify(userData)); // Persist
                connectSocket(userData.username);
                return true;
            }
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    const logout = () => {
        if (socket) socket.disconnect();
        setUser(null);
        localStorage.removeItem('userSession'); // Clear
        setPortfolio({ balance: 0, holdings: { 'BTC': 0 }, logs: [] });
        connectSocket(null); // Reconnect as guest immediately
    };

    const connectSocket = (username) => {
        if (socket) socket.disconnect();

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const newSocket = io(apiBase);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            if (username) {
                newSocket.emit('join', username);
            }
            // else: Guest connection, server automatically emits market data
        });

        newSocket.on('price-update', (data) => {
            setCurrentPrice(data.price);
            setLastCandle(data.candle);
        });

        newSocket.on('portfolio-update', (data) => {
            setPortfolio(data);
        });

        newSocket.on('leverage-update', (lev) => setLeverage(lev));
    };

    // Admin Actions
    const adminCreateUser = async (data) => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return axios.post(`${apiBase}/api/admin/create-user`, data);
    };

    const adminGetUsers = async () => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return axios.get(`${apiBase}/api/admin/users`);
    };

    const adminUpdateBalance = async (username, amount) => {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return axios.post(`${apiBase}/api/admin/update-balance`, { username, amount });
    };

    const executeTrade = (type, amount, unit = 'USD') => {
        if (socket && user) {
            socket.emit('trade', { type, amount, unit });
        }
    };

    // PnL Calcs
    const btcHoldings = portfolio.holdings['BTC'] || 0;
    const faceValue = btcHoldings * currentPrice;
    const costBasis = btcHoldings * (portfolio.avgBuyPrice || 0);
    const rawUnrealizedPnL = faceValue - costBasis;
    const leveragedUnrealizedPnL = rawUnrealizedPnL * leverage;
    const totalEquity = portfolio.balance + costBasis + leveragedUnrealizedPnL;
    const pnlPercent = costBasis > 0 ? (leveragedUnrealizedPnL / costBasis) * 100 : 0;

    const value = {
        user,
        login,
        register, // Exported
        logout,
        adminCreateUser,
        adminGetUsers,
        adminUpdateBalance,

        socket,
        currentPrice,
        lastCandle,
        portfolio,
        totalEquity,
        executeTrade,
        unrealizedPnL: leveragedUnrealizedPnL,
        pnlPercent,
        leverage
    };

    return (
        <TradingContext.Provider value={value}>
            {children}
        </TradingContext.Provider>
    );
};
