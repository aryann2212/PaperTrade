import React from 'react';
import { useTrading } from '../contexts/TradingContext'; // Import hook
import styles from './Navbar.module.css';

const Navbar = () => {
    const {
        portfolio,
        totalEquity,
        unrealizedPnL,
        pnlPercent,
        user,
        logout
    } = useTrading(); // Use Context

    // Calculate Cash
    const cash = portfolio ? portfolio.balance : 0;

    // Format Helpers
    const formatMoney = (val) => val ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    const pnlColor = unrealizedPnL >= 0 ? styles.profit : styles.loss;
    const pnlSign = unrealizedPnL >= 0 ? '+' : '';

    return (
        <nav className={`${styles.navbar} glass-panel`}>
            <div className={styles.logo}>
                PAPER TRADE <span className={styles.reqBadge}>PRO</span>
            </div>

            <div className={styles.portfolioInfo}>

                {/* BTC Holdings */}
                <div className={styles.balanceItem}>
                    <span className={styles.label}>BTC Holdings</span>
                    <span className={styles.equityValue}>{(portfolio?.holdings?.BTC || 0).toFixed(4)} BTC</span>
                </div>

                {/* P&L */}
                <div className={styles.balanceItem}>
                    <span className={styles.label}>Unrealized P&L</span>
                    <span className={`${styles.pnlValue} ${pnlColor}`}>
                        {pnlSign}${formatMoney(unrealizedPnL)} ({pnlSign}{formatMoney(pnlPercent)}%)
                    </span>
                </div>

                {/* Content: Available Balance (formerly Cash) */}
                <div className={styles.balanceItem}>
                    <span className={styles.label}>Available Balance</span>
                    <span className={styles.cashValue}>${formatMoney(cash)}</span>
                </div>

            </div>

            <div className={styles.actions}>
                <div className={styles.userSection}>
                    <span className={styles.username}>Hello, {user?.name || user?.username}</span>
                    <button className={styles.logoutBtn} onClick={logout}>Logout</button>
                </div>
                <button className={styles.depositBtn}>Deposit</button>
            </div>
        </nav>
    );
};

export default Navbar;
