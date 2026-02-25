import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { socketService } from '../services/socket';
import { MessageSquare, Users, LogOut, Lock } from 'lucide-react';

interface SidebarProps {
    onSelectChat: (chatId: string) => void;
    activeChatId: string | null;
    isMobileHidden?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectChat, activeChatId, isMobileHidden }) => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');
    const [chats, setChats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [openedChats, setOpenedChats] = useState<Set<string>>(new Set());
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    // Presence tracking
    useEffect(() => {
        socketService.onOnlineUsers((userIds) => {
            setOnlineUserIds(new Set(userIds));
        });

        socketService.onUserOnline(({ userId }) => {
            setOnlineUserIds(prev => new Set(prev).add(userId));
        });

        socketService.onUserOffline(({ userId }) => {
            setOnlineUserIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        });

        return () => {
            socketService.offPresenceEvents();
        };
    }, []);

    // Unread count tracking
    useEffect(() => {
        const handleIncomingMessage = (message: any) => {
            setChats(prevChats => prevChats.map(chat =>
                chat.id === message.chatId
                    ? { ...chat, messages: [message] }
                    : chat
            ));

            if (message.chatId !== activeChatId && openedChats.has(message.chatId)) {
                setUnreadCounts(prev => ({
                    ...prev,
                    [message.chatId]: (prev[message.chatId] || 0) + 1
                }));
            }
        };

        socketService.onNewMessage(handleIncomingMessage);
        return () => { };
    }, [activeChatId, openedChats]);

    useEffect(() => {
        if (activeChatId) {
            setUnreadCounts(prev => {
                const next = { ...prev };
                delete next[activeChatId];
                return next;
            });
            setOpenedChats(prev => new Set(prev).add(activeChatId));
        }
    }, [activeChatId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'chats') {
                const response = await api.get('/chats');
                setChats(response.data);
            } else {
                const response = await api.get('/users');
                setUsers(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async (otherUserId: string) => {
        try {
            const response = await api.post('/chats/start', { otherUserId });
            onSelectChat(response.data.chatId);
            setActiveTab('chats');
        } catch (error) {
            console.error('Failed to start chat', error);
        }
    };

    const UserAvatar = ({ avatar, name }: { avatar?: string, name: string }) => {
        if (avatar) {
            return <div className="avatar" style={{ fontSize: '1.5rem', background: 'transparent' }}>{avatar}</div>;
        }
        return <div className="avatar">{name?.charAt(0).toUpperCase()}</div>;
    };

    const StatusDot = ({ isOnline }: { isOnline: boolean }) => (
        <span
            className={`status-dot ${isOnline ? 'online' : 'offline'}`}
            title={isOnline ? 'Online' : 'Offline'}
        />
    );

    return (
        <div className={`sidebar ${isMobileHidden ? 'hidden' : ''}`}>
            <div className="sidebar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <UserAvatar avatar={(user as any)?.avatar} name={user?.name || ''} />
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{user?.name}</h2>
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>● Online</span>
                    </div>
                </div>
                <button onClick={logout} className="icon-btn" title="Logout">
                    <LogOut size={18} />
                </button>
            </div>

            <div className="sidebar-tabs">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                >
                    <MessageSquare size={16} /> Chats
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                >
                    <Users size={16} /> Users
                </button>
            </div>

            <div className="chat-list">
                {loading ? (
                    <div className="empty-state">Loading...</div>
                ) : activeTab === 'chats' ? (
                    chats.length > 0 ? (
                        chats.map((chat) => {
                            const otherUserId = chat.otherUser?.id;
                            const isOnline = otherUserId ? onlineUserIds.has(otherUserId) : false;

                            return (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                                    onClick={() => onSelectChat(chat.id)}
                                >
                                    <div className="avatar-wrapper">
                                        <UserAvatar avatar={chat.otherUser?.avatar} name={chat.otherUser?.name || '?'} />
                                        <StatusDot isOnline={isOnline} />
                                    </div>
                                    <div className="chat-item-content">
                                        <span className="chat-item-name">{chat.otherUser?.name || 'Unknown User'}</span>
                                        <span className="chat-item-status">{isOnline ? 'Online' : 'Offline'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {chat.hasMyPassKey && <Lock size={12} color="var(--accent-secondary)" />}
                                        {unreadCounts[chat.id] > 0 && (
                                            <span className="unread-badge">{unreadCounts[chat.id]}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-state">No chats yet. Switch to Users tab to start one!</div>
                    )
                ) : (
                    users.length > 0 ? (
                        users.map((u) => {
                            const isOnline = onlineUserIds.has(u.id);
                            return (
                                <div key={u.id} className="chat-item" onClick={() => handleStartChat(u.id)}>
                                    <div className="avatar-wrapper">
                                        <UserAvatar avatar={u.avatar} name={u.name || '?'} />
                                        <StatusDot isOnline={isOnline} />
                                    </div>
                                    <div className="chat-item-content">
                                        <span className="chat-item-name">{u.name}</span>
                                        <span className="chat-item-status">{isOnline ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-state">No other users found.</div>
                    )
                )}
            </div>
        </div>
    );
};

export default Sidebar;
