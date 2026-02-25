import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UserPlus } from 'lucide-react';

const AVATARS = ['👨‍💻', '👩‍💻', '🚀', '🦊', '🐱', '🐼', '🦄', '⭐', '👩', '👧', '💃', '🧕'];

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState(AVATARS[0]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/register', { name, email, password, avatar });
            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            if (err.response?.data?.message) {
                const msg = err.response.data.message;
                setError(Array.isArray(msg) ? msg[0] : msg);
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container glass-panel">
            <h2 className="auth-title">Create Account</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Join to start chatting with your friends.
            </p>

            {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <div className="input-group">
                <label>Select Avatar</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {AVATARS.map((a) => (
                        <div
                            key={a}
                            onClick={() => setAvatar(a)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                background: avatar === a ? 'var(--accent-gradient)' : 'var(--bg-input)',
                                border: avatar === a ? '2px solid white' : '1px solid var(--border-color)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {a}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group">
                    <label htmlFor="name">Name</label>
                    <input
                        id="name"
                        type="text"
                        className="input-field"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="John Doe"
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        className="input-field"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                    />
                </div>

                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="••••••••"
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {isLoading ? 'Creating account...' : (
                        <>
                            <UserPlus size={20} />
                            Register
                        </>
                    )}
                </button>
            </form>

            <Link to="/login" className="link-text">
                Already have an account? Log in
            </Link>
        </div>
    );
};

export default Register;
