import React, { useState, useEffect } from 'react';
import { useTrading } from '../contexts/TradingContext';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const { user, adminCreateUser, adminGetUsers, adminUpdateBalance, logout } = useTrading();
    const [users, setUsers] = useState([]);

    // Create User Form
    const [newUsername, setNewUsername] = useState('');
    const [newName, setNewName] = useState(''); // Added Name
    const [newPassword, setNewPassword] = useState('');
    const [initialBalance, setInitialBalance] = useState('1000');

    // Logs Modal
    const [viewingLogsFor, setViewingLogsFor] = useState(null); // username
    const [activeLogs, setActiveLogs] = useState([]);

    const fetchUsers = async () => {
        try {
            const res = await adminGetUsers();
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchUsers();
        const interval = setInterval(fetchUsers, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await adminCreateUser({
                username: newUsername,
                name: newName, // Pass Name
                password: newPassword,
                initialBalance: parseFloat(initialBalance)
            });
            alert(`User ${newUsername} created!`);
            setNewUsername('');
            setNewName('');
            setNewPassword('');
            setInitialBalance('1000');
            fetchUsers();
        } catch (err) {
            alert('Error creating user (might already exist)');
        }
    };

    const handleUpdateBalance = async (username) => {
        const amountStr = prompt(`Enter amount to ADD to ${username}'s balance (use negative to subtract):`);
        if (!amountStr) return;

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
            alert("Invalid amount");
            return;
        }

        try {
            await adminUpdateBalance(username, amount);
            fetchUsers(); // Refresh list to show new balance
        } catch (err) {
            console.error(err);
            alert("Failed to update balance");
        }
    };

    const openLogs = (u) => {
        setViewingLogsFor(u.username);
        setActiveLogs(u.logs || []);
    };

    const closeLogs = () => {
        setViewingLogsFor(null);
        setActiveLogs([]);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Admin Dashboard</h1>
                <div className={styles.userInfo}>
                    <span>Admin: {user?.name || user?.username}</span>
                    <button onClick={logout} className={styles.logoutBtn}>Logout</button>
                </div>
            </header>

            <div className={styles.content}>

                {/* Create User Section */}
                <div className={`${styles.card} glass-panel`}>
                    <h3>Create New User</h3>
                    <form onSubmit={handleCreateUser} className={styles.createForm}>
                        <div className={styles.formRow}>
                            <input
                                placeholder="Username"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                required
                            />
                            <input
                                placeholder="Full Name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.formRow}>
                            <input
                                placeholder="Password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Initial Balance"
                                value={initialBalance}
                                onChange={e => setInitialBalance(e.target.value)}
                            />
                            <button type="submit" className={styles.btnPrimary}>Create User</button>
                        </div>
                    </form>
                </div>

                {/* Users List */}
                <div className={`${styles.card} glass-panel`}>
                    <h3>User Management</h3>
                    <div className={styles.tableReflow}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Cash Balance</th>
                                    <th>BTC Holdings</th>
                                    <th>Est. Equity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.username}>
                                        <td><span className={styles.nameCell}>{u.name}</span></td>
                                        <td>{u.username}</td>
                                        <td><span className={u.role === 'ADMIN' ? styles.tagAdmin : styles.tagUser}>{u.role}</span></td>
                                        <td>${u.balance.toFixed(2)}</td>
                                        <td>{(u.holdings['BTC'] || 0).toFixed(6)}</td>
                                        <td>${u.equity ? u.equity.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}</td>
                                        <td>
                                            {u.role !== 'ADMIN' && (
                                                <div className={styles.actionGroup}>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleUpdateBalance(u.username)}
                                                    >
                                                        Update Bal
                                                    </button>
                                                    <button
                                                        className={styles.actionBtnInfo}
                                                        onClick={() => openLogs(u)}
                                                    >
                                                        Logs
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Logs Modal */}
            {viewingLogsFor && (
                <div className={styles.modalOverlay} onClick={closeLogs}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Trade Logs: {viewingLogsFor}</h3>
                            <button className={styles.closeBtn} onClick={closeLogs}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            {activeLogs.length === 0 ? (
                                <div className={styles.emptyLogs}>No trades found.</div>
                            ) : (
                                <table className={styles.logsTable}>
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Price</th>
                                            <th>Amount (BTC)</th>
                                            <th>PnL</th>
                                            <th>Balance After</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeLogs.map((l, i) => (
                                            <tr key={i}>
                                                <td className={l.type === 'BUY' ? styles.tagBuy : styles.tagSell}>{l.type}</td>
                                                <td>${l.price.toLocaleString()}</td>
                                                <td>{l.amountBTC.toFixed(6)}</td>
                                                <td className={l.pnl >= 0 ? styles.profit : styles.loss}>
                                                    {l.pnl ? `$${l.pnl.toFixed(2)}` : '-'}
                                                </td>
                                                <td>${l.balanceAfter.toLocaleString()}</td>
                                                <td>{new Date(l.timestamp).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminDashboard;
