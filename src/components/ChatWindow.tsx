import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socketService } from '../services/socket';
import { Send, ArrowLeft, Heart, Smile, Lock, Users } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

interface ChatWindowProps {
    chatId: string;
    onBack?: () => void;
    onShowUsers?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, onBack, onShowUsers }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [enteredPassKey, setEnteredPassKey] = useState('');
    const [passKeyInput, setPassKeyInput] = useState('');
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatId) {
            setEnteredPassKey('');
            setIsLocked(false);
            setPassKeyInput('');
            setIsOtherUserTyping(false);
            fetchMessages('');
            socketService.joinChat(chatId);

            const handleNewMessage = (message: any) => {
                if (message.chatId !== chatId) return;
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
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

            socketService.onNewMessage(handleNewMessage);
            socketService.socket?.on('messageLiked', handleMessageLiked);
            socketService.onUserTyping(handleUserTyping);
            socketService.onUserStopTyping(handleUserStopTyping);

            fetchChatDetails();

            return () => {
                socketService.offNewMessage();
                socketService.socket?.off('messageLiked', handleMessageLiked);
                socketService.offTypingEvents();
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
        socketService.sendMessage(chatId, newMessage.trim());
        setNewMessage('');
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

    const UserAvatar = ({ avatar, name }: { avatar?: string; name: string }) => {
        if (avatar) {
            return <div className="avatar" style={{ fontSize: '1.5rem', background: 'transparent' }}>{avatar}</div>;
        }
        return <div className="avatar">{name?.charAt(0).toUpperCase()}</div>;
    };

    if (!chatId) {
        return (
            <div className="chat-area" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', opacity: 0.15 }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <h3 style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Select a conversation</h3>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Choose a chat or start a new one</p>
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
                    <Lock size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', opacity: 0.6 }} />
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>Your Chat is Locked</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        You have set a pass key. Enter it to view messages.
                    </p>
                    <form
                        onSubmit={(e) => { e.preventDefault(); fetchMessages(passKeyInput); }}
                        style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '280px' }}
                    >
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Enter your pass key..."
                            value={passKeyInput}
                            onChange={(e) => setPassKeyInput(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.2rem' }} disabled={loading}>
                            {loading ? '...' : 'Unlock'}
                        </button>
                    </form>
                </div>
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
                    <h3 className="chat-header-name">{otherUser?.name || 'Chat'}</h3>
                    {isOtherUserTyping && (
                        <span className="typing-status">
                            <span className="typing-dots"><span></span><span></span><span></span></span>
                            typing...
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {onShowUsers && (
                        <button onClick={onShowUsers} className="icon-btn mobile-users-btn" title="Users">
                            <Users size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            const newPassKey = prompt('Set your personal pass key (leave blank to remove):');
                            if (newPassKey !== null) {
                                api.post(`/chats/${chatId}/passkey`, { passKey: newPassKey }).then(() => {
                                    alert(newPassKey ? 'Pass key set!' : 'Pass key removed!');
                                }).catch(err => {
                                    console.error(err);
                                    alert('Failed to update pass key');
                                });
                            }
                        }}
                        className="icon-btn"
                        title="Set Pass Key"
                    >
                        <Lock size={16} />
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
                                {message.content.startsWith('U2FsdGVkX1') ? <i>Encrypted Message</i> : message.content}
                                <div className="message-meta">
                                    <span className="message-time">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {message.likedByIds && message.likedByIds.length > 0 && (
                                        <span className="like-badge">
                                            <Heart size={10} fill={isLiked ? "var(--accent-primary)" : "none"} color={isLiked ? "var(--accent-primary)" : "var(--text-secondary)"} />
                                            <span>{message.likedByIds.length}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="message-input-area" style={{ position: 'relative' }}>
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
        </div>
    );
};

export default ChatWindow;
