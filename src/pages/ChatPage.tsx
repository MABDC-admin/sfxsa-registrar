import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/apiClient'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface Contact {
  id: string
  name: string
  role: string
  avatar: string
  online: boolean
  lastSeen?: string
  unread?: number
}

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
  reactions?: string[]
  replyTo?: string
  attachments?: { name: string; type: string; url: string }[]
}

export function ChatPage() {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasInitializedRef = useRef(false)

  // Load contacts function (memoized for real-time updates)
  const loadContacts = useCallback(async () => {
    const { data } = await api
      .from('profiles')
      .select('id, full_name, role, avatar_url')
      .in('role', ['admin', 'teacher', 'finance'])
      .neq('id', profile?.id || '')

    if (data) {
      const contactList: Contact[] = data.map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        role: p.role,
        avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.full_name}`,
        online: Math.random() > 0.5, // Demo: random online status
        lastSeen: 'Recently',
        unread: Math.floor(Math.random() * 5),
      }))
      setContacts(contactList)
      
      // Only set initial contact once
      if (!hasInitializedRef.current && contactList.length > 0) {
        setSelectedContact(contactList[0])
        hasInitializedRef.current = true
      }
    }
  }, [profile?.id]) // Removed selectedContact from deps to prevent loop

  // Initial load of contacts
  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Real-time subscription for contacts
  useRealtimeSubscription(
    { table: 'profiles' },
    loadContacts,
    [profile?.id]
  )

  // Demo messages when contact changes
  useEffect(() => {
    if (selectedContact) {
      const demoMessages: Message[] = [
        {
          id: '1',
          senderId: selectedContact.id,
          text: 'Hi! How are you today?',
          timestamp: new Date(Date.now() - 3600000),
          status: 'read',
        },
        {
          id: '2',
          senderId: profile?.id || 'me',
          text: "I'm doing great! Just finished grading the assignments.",
          timestamp: new Date(Date.now() - 3500000),
          status: 'read',
        },
        {
          id: '3',
          senderId: selectedContact.id,
          text: 'Awesome! Did you see the new announcement about the Science Fair?',
          timestamp: new Date(Date.now() - 3400000),
          status: 'read',
        },
        {
          id: '4',
          senderId: profile?.id || 'me',
          text: 'Yes! The students are really excited about it 🎉',
          timestamp: new Date(Date.now() - 3300000),
          status: 'read',
          reactions: ['👍', '❤️'],
        },
        {
          id: '5',
          senderId: selectedContact.id,
          text: "That's great to hear! Let me know if you need any help with the preparations.",
          timestamp: new Date(Date.now() - 60000),
          status: 'delivered',
        },
      ]
      setMessages(demoMessages)
    }
  }, [selectedContact, profile])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedContact) return

    const msg: Message = {
      id: Date.now().toString(),
      senderId: profile?.id || 'me',
      text: newMessage,
      timestamp: new Date(),
      status: 'sent',
    }
    setMessages([...messages, msg])
    setNewMessage('')

    // Simulate typing response
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      const response: Message = {
        id: (Date.now() + 1).toString(),
        senderId: selectedContact.id,
        text: getAutoReply(),
        timestamp: new Date(),
        status: 'delivered',
      }
      setMessages(prev => [...prev, response])
    }, 2000)
  }

  const getAutoReply = () => {
    const replies = [
      "Thanks for the message! I'll get back to you soon.",
      "Got it! Let me check on that.",
      "Sure thing! I'll handle it right away.",
      "Thanks for letting me know! 👍",
      "Perfect! I appreciate the update.",
    ]
    return replies[Math.floor(Math.random() * replies.length)]
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, reactions: [...(msg.reactions || []), emoji] }
        : msg
    ))
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏']

  return (
    <div className="flex-1 flex h-screen">
      {/* Left Sidebar - Contacts */}
      <div className="w-80 bg-white/95 backdrop-blur-sm border-r flex flex-col relative z-10 shadow-lg">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800 mb-3">💬 Messages</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedContact?.id === contact.id ? 'bg-green-50 border-r-4 border-green-500' : ''
              }`}
            >
              <div className="relative">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  contact.online ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 truncate">{contact.name}</p>
                  {contact.unread && contact.unread > 0 && (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                      {contact.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 capitalize">{contact.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col relative z-10">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={selectedContact.avatar}
                  alt={selectedContact.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  selectedContact.online ? 'bg-green-500' : 'bg-gray-400'
                }`}></span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{selectedContact.name}</h3>
                <p className="text-xs text-gray-500">
                  {selectedContact.online ? '🟢 Online' : `Last seen ${selectedContact.lastSeen}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Voice Call">
                📞
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Video Call">
                📹
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="More Options">
                ⋮
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => {
              const isMe = message.senderId === profile?.id || message.senderId === 'me'
              const showAvatar = !isMe && (index === 0 || messages[index - 1].senderId !== message.senderId)
              
              return (
                <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                  {!isMe && showAvatar && (
                    <img
                      src={selectedContact.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full mr-2 self-end"
                    />
                  )}
                  {!isMe && !showAvatar && <div className="w-8 mr-2"></div>}
                  
                  <div className={`max-w-md ${isMe ? 'order-1' : ''}`}>
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-green-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    </div>
                    
                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {message.reactions.map((emoji, i) => (
                          <span key={i} className="text-xs bg-white rounded-full px-1.5 py-0.5 shadow-sm">
                            {emoji}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Time & Status */}
                    <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${isMe ? 'justify-end' : ''}`}>
                      <span>{formatTime(message.timestamp)}</span>
                      {isMe && (
                        <span>
                          {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                    
                    {/* Quick Reactions (shown on hover) */}
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                      {emojis.slice(0, 4).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(message.id, emoji)}
                          className="text-xs hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <img
                  src={selectedContact.avatar}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <div className="bg-white px-4 py-2 rounded-2xl shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t">
            <div className="flex items-end gap-2">
              {/* Attachment Button */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  📎
                </button>
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border p-2 space-y-1 min-w-[150px]">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"
                    >
                      📄 Document
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                      🖼️ Photo
                    </button>
                    <button className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700">
                      📍 Location
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" />
              </div>

              {/* Emoji Button */}
              <div className="relative">
                <button
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  😊
                </button>
                {showEmoji && (
                  <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border p-2">
                    <div className="grid grid-cols-8 gap-1">
                      {['😀', '😂', '😊', '😍', '🥰', '😎', '🤔', '😴', '👍', '👏', '🎉', '❤️', '🔥', '✨', '💯', '🙏'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setNewMessage(prev => prev + emoji)
                            setShowEmoji(false)
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2 rounded-2xl bg-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  rows={1}
                  style={{ maxHeight: '120px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-full transition-all ${
                  newMessage.trim()
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <span className="text-6xl mb-4 block">💬</span>
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        </div>
      )}

      {/* Right Sidebar - Contact Info (optional, shown when contact selected) */}
      {selectedContact && (
        <div className="w-72 bg-white/95 backdrop-blur-sm border-l hidden lg:block relative z-10 shadow-lg">
          <div className="p-6 text-center border-b">
            <img
              src={selectedContact.avatar}
              alt={selectedContact.name}
              className="w-20 h-20 rounded-full mx-auto mb-3"
            />
            <h3 className="font-bold text-gray-800">{selectedContact.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{selectedContact.role}</p>
            <p className={`text-xs mt-1 ${selectedContact.online ? 'text-green-500' : 'text-gray-400'}`}>
              {selectedContact.online ? '🟢 Online' : '⚫ Offline'}
            </p>
          </div>

          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Quick Actions</h4>
            <div className="grid grid-cols-3 gap-2">
              <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="text-xl">📞</span>
                <span className="text-xs text-gray-600">Call</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="text-xl">📹</span>
                <span className="text-xs text-gray-600">Video</span>
              </button>
              <button className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <span className="text-xl">🔇</span>
                <span className="text-xs text-gray-600">Mute</span>
              </button>
            </div>
          </div>

          <div className="p-4 border-t">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Shared Media</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🖼️</div>
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-2xl">📎</div>
            </div>
            <button className="w-full mt-3 text-sm text-green-600 hover:underline">
              View All Media →
            </button>
          </div>

          <div className="p-4 border-t">
            <button className="w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              🚫 Block User
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
