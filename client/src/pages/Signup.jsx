import React, { useState } from 'react';
import { useTrading } from '../contexts/TradingContext';
import styles from './Signup.module.css';
import { Link, useNavigate } from 'react-router-dom';

const Signup = () => {
    const { register } = useTrading();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !username || !password) {
            setError('All fields are required');
            return;
        }

        const success = await register(name, username, password);
        if (success) {
            navigate('/');
        } else {
            setError('Username already taken or registration failed');
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.loginBox} glass-panel`}>
                <h2>Create Account</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Aryan Kotecha"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Choose a password"
                        />
                    </div>
                    {error && <div className={styles.error}>{error}</div>}
                    <button type="submit" className={styles.submitBtn}>Create Account ($1000 Bonus)</button>
                </form>
                <div className={styles.linkText}>
                    Already have an account?
                    <Link to="/login">Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
