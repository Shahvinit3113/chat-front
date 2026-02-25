import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

const ChatApp: React.FC = () => {
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    const handleShowUsers = () => {
        // On mobile: go back to sidebar and switch to Users tab
        setActiveChatId(null);
    };

    return (
        <div className="app-container glass-panel">
            <Sidebar
                onSelectChat={setActiveChatId}
                activeChatId={activeChatId}
                isMobileHidden={activeChatId !== null}
            />
            <ChatWindow
                chatId={activeChatId || ''}
                onBack={() => setActiveChatId(null)}
                onShowUsers={handleShowUsers}
            />
        </div>
    );
};

export default ChatApp;
