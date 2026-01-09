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
    const [leverage, setLeverage] = useState(500);

    const login = async (username, password) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await axios.post(`${apiBase}/api/login`, { username, password });
            if (res.data.success) {
                setUser(res.data.user);
                connectSocket(res.data.user.username);
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
        setPortfolio({ balance: 0, holdings: { 'BTC': 0 }, logs: [] });
    };

    const connectSocket = (username) => {
        if (socket) socket.disconnect();

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const newSocket = io(apiBase);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join', username);
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
        if (socket) {
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
        logout,
        adminCreateUser,
        adminGetUsers,
        adminUpdateBalance, // Exported

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
