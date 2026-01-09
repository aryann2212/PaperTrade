import React, { useState } from 'react';
import { useTrading } from '../contexts/TradingContext';
import styles from './Login.module.css';

const Login = () => {
    const { login } = useTrading();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (!success) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.loginBox} glass-panel`}>
                <h2>Paper Trade Login</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                    <button type="submit" className={styles.submitBtn}>Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
