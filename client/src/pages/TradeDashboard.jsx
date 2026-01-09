import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChartComponent } from '../components/ChartComponent';
import { useTrading } from '../contexts/TradingContext';
import styles from './TradeDashboard.module.css';

const TradeDashboard = () => {
    const { currentPrice, lastCandle, portfolio, executeTrade } = useTrading();
    const [amount, setAmount] = useState('100');
    const [unit, setUnit] = useState('USD'); // 'USD' or 'BTC'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Hyper Price Logic
    const refPrice = useRef(null);
    const [hyperPrice, setHyperPrice] = useState(0);

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

    return (
        <div className={styles.dashboard}>
            {/* Main Content */}
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <div>
                        <h2>BTC/USD (500x)</h2>
                        <div className={styles.priceDisplay}>
                            ${hyperPrice ? hyperPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                        </div>
                    </div>

                    <div className={styles.headerActions}>
                        <div className={`${styles.leverageBadge} glass-panel`}>
                            500x LEVERAGE
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
                    <div className={styles.panelHeader}>Place Order</div>

                    <div className={styles.inputGroup}>
                        <div className={styles.unitToggle}>
                            <button
                                className={unit === 'USD' ? styles.activeUnit : ''}
                                onClick={() => setUnit('USD')}>USD</button>
                            <button
                                className={unit === 'BTC' ? styles.activeUnit : ''}
                                onClick={() => setUnit('BTC')}>BTC</button>
                        </div>
                        <input
                            type="number"
                            placeholder={`Amount in ${unit}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button className={`${styles.btn} ${styles.btnBuy}`} onClick={() => handleTrade('BUY')}>Buy</button>
                        <button className={`${styles.btn} ${styles.btnSell}`} onClick={() => handleTrade('SELL')}>Sell</button>
                    </div>

                    <div className={styles.holdingsInfo}>
                        Holdings: {(portfolio.holdings['BTC'] || 0).toFixed(6)} BTC
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
