import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { socketService } from '../services/socket';

const ChatApp: React.FC = () => {
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleOnlineUsers = (userIds: string[]) => {
            setOnlineUserIds(new Set(userIds));
        };
        const handleUserOnline = ({ userId }: { userId: string }) => {
            setOnlineUserIds(prev => new Set(prev).add(userId));
        };
        const handleUserOffline = ({ userId }: { userId: string }) => {
            setOnlineUserIds(prev => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        };

        socketService.onOnlineUsers(handleOnlineUsers);
        socketService.onUserOnline(handleUserOnline);
        socketService.onUserOffline(handleUserOffline);

        return () => {
            socketService.offPresenceEvents(handleOnlineUsers, handleUserOnline, handleUserOffline);
        };
    }, []);

    const handleShowUsers = () => {
        // On mobile: go back to sidebar and switch to Users tab
        setActiveChatId(null);
    };

    return (
        <div className="app-container">
            <Sidebar
                onSelectChat={setActiveChatId}
                activeChatId={activeChatId}
                isMobileHidden={activeChatId !== null}
                onlineUserIds={onlineUserIds}
            />
            <ChatWindow
                chatId={activeChatId || ''}
                onBack={() => setActiveChatId(null)}
                onShowUsers={handleShowUsers}
                onlineUserIds={onlineUserIds}
            />
        </div>
    );
};

export default ChatApp;
