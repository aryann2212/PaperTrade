import React from 'react';
import { Link } from 'react-router-dom';
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

            {user ? (
                <>
                    <div className={styles.portfolioInfo}>
                        <div className={styles.navItem}>
                            <span className={styles.label}>Available Balance</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={styles.cashValue}>${portfolio.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <button
                                    onClick={() => alert("Please ask the Admin to deposit funds.")}
                                    style={{
                                        background: '#4ade80',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Deposit Funds"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className={styles.balanceItem}>
                            <span className={styles.label}>Unrealized P&L</span>
                            <span className={`${styles.pnlValue} ${pnlColor}`}>
                                {pnlSign}${formatMoney(unrealizedPnL)} ({pnlSign}{formatMoney(pnlPercent)}%)
                            </span>
                        </div>

                        <div className={styles.balanceItem}>
                            <span className={styles.label}>BTC Holdings</span>
                            <span className={styles.equityValue}>{(portfolio?.holdings?.BTC || 0).toFixed(4)} BTC</span>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <div className={styles.userSection}>
                            <span className={styles.username}>Hello, {user?.name || user?.username}</span>
                            <button className={styles.logoutBtn} onClick={logout}>Logout</button>
                        </div>
                        <button className={styles.depositBtn}>Deposit</button>
                    </div>
                </>
            ) : (
                <div className={styles.actions} style={{ marginLeft: 'auto' }}>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <button className={styles.logoutBtn} style={{ background: 'transparent', border: '1px solid var(--text-secondary)' }}>Login</button>
                    </Link>
                    <Link to="/signup" style={{ textDecoration: 'none' }}>
                        <button className={styles.depositBtn}>Create Account</button>
                    </Link>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
