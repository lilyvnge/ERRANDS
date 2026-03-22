import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { socketService } from '../../services/socketService';
import api from '../../services/api';
import { Send, Paperclip, ArrowLeft, CheckCheck, Loader2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useI18n } from '../../i18n/I18nProvider';

interface Message {
  _id: string;
  sender: { _id: string; name: string };
  content: string;
  createdAt: string;
  isRead: boolean;
}

const ChatWindow: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuthStore();
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const clearUnread = useChatStore((s) => s.clearUnread);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversationId || !user) return;

    // 1. Join Socket Room
    socketService.joinConversation(conversationId);

    // 2. Fetch History
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/chat/conversation/${conversationId}/messages`);
        setMessages(res.data.messages);
        
        // Extract other participant info from the first message or fetch conversation details
        // Ideally, we fetch conversation details here, but for now we infer or fetch separately
        // Note: In a real app, we'd fetch the conversation details to get the header info
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    };

    fetchMessages();

    // 3. Listen for Incoming
    const handleReceiveMessage = (data: any) => {
      // Only add if it belongs to this conversation
      if (data.conversationId === conversationId) {
        // Prevent duplicate if we just sent it (though we handle that via optimistic update usually)
        if (data.senderId !== user._id) {
           setMessages(prev => [...prev, {
             _id: Date.now().toString(), // Temp ID
             sender: { _id: data.senderId, name: '...' }, // Minimal data
             content: data.content,
             createdAt: new Date().toISOString(),
             isRead: false
           }]);
           scrollToBottom();
       }
      }
    };

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (!data || !data.userId) return;
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        if (data.isTyping) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    };

    socketService.onReceiveMessage(handleReceiveMessage);
    socketService.onUserTyping(handleUserTyping);

    return () => {
      socketService.leaveConversation(conversationId);
      setTypingUserIds(new Set());
    };
  }, [conversationId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const tempContent = newMessage;
    setNewMessage(''); // Clear input immediately
    setSending(true);

    try {
      // 1. Persist to DB (REST API)
      const res = await api.post('/chat/message', {
        conversationId,
        content: tempContent
      });
      
      const savedMessage = res.data.messageData;

      // 2. Update Local UI
      setMessages(prev => [...prev, savedMessage]);

      // 3. Emit to Socket (so other user sees it instantly)
      socketService.sendMessage({
        conversationId,
        senderId: user._id,
        content: tempContent
      });
      
      scrollToBottom();

    } catch (err) {
      console.error('Failed to send message', err);
      alert(t('chat.failedSend'));
      setNewMessage(tempContent); // Restore text on fail
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (val: string) => {
    setNewMessage(val);
    if (conversationId && user) {
      socketService.startTyping(conversationId, user._id);
      setTimeout(() => socketService.stopTyping(conversationId, user._id), 1500);
    }
  };

  useEffect(() => {
    if (conversationId) {
      clearUnread(conversationId);
    }
  }, [conversationId, clearUnread]);

  if (loading) return <div className="h-full flex items-center justify-center">{t('chat.loading')}</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Mobile Header (Back Button) */}
      <div className="md:hidden bg-white p-4 border-b flex items-center shadow-sm">
        <Link to="/chat" className="mr-4 text-gray-600">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <span className="font-semibold text-gray-800">{t('chat.title')}</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isOwn = msg.sender._id === user?._id;
          
          return (
            <div 
              key={msg._id || index} 
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`
                  max-w-[75%] rounded-lg px-4 py-2 shadow-sm
                  ${isOwn 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}
                `}
              >
                <p className="text-sm">{msg.content}</p>
                <div className={`text-[10px] mt-1 flex items-center justify-end ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isOwn && <CheckCheck className="h-3 w-3 ml-1" />}
                </div>
              </div>
            </div>
          );
        })}
        {typingUserIds.size > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 px-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('chat.typing')}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button 
            type="button" 
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder={t('chat.placeholder')}
              className="w-full bg-transparent border-none focus:ring-0 outline-none text-sm text-gray-800 max-h-32"
            />
          </div>

          <button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className={`
              p-3 rounded-full shadow-sm transition-all
              ${!newMessage.trim() || sending 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
