import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChartComponent } from '../components/ChartComponent';
import { useTrading } from '../contexts/TradingContext';
import styles from './TradeDashboard.module.css';

const TradeDashboard = () => {
    const { currentPrice, lastCandle, portfolio, executeTrade } = useTrading();
    const [amount, setAmount] = useState('100');
    const [unit, setUnit] = useState('USD'); // 'USD' or 'BTC'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [activeTab, setActiveTab] = useState('BUY');

    // Hyper Price Logic
    const refPrice = useRef(null);
    const [hyperPrice, setHyperPrice] = useState(0);

    // Auto-Fill Logic when switching tabs or units
    const calculateAutoFill = (tab, currentUnit) => {
        const price = currentPrice || 1; // avoid /0

        if (tab === 'BUY') {
            // Default: 50% of Cash Balance
            const cash = portfolio.balance;
            const targetCash = cash * 0.5;

            if (currentUnit === 'USD') {
                return (Math.floor(targetCash * 100) / 100).toFixed(2);
            } else {
                return (targetCash / price).toFixed(6);
            }
        } else {
            // Default: 100% of BTC Holdings (Sell All)
            const btc = portfolio.holdings['BTC'] || 0;

            if (btc <= 0) return '0';

            if (currentUnit === 'BTC') {
                return btc.toFixed(6);
            } else {
                return (btc * price).toFixed(2);
            }
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (currentPrice) {
            const newVal = calculateAutoFill(tab, unit);
            setAmount(newVal);
        }
    };

    const handleUnitChange = (newUnit) => {
        setUnit(newUnit);
        if (currentPrice) {
            // Recalculate based on current tab logic but new unit
            const newVal = calculateAutoFill(activeTab, newUnit);
            setAmount(newVal);
        }
    };

    useEffect(() => {
        if (!currentPrice) return;

        if (refPrice.current === null) {
            refPrice.current = currentPrice;
        }

        const delta = currentPrice - refPrice.current;
        const magnifiedDelta = delta * 500;
        setHyperPrice(refPrice.current + magnifiedDelta);

    }, [currentPrice]);


    const handleTrade = (type) => {
        let val = parseFloat(amount);
        if (!val || val <= 0) {
            alert("Invalid amount");
            return;
        }

        // Auto-Max Logic
        if (type === 'BUY') {
            let maxPossible = 0;
            if (unit === 'USD') {
                maxPossible = portfolio.balance;
            } else {
                maxPossible = portfolio.balance / currentPrice;
            }

            if (val > maxPossible) {
                if (unit === 'USD') {
                    setAmount(Math.floor(maxPossible * 100) / 100);
                } else {
                    setAmount(Math.floor(maxPossible * 1000000) / 1000000);
                }
                return;
            }

        } else if (type === 'SELL') {
            const btcHoldings = portfolio.holdings['BTC'] || 0;
            let maxPossible = 0;
            if (unit === 'BTC') {
                maxPossible = btcHoldings;
            } else {
                maxPossible = btcHoldings * currentPrice;
            }

            if (val > maxPossible) {
                if (unit === 'USD') {
                    setAmount(Math.floor(maxPossible * 100) / 100);
                } else {
                    setAmount(Math.floor(maxPossible * 1000000) / 1000000);
                }
                return;
            }
        }

        executeTrade(type, val, unit);
    };

    // Calculate Daily Realized PnL
    const dailyRealizedPnL = useMemo(() => {
        if (!portfolio.logs) return 0;
        return portfolio.logs.reduce((acc, log) => {
            return acc + (log.pnl || 0);
        }, 0);
    }, [portfolio.logs]);

    const pnlColor = dailyRealizedPnL >= 0 ? styles.profit : styles.loss;
    const pnlSign = dailyRealizedPnL >= 0 ? '+' : '';

    // Notification State
    const [notification, setNotification] = useState(null); // { message, type }

    const showToast = (msg, type = 'success') => {
        setNotification({ message: msg, type });
        setTimeout(() => setNotification(null), 1000);
    };

    const handleMaxExecute = () => {
        if (!currentPrice) return;

        let maxVal = 0;

        if (activeTab === 'BUY') {
            // Max Cash
            const cash = portfolio.balance;
            if (unit === 'USD') {
                maxVal = Math.floor(cash * 100) / 100;
            } else {
                maxVal = cash / currentPrice;
                maxVal = Math.floor(maxVal * 1000000) / 1000000;
            }
        } else {
            // Max BTC
            const btc = portfolio.holdings['BTC'] || 0;
            if (unit === 'BTC') {
                maxVal = btc;
            } else {
                maxVal = btc * currentPrice;
                maxVal = Math.floor(maxVal * 100) / 100;
            }
        }

        if (maxVal <= 0) {
            alert("Insufficient balance for Max Trade");
            return;
        }

        setAmount(maxVal); // Update UI
        // Execute immediately with calculated value
        executeTrade(activeTab, maxVal, unit);
        showToast(`Max ${activeTab} Placed!`);
    };

    const handleManualTrade = (type) => {
        handleTrade(type);
        showToast("Trade Placed!");
    };

    return (
        <div className={styles.dashboard}>
            {/* Notification Toast */}
            {notification && (
                <div className={`${styles.toast} ${notification.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                    {notification.message}
                </div>
            )}

            {/* Main Content */}
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <div>
                        <h2>BTC/USD (1000x)</h2>
                        <div className={styles.priceDisplay}>
                            ${hyperPrice ? hyperPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                        </div>
                    </div>

                    <div className={styles.headerActions}>
                        <div className={`${styles.leverageBadge} glass-panel`}>
                            1000x LEVERAGE
                        </div>
                        <button
                            className={styles.historyBtn}
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            Trade History
                        </button>
                    </div>
                </header>

                {/* Chart */}
                <div className={`${styles.chartContainer} glass-panel`}>
                    <ChartComponent
                        data={[]}
                        tick={lastCandle}
                        colors={{ backgroundColor: 'transparent', lineColor: '#3b82f6', textColor: '#94a3b8' }}
                    />
                </div>

                <div className={`${styles.orderPanel} glass-panel`}>
                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'BUY' ? styles.tabActiveBuy : ''}`}
                            onClick={() => handleTabChange('BUY')}
                        >
                            Buy (Long)
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'SELL' ? styles.tabActiveSell : ''}`}
                            onClick={() => handleTabChange('SELL')}
                        >
                            Sell (Short)
                        </button>
                    </div>

                    <div className={styles.panelContent}>
                        <div className={styles.inputGroup}>
                            <div className={styles.unitToggle}>
                                <button
                                    className={unit === 'USD' ? styles.activeUnit : ''}
                                    onClick={() => handleUnitChange('USD')}>USD</button>
                                <button
                                    className={unit === 'BTC' ? styles.activeUnit : ''}
                                    onClick={() => handleUnitChange('BTC')}>BTC</button>
                            </div>
                            <input
                                type="number"
                                placeholder={`Amount in ${unit}`}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        {/* Action Buttons Row */}
                        <div className={styles.actions}>
                            <button className={styles.btnMax} onClick={handleMaxExecute}>
                                Max {activeTab}
                            </button>
                            {activeTab === 'BUY' ? (
                                <button className={`${styles.btn} ${styles.btnBuy}`} onClick={() => handleManualTrade('BUY')}>
                                    Buy / Long
                                </button>
                            ) : (
                                <button className={`${styles.btn} ${styles.btnSell}`} onClick={() => handleManualTrade('SELL')}>
                                    Sell / Short
                                </button>
                            )}
                        </div>

                        <div className={styles.holdingsInfo}>
                            {activeTab === 'BUY' ? (
                                <span>Taking a 50% Position (Default)</span>
                            ) : (
                                <span>Closing Entire Position (Default)</span>
                            )}
                            <br />
                            <small>Holdings: {(portfolio.holdings['BTC'] || 0).toFixed(6)} BTC</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            <div className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <h3>Trade History</h3>
                    <button className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>×</button>
                </div>

                {/* Daily Net P&L Header */}
                <div className={styles.pnlHeader}>
                    <span className={styles.pnlLabel}>Net Realized P&L (Today)</span>
                    <span className={`${styles.pnlTotal} ${pnlColor}`}>
                        {pnlSign}${dailyRealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                <div className={styles.logsList}>
                    {portfolio.logs && portfolio.logs.map((log, i) => (
                        <div key={i} className={styles.logItem}>
                            <div className={styles.logHeader}>
                                <span className={log.type === 'BUY' ? styles.tagBuy : styles.tagSell}>{log.type}</span>
                                <span className={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className={styles.logBody}>
                                <div>Price: ${log.price.toLocaleString()}</div>
                                <div>Amt: {log.amountBTC.toFixed(5)} BTC</div>
                                {log.pnl !== undefined && (
                                    <div className={log.pnl >= 0 ? styles.profit : styles.loss}>
                                        PnL: ${log.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                )}
                                <div className={styles.logBalance}>Bal: ${log.balanceAfter.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                    {portfolio.logs?.length === 0 && <div className={styles.emptyLogs}>No trades yet</div>}
                </div>
            </div>

            {isSidebarOpen && <div className={styles.overlay} onClick={() => setIsSidebarOpen(false)} />}
        </div>
    );
};

export default TradeDashboard;
