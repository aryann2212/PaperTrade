import React, { useState, useEffect } from 'react';
import { useTrading } from '../contexts/TradingContext';
import styles from './AdminDashboard.module.css';
import axios from 'axios'; // Assuming axios is available
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
    const { user, adminCreateUser, adminGetUsers, adminUpdateBalance, logout } = useTrading();
    const [users, setUsers] = useState([]);

    // Create User Form
    const [selectedUserForEdit, setSelectedUserForEdit] = useState(null); // For edit modal
    const [editName, setEditName] = useState('');
    const [editPassword, setEditPassword] = useState('');

    const [selectedUserForBalance, setSelectedUserForBalance] = useState(null); // For balance modal
    const [balanceAmount, setBalanceAmount] = useState('');
    const [shouldLogTransaction, setShouldLogTransaction] = useState(false);

    const [modalType, setModalType] = useState(null); // 'EDIT_USER', 'UPDATE_BALANCE', 'TRADE_LOGS'
    const [selectedLogs, setSelectedLogs] = useState([]);

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
            setInitialBalance('1000');
            fetchUsers();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.response?.data?.error || err.message;
            alert(`Error creating user: ${msg}`);
        }
    };

    const handleOpenEditUser = (user) => {
        setSelectedUserForEdit(user);
        setEditName(user.name || '');
        setEditPassword('');
        setModalType('EDIT_USER');
    };

    const handleSaveUser = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming we added this endpoint to index.js
            await axios.post(`${API_URL}/api/admin/update-user`, {
                username: selectedUserForEdit.username,
                newName: editName,
                newPassword: editPassword
            }, { headers: { Authorization: token } });

            alert('User updated!');
            setModalType(null);
            fetchUsers();
        } catch (err) {
            alert('Error updating user');
        }
    };

    const handleOpenBalance = (user) => {
        setSelectedUserForBalance(user);
        setBalanceAmount(user.balance);
        setShouldLogTransaction(false);
        setModalType('UPDATE_BALANCE');
    };

    const handleUpdateBalance = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/update-balance`, {
                username: selectedUserForBalance.username,
                amount: balanceAmount,
                logTransaction: shouldLogTransaction
            }, { headers: { Authorization: token } });

            alert('Balance updated!');
            setModalType(null);
            fetchUsers();
        } catch (err) {
            alert('Error updating balance');
        }
    };

    const handleViewLogs = (user) => {
        setSelectedLogs(user.logs || []);
        setModalType('TRADE_LOGS');
    };

    const handleDeleteUser = async (username) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE user "${username}"?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/delete-user`, { username }, { headers: { Authorization: token } });
            alert(`User ${username} deleted.`);
            fetchUsers();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to delete user';
            alert(msg);
        }
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedUserForEdit(null);
        setSelectedUserForBalance(null);
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
                                    <th>Balance (Cash)</th>
                                    <th>BTC Holdings</th>
                                    <th>Unrealized P&L</th>
                                    <th>Realized P&L (YTD)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.username}>
                                        <td><span className={styles.nameCell}>{u.name}</span></td>
                                        <td>{u.username}</td>
                                        <td><span className={u.role === 'ADMIN' ? styles.tagAdmin : styles.tagUser}>{u.role}</span></td>
                                        <td>${u.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>{(u.holdings?.BTC || 0).toFixed(6)} BTC</td>
                                        <td style={{ color: u.unrealizedPnL >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                            {u.unrealizedPnL ? `$${u.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
                                        </td>
                                        <td style={{ color: u.realizedPnL >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                            {u.realizedPnL ? `$${u.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
                                        </td>
                                        <td>
                                            {u.role !== 'ADMIN' && (
                                                <div className={styles.actionGroup}>
                                                    <button className={styles.actionBtn} onClick={() => handleOpenBalance(u)}>
                                                        Update Bal
                                                    </button>
                                                    <button className={styles.actionBtn} onClick={() => handleOpenEditUser(u)} style={{ marginLeft: '5px' }}>
                                                        Edit
                                                    </button>
                                                    <button className={styles.actionBtn} onClick={() => handleViewLogs(u)} style={{ marginLeft: '5px' }}>
                                                        View Logs
                                                    </button>
                                                    <button
                                                        className={styles.actionBtn}
                                                        onClick={() => handleDeleteUser(u.username)}
                                                        style={{ marginLeft: '5px', backgroundColor: '#ef4444', border: '1px solid #dc2626' }}
                                                    >
                                                        Delete
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

            {/* Generic Modal Wrapper */}
            {modalType && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.closeBtn} onClick={closeModal}>X</button>

                        {/* EDIT USER FORM */}
                        {modalType === 'EDIT_USER' && (
                            <div>
                                <h3>Edit User: {selectedUserForEdit?.username}</h3>
                                <div className={styles.formGroup}>
                                    <label>Name (Display Name)</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>New Password (leave blank to keep current)</label>
                                    <input
                                        type="password"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        className={styles.input}
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <button className={styles.btn} onClick={handleSaveUser}>Save Changes</button>
                            </div>
                        )}

                        {/* UPDATE BALANCE FORM */}
                        {modalType === 'UPDATE_BALANCE' && (
                            <div>
                                <h3>Update Balance: {selectedUserForBalance?.username}</h3>
                                <div className={styles.formGroup}>
                                    <label>New Balance ($)</label>
                                    <input
                                        type="number"
                                        value={balanceAmount}
                                        onChange={(e) => setBalanceAmount(e.target.value)}
                                        className={styles.input}
                                    />
                                </div>
                                <div className={styles.checkboxGroup} style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={shouldLogTransaction}
                                            onChange={(e) => setShouldLogTransaction(e.target.checked)}
                                            style={{ width: '20px', height: '20px' }}
                                        />
                                        Log this transaction? (Deposit/Withdraw)
                                    </label>
                                </div>
                                <button className={styles.btn} onClick={handleUpdateBalance}>Update Balance</button>
                            </div>
                        )}

                        {/* TRADE LOGS VIEW */}
                        {modalType === 'TRADE_LOGS' && (
                            <div className={styles.logsContainer}>
                                <h3>Trade Logs</h3>
                                {selectedLogs && selectedLogs.length > 0 ? (
                                    <table className={styles.logsTable}>
                                        <thead>
                                            <tr>
                                                <th>Type</th>
                                                <th>Price</th>
                                                <th>Amt (BTC)</th>
                                                <th>PnL</th>
                                                <th>Balance After</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedLogs.slice().reverse().map((log, i) => (
                                                <tr key={i}>
                                                    <td className={log.type === 'BUY' ? styles.tagBuy : styles.tagSell}>{log.type}</td>
                                                    <td>${log.price?.toLocaleString()}</td>
                                                    <td>{log.amountBTC?.toFixed(6)}</td>
                                                    <td style={{ color: log.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                                                        {log.pnl ? `$${log.pnl.toFixed(2)}` : '-'}
                                                    </td>
                                                    <td>${log.balanceAfter?.toLocaleString()}</td>
                                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No trades found.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminDashboard;
