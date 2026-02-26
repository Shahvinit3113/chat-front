import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

class SocketService {
    public socket: Socket | null = null;

    connect() {
        if (this.socket) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        this.socket = io(SOCKET_URL, {
            auth: { token },
        });

        this.socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        this.socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinChat(chatId: string) {
        this.socket?.emit('joinChat', { chatId });
    }

    sendMessage(chatId: string, content: string, replyToId?: string) {
        this.socket?.emit('sendMessage', { chatId, content, replyToId });
    }


    onNewMessage(callback: (message: any) => void) {
        this.socket?.on('newMessage', callback);
    }

    offNewMessage(callback?: (message: any) => void) {
        if (callback) {
            this.socket?.off('newMessage', callback);
        } else {
            this.socket?.off('newMessage');
        }
    }

    sendTyping(chatId: string) {
        this.socket?.emit('typing', { chatId });
    }

    sendStopTyping(chatId: string) {
        this.socket?.emit('stopTyping', { chatId });
    }

    onUserTyping(callback: (data: any) => void) {
        this.socket?.on('userTyping', callback);
    }

    onUserStopTyping(callback: (data: any) => void) {
        this.socket?.on('userStopTyping', callback);
    }

    offTypingEvents(typingCb?: any, stopTypingCb?: any) {
        if (typingCb) this.socket?.off('userTyping', typingCb);
        else this.socket?.off('userTyping');

        if (stopTypingCb) this.socket?.off('userStopTyping', stopTypingCb);
        else this.socket?.off('userStopTyping');
    }

    markAsRead(chatId: string) {
        this.socket?.emit('markAsRead', { chatId });
    }

    onMessagesRead(callback: (data: any) => void) {
        this.socket?.on('messagesRead', callback);
    }

    offMessagesRead(callback?: (data: any) => void) {
        if (callback) this.socket?.off('messagesRead', callback);
        else this.socket?.off('messagesRead');
    }

    // Presence
    onOnlineUsers(callback: (userIds: string[]) => void) {
        this.socket?.on('onlineUsers', callback);
    }

    onUserOnline(callback: (data: { userId: string }) => void) {
        this.socket?.on('userOnline', callback);
    }

    onUserOffline(callback: (data: { userId: string }) => void) {
        this.socket?.on('userOffline', callback);
    }

    offPresenceEvents(onlineUsersCb?: any, userOnlineCb?: any, userOfflineCb?: any) {
        if (onlineUsersCb) this.socket?.off('onlineUsers', onlineUsersCb);
        else this.socket?.off('onlineUsers');

        if (userOnlineCb) this.socket?.off('userOnline', userOnlineCb);
        else this.socket?.off('userOnline');

        if (userOfflineCb) this.socket?.off('userOffline', userOfflineCb);
        else this.socket?.off('userOffline');
    }
}

export const socketService = new SocketService();
