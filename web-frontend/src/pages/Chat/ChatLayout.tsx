import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import api from '../../services/api';
import { Loader2, Search, MessageSquare } from 'lucide-react';
import { socketService } from '../../services/socketService';
import { useChatStore } from '../../store/useChatStore';
import { useNotificationStore } from '../../store/useNotificationStore';

interface Conversation {
  _id: string;
  participants: {
    _id: string;
    name: string;
    role: string;
    vendorProfile?: {
      skills: string[];
    };
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
    isRead: boolean;
    sender: string;
  };
  lastMessageAt: string;
  task?: {
    _id: string;
    title: string;
    status: string;
  };
  conversationType?: 'task' | 'direct';
  unreadCount?: number;
}

const ChatLayout: React.FC = () => {
  const { user } = useAuthStore();
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { incrementUnread, clearUnread, unread } = useChatStore();
  const addToast = useNotificationStore((s) => s.addToast);

  useEffect(() => {
    fetchConversations();
    
    // Listen for real-time updates to the conversation list
    // (e.g. move conversation to top when new message arrives)
    socketService.onReceiveMessage((data: any) => {
      if (data.conversationId !== conversationId) {
        incrementUnread(data.conversationId);
        addToast({
          title: 'New message',
          description: data.content,
          type: 'info'
        });
      }

      setConversations(prev => {
        const index = prev.findIndex(c => c._id === data.conversationId);
        if (index === -1) return prev; // New conversation handling requires refresh

        const updated = [...prev];
        const [moved] = updated.splice(index, 1);
        
        // Update the last message preview
        moved.lastMessage = {
          content: data.content,
          createdAt: new Date().toISOString(),
          isRead: false,
          sender: data.senderId
        };
        moved.lastMessageAt = new Date().toISOString();
        
        return [moved, ...updated];
      });
    });

    return () => {
      // Cleanup listeners if necessary
    };
  }, [conversationId, incrementUnread, addToast]);

  // clear unread when viewing conversation
  useEffect(() => {
    if (conversationId) {
      clearUnread(conversationId);
    }
  }, [conversationId, clearUnread]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => p._id !== user?._id) || conversation.participants[0];
  };

  const filteredConversations = conversations.filter(c => {
    const other = getOtherParticipant(c);
    const taskTitle = c.task?.title || '';
    return other.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           taskTitle.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      {/* Sidebar - Conversation List */}
      <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const unreadCount = unread[conv._id] || 0;
              return (
                <NavLink
                  key={conv._id}
                  to={`/chat/${conv._id}`}
                  className={({ isActive }) => `
                    block p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${isActive ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-gray-900 truncate pr-2">{other.name}</span>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-blue-600 mb-1 font-medium truncate">
                    {conv.task?.title || (conv.conversationType === 'direct' ? 'Direct message' : 'Task conversation')}
                  </div>
                  
                  <p className={`text-sm truncate ${
                    conv.lastMessage?.isRead === false && conv.lastMessage?.sender !== user?._id 
                      ? 'font-bold text-gray-900' 
                      : 'text-gray-500'
                  }`}>
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                  {unreadCount > 0 && (
                    <span className="inline-flex mt-2 items-center px-2 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </NavLink>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
        {conversationId ? (
          <Outlet />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLayout;
