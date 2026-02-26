import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socketService } from '../services/socket';
import { Send, ArrowLeft, Heart, Smile, Lock, Users, Bell, Reply, X, MessageSquare } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

interface ChatWindowProps {
    chatId: string;
    onBack?: () => void;
    onShowUsers?: () => void;
    onlineUserIds: Set<string>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, onBack, onShowUsers, onlineUserIds }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [enteredPassKey, setEnteredPassKey] = useState('');
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any>(null);

    // PIN Modal State
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinMode, setPinMode] = useState<'set' | 'unlock'>('set');
    const [pin, setPin] = useState(['', '', '', '']);
    const pinRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    const typingTimeoutRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatId) {
            setEnteredPassKey('');
            setIsLocked(false);
            setIsOtherUserTyping(false);
            setReplyingTo(null);
            fetchMessages('');
            socketService.joinChat(chatId);

            const handleNewMessage = (message: any) => {
                if (message.chatId !== chatId) return;
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                // If I am the receiver and looking at the chat, mark it as read
                if (message.senderId !== user?.id) {
                    socketService.markAsRead(chatId);
                }
            };

            const handleMessageLiked = (updatedMessage: any) => {
                setMessages((prev) =>
                    prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
                );
            };

            const handleUserTyping = (data: any) => {
                if (data.chatId === chatId) setIsOtherUserTyping(true);
            };

            const handleUserStopTyping = (data: any) => {
                if (data.chatId === chatId) setIsOtherUserTyping(false);
            };

            const handleMessagesRead = (data: any) => {
                if (data.chatId === chatId) {
                    setMessages((prev) =>
                        prev.map((m) => (m.senderId !== data.readerId ? { ...m, isRead: true } : m))
                    );
                }
            };

            socketService.onNewMessage(handleNewMessage);
            socketService.socket?.on('messageLiked', handleMessageLiked);
            socketService.onUserTyping(handleUserTyping);
            socketService.onUserStopTyping(handleUserStopTyping);
            socketService.onMessagesRead(handleMessagesRead);

            fetchChatDetails();
            socketService.markAsRead(chatId);

            return () => {
                socketService.offNewMessage(handleNewMessage);
                socketService.socket?.off('messageLiked', handleMessageLiked);
                socketService.offTypingEvents(handleUserTyping, handleUserStopTyping);
                socketService.offMessagesRead(handleMessagesRead);
            };
        }
    }, [chatId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchMessages = async (passKeyToTry: string = enteredPassKey) => {
        setLoading(true);
        try {
            const url = passKeyToTry
                ? `/chats/${chatId}/messages?passKey=${passKeyToTry}`
                : `/chats/${chatId}/messages`;
            const response = await api.get(url);
            setMessages(response.data);
            setIsLocked(false);
            if (passKeyToTry) setEnteredPassKey(passKeyToTry);
        } catch (error: any) {
            if (error.response?.status === 403) {
                setIsLocked(true);
            }
            console.error('Failed to fetch messages', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatDetails = async () => {
        try {
            const response = await api.get('/chats');
            const currentChat = response.data.find((c: any) => c.id === chatId);
            if (currentChat) {
                setOtherUser(currentChat.otherUser);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!chatId) return;
        socketService.sendTyping(chatId);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketService.sendStopTyping(chatId);
        }, 2000);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId) return;
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            socketService.sendStopTyping(chatId);
        }
        socketService.sendMessage(chatId, newMessage.trim(), replyingTo?.id);
        setNewMessage('');
        setReplyingTo(null);
        setShowEmojiPicker(false);
    };

    const handleEmojiClick = (emojiObject: any) => {
        setNewMessage((prev) => prev + emojiObject.emoji);
    };

    const handleLikeMessage = (messageId: string) => {
        socketService.socket?.emit('likeMessage', { chatId, messageId });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleNotify = async () => {
        if (!chatId || notifying) return;
        setNotifying(true);
        try {
            await api.post(`/chats/${chatId}/notify`, {
                frontUrl: window.location.origin
            });
            alert('Notification email sent to participant!');
        } catch (error) {
            console.error('Failed to send notification', error);
            alert('Failed to send notification email. Make sure SMTP is configured on backend.');
        } finally {
            setNotifying(false);
        }
    };

    const handlePinChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);

        if (value && index < 3) {
            pinRefs[index + 1].current?.focus();
        }
    };

    const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs[index - 1].current?.focus();
        }
    };

    const submitPin = async () => {
        const fullPin = pin.join('');
        if (fullPin.length < 4) return;

        if (pinMode === 'set') {
            try {
                await api.post(`/chats/${chatId}/passkey`, { passKey: fullPin });
                alert(fullPin ? 'PIN set!' : 'PIN removed!');
                setShowPinModal(false);
                fetchChatDetails(); // Refresh to update lock status
            } catch (err) {
                console.error(err);
                alert('Failed to update PIN');
            }
        } else {
            fetchMessages(fullPin);
            setShowPinModal(false);
        }
        setPin(['', '', '', '']);
    };

    const UserAvatar = ({ avatar, name }: { avatar?: string; name: string }) => {
        if (avatar) {
            return <div className="avatar" style={{ fontSize: '1.5rem', background: 'transparent' }}>{avatar}</div>;
        }
        return <div className="avatar">{name?.charAt(0).toUpperCase()}</div>;
    };

    if (!chatId) {
        return (
            <div className="chat-area empty-chat-area">
                <div className="premium-empty-state">
                    <div className="empty-state-icon-wrapper">
                        <MessageSquare size={48} strokeWidth={1.5} />
                        <div className="floating-sparkle s1">✨</div>
                        <div className="floating-sparkle s2">✨</div>
                    </div>
                    <h2 className="empty-state-title">Select a conversation</h2>
                    <p className="empty-state-subtitle">Choose a chat or start a new one to begin messaging</p>
                    <div className="empty-state-decoration"></div>
                </div>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="chat-area">
                <div className="chat-header">
                    {onBack && (
                        <button onClick={onBack} className="icon-btn mobile-back-btn">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <UserAvatar avatar={otherUser?.avatar} name={otherUser?.name || '?'} />
                    <div style={{ flex: 1 }}>
                        <h3 className="chat-header-name">{otherUser?.name || 'Chat'}</h3>
                    </div>
                </div>
                <div className="lock-screen">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <Lock size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', opacity: 0.6 }} />
                        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>Your Chat is Locked</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                            You have set a pass key. Enter your 4-digit PIN to view messages.
                        </p>
                        <button
                            type="button"
                            className="btn-primary"
                            style={{ width: 'auto', padding: '0.6rem 1.2rem', margin: '0 auto' }}
                            onClick={() => { setPinMode('unlock'); setPin(['', '', '', '']); setShowPinModal(true); }}
                        >
                            Unlock with PIN
                        </button>
                    </div>
                </div>
                {showPinModal && (
                    <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
                        <div className="pin-modal glass-panel" onClick={e => e.stopPropagation()}>
                            <Lock size={32} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                            <h3>{pinMode === 'set' ? 'Set 4-Digit PIN' : 'Enter 4-Digit PIN'}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                {pinMode === 'set' ? 'This PIN will be required to view this chat.' : 'Please enter your security PIN.'}
                            </p>

                            <div className="pin-inputs">
                                {pin.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={pinRefs[i]}
                                        type="password"
                                        className="pin-field"
                                        value={digit}
                                        onChange={e => handlePinChange(i, e.target.value)}
                                        onKeyDown={e => handlePinKeyDown(i, e)}
                                        maxLength={1}
                                        inputMode="numeric"
                                    />
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setShowPinModal(false)}>Cancel</button>
                                <button className="btn-primary" onClick={submitPin} disabled={pin.join('').length < 4}>
                                    {pinMode === 'set' ? 'Save PIN' : 'Unlock'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header">
                {onBack && (
                    <button onClick={onBack} className="icon-btn mobile-back-btn">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <UserAvatar avatar={otherUser?.avatar} name={otherUser?.name || '?'} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 className="chat-header-name">{otherUser?.name || 'Chat'}</h3>
                        {otherUser && onlineUserIds.has(otherUser.id) && (
                            <span className="live-status-dot" title="Online" />
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onShowUsers && (
                        <button onClick={onShowUsers} className="icon-btn mobile-users-btn" title="Users">
                            <Users size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setPinMode('set');
                            setPin(['', '', '', '']);
                            setShowPinModal(true);
                        }}
                        className="icon-btn"
                        title="Set PIN"
                    >
                        <Lock size={16} />
                    </button>
                    <button
                        onClick={handleNotify}
                        className="icon-btn"
                        title="Notify Participant via Email"
                        disabled={notifying}
                    >
                        <Bell size={16} className={notifying ? 'animate-pulse' : ''} />
                    </button>
                </div>
            </div>

            <div className="messages-container">
                {loading ? (
                    <div className="empty-state">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">No messages yet. Say hello! 👋</div>
                ) : (
                    messages.map((message) => {
                        const isSentByMe = message.senderId === user?.id || (message.sender && message.sender.id === user?.id);
                        const isLiked = message.likedByIds?.includes(user?.id);

                        return (
                            <div
                                key={message.id || Math.random()}
                                className={`message ${isSentByMe ? 'sent' : 'received'}`}
                                onDoubleClick={() => handleLikeMessage(message.id)}
                            >
                                <div className="message-actions-hover">
                                    <button
                                        className="message-like-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setReplyingTo(message);
                                        }}
                                        title="Reply"
                                    >
                                        <Reply size={14} />
                                    </button>
                                    <button
                                        className={`message-like-btn ${isLiked ? 'liked' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleLikeMessage(message.id);
                                        }}
                                        title={isLiked ? "Unlike" : "Like"}
                                    >
                                        <Heart size={14} fill={isLiked ? "#ef4444" : "none"} />
                                    </button>
                                </div>
                                {message.replyTo && (
                                    <div className={`reply-reference ${isSentByMe ? 'sent' : 'received'}`}>
                                        <span className="reply-sender">{message.replyTo.sender?.name || (message.replyTo.senderId === user?.id ? 'You' : otherUser?.name)}</span>
                                        <p className="reply-text">{message.replyTo.content.startsWith('U2FsdGVkX1') ? 'Encrypted Message' : message.replyTo.content}</p>
                                    </div>
                                )}
                                <div className="message-content">
                                    {message.content.startsWith('U2FsdGVkX1') ? <i>Encrypted Message</i> : message.content}
                                    <div className="message-meta">
                                        <span className="message-time">
                                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {message.likedByIds && message.likedByIds.length > 0 && (
                                            <span className={`like-badge ${isLiked ? 'heart-bounce' : ''}`}>
                                                <Heart size={10} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "var(--text-secondary)"} />
                                                <span style={{ color: isLiked ? "#ef4444" : "inherit" }}>{message.likedByIds.length}</span>
                                            </span>
                                        )}
                                        {isSentByMe && (
                                            <span className={`read-status ${message.isRead ? 'read' : 'unread'}`} title={message.isRead ? `Seen at ${new Date(message.readAt).toLocaleTimeString()}` : 'Sent'}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M7 12l3 3 7-7" />
                                                    {message.isRead && <path d="M12 12l3 3 7-7" />}
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="message-input-area" style={{ position: 'relative' }}>
                {replyingTo && (
                    <div className="reply-banner">
                        <div className="reply-banner-content">
                            <span className="reply-banner-title">
                                Replying to {replyingTo.senderId === user?.id ? 'You' : (replyingTo.sender?.name || otherUser?.name)}
                            </span>
                            <p className="reply-banner-text">
                                {replyingTo.content.startsWith('U2FsdGVkX1') ? 'Encrypted Message' : replyingTo.content}
                            </p>
                        </div>
                        <button type="button" className="icon-btn" onClick={() => setReplyingTo(null)}>
                            <X size={16} />
                        </button>
                    </div>
                )}
                {isOtherUserTyping && (
                    <div className="typing-indicator-bottom">
                        <span className="typing-dots"><span></span><span></span><span></span></span>
                        {otherUser?.name} is typing...
                    </div>
                )}
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '100%', right: '1rem', zIndex: 50, marginBottom: '0.5rem' }}>
                        <EmojiPicker onEmojiClick={handleEmojiClick} theme={'dark' as any} />
                    </div>
                )}
                <form className="message-form" onSubmit={handleSendMessage}>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <Smile size={22} />
                    </button>
                    <input
                        type="text"
                        className="input-field"
                        value={newMessage}
                        onChange={handleInputChange}
                        placeholder="Type a message..."
                    />
                    <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
                        <Send size={16} />
                    </button>
                </form>
            </div>
            {showPinModal && (
                <div className="modal-overlay" onClick={() => setShowPinModal(false)}>
                    <div className="pin-modal glass-panel" onClick={e => e.stopPropagation()}>
                        <Lock size={32} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
                        <h3>{pinMode === 'set' ? 'Set 4-Digit PIN' : 'Enter 4-Digit PIN'}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            {pinMode === 'set' ? 'This PIN will be required to view this chat.' : 'Please enter your security PIN.'}
                        </p>

                        <div className="pin-inputs">
                            {pin.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={pinRefs[i]}
                                    type="password"
                                    className="pin-field"
                                    value={digit}
                                    onChange={e => handlePinChange(i, e.target.value)}
                                    onKeyDown={e => handlePinKeyDown(i, e)}
                                    maxLength={1}
                                    inputMode="numeric"
                                />
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }} onClick={() => setShowPinModal(false)}>Cancel</button>
                            <button className="btn-primary" onClick={submitPin} disabled={pin.join('').length < 4}>
                                {pinMode === 'set' ? 'Save PIN' : 'Unlock'}
                            </button>
                        </div>

                        {pinMode === 'set' && (
                            <button
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', marginTop: '1.5rem', cursor: 'pointer' }}
                                onClick={async () => {
                                    if (confirm('Remove PIN for this chat?')) {
                                        await api.post(`/chats/${chatId}/passkey`, { passKey: null });
                                        setShowPinModal(false);
                                        fetchChatDetails();
                                        fetchMessages(''); // Reload messages
                                    }
                                }}
                            >
                                Remove PIN
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
