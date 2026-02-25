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

    sendMessage(chatId: string, content: string) {
        this.socket?.emit('sendMessage', { chatId, content });
    }

    onNewMessage(callback: (message: any) => void) {
        this.socket?.on('newMessage', callback);
    }

    offNewMessage() {
        this.socket?.off('newMessage');
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

    offTypingEvents() {
        this.socket?.off('userTyping');
        this.socket?.off('userStopTyping');
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

    offPresenceEvents() {
        this.socket?.off('onlineUsers');
        this.socket?.off('userOnline');
        this.socket?.off('userOffline');
    }
}

export const socketService = new SocketService();
