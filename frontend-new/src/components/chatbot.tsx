"use client"

import { useState, useRef, useEffect } from "react"
import { 
  Send, 
  X, 
  MessageCircle, 
  Bot, 
  User,
  Loader2
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface Message {
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

interface ChatbotProps {
  inline?: boolean
}

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
      </div>
      <span className="text-xs text-muted-foreground">Thinking...</span>
    </div>
  )
}

// Message bubble component
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  
  return (
    <div 
      className={cn(
        "flex gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
        isUser 
          ? "bg-primary text-white" 
          : "bg-muted text-foreground"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      {/* Message content */}
      <div className={cn(
        "max-w-[75%] rounded-lg px-3 py-2",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground"
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  )
}



export default function Chatbot({ inline = false }: ChatbotProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const sendMessage = async (msg: string) => {
    if (!msg.trim()) return
    
    const userMsg: Message = { role: 'user', text: msg.trim(), timestamp: new Date() }
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: msg })
      })

      if (!res.ok) throw new Error('Chatbot query failed')
      const data = await res.json()
      const botMsg: Message = { 
        role: 'bot', 
        text: data.response || 'I apologize, but I couldn\'t process that request. Please try again.', 
        timestamp: new Date() 
      }
      setMessages((m) => [...m, botMsg])
    } catch {
      setMessages((m) => [...m, { 
        role: 'bot', 
        text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.', 
        timestamp: new Date() 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // Chat window JSX — inlined to avoid re-mount on every keystroke
  const chatWindowPositionClass = inline
    ? "fixed top-16 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px]"
    : "fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[500px]"

  const chatWindow = (
    <div 
      className={cn(
        "flex flex-col bg-background border border-border rounded-lg shadow-xl overflow-hidden",
        chatWindowPositionClass
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-sm">SkyLy AI</h3>
          </div>
          <button 
            onClick={() => setOpen(false)} 
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <h4 className="font-medium mb-2">Ask me anything</h4>
            <p className="text-xs text-muted-foreground">
              Questions about AQI, cities, or health tips
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble 
                key={i} 
                message={msg} 
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border/50">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            disabled={loading}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg border border-border",
              "bg-muted/50 text-foreground",
              "text-sm placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
              "disabled:opacity-50"
            )}
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className={cn(
              "p-2 rounded-lg bg-primary text-white",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )

  // Floating action button
  const FloatingButton = () => (
    <button
      aria-label={open ? "Close chat" : "Open chat"}
      onClick={() => setOpen((s) => !s)}
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full",
        "bg-primary text-white shadow-lg",
        "hover:bg-primary/90",
        "transition-all"
      )}
    >
      <div className="flex items-center justify-center">
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </div>
    </button>
  )

  // Inline button (for navigation)
  const InlineButton = () => (
    <button
      aria-label={open ? "Close chat" : "Open chat"}
      onClick={() => setOpen((s) => !s)}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
        "bg-primary text-white hover:bg-primary/90",
        "text-sm font-medium"
      )}
    >
      {open ? (
        <X className="w-4 h-4" />
      ) : (
        <>
          <Bot className="w-4 h-4" />
          <span>AI Chat</span>
        </>
      )}
    </button>
  )

  return (
    <>
      {inline ? (
        <div className="relative">
          <InlineButton />
          {open && chatWindow}
        </div>
      ) : (
        <>
          <FloatingButton />
          {open && chatWindow}
        </>
      )}
    </>
  )
}
