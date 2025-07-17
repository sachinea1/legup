import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  Search, 
  Phone, 
  MoreVertical, 
  CheckCheck, 
  Clock,
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { displayPhoneNumber } from "@/lib/phone";
import type { SmsMessage, Lead } from "@shared/schema";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

interface ConversationThread {
  phone: string;
  leadId: number | null;
  lead: Lead | null;
  messages: SmsMessage[];
  lastMessage: SmsMessage;
  unreadCount: number;
}

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["/api/messages"],
    staleTime: 30000, // 30 seconds
  });

  // Fetch leads for contact info
  const { data: leads = [] } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Group messages into conversation threads
  const conversationThreads: ConversationThread[] = messages.reduce((acc: ConversationThread[], message: SmsMessage) => {
    const existingThread = acc.find(thread => thread.phone === message.phone);
    const associatedLead = leads.find(lead => lead.phone === message.phone);
    
    if (existingThread) {
      existingThread.messages.push(message);
      if (new Date(message.createdAt) > new Date(existingThread.lastMessage.createdAt)) {
        existingThread.lastMessage = message;
      }
      if (message.direction === "inbound" && !message.read) {
        existingThread.unreadCount++;
      }
    } else {
      acc.push({
        phone: message.phone,
        leadId: associatedLead?.id || null,
        lead: associatedLead || null,
        messages: [message],
        lastMessage: message,
        unreadCount: message.direction === "inbound" && !message.read ? 1 : 0,
      });
    }
    return acc;
  }, []).sort((a, b) => 
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );

  // Filter conversations based on search
  const filteredConversations = conversationThreads.filter(thread => {
    const searchLower = searchQuery.toLowerCase();
    return (
      thread.phone.includes(searchLower) ||
      thread.lead?.name.toLowerCase().includes(searchLower) ||
      thread.lastMessage.content.toLowerCase().includes(searchLower)
    );
  });

  const selectedThread = conversationThreads.find(thread => thread.phone === selectedConversation);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest("POST", "/api/messages", { phone, message });
    },
    onMutate: () => {
      setIsComposing(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
      setIsComposing(false);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
    onError: (error: any) => {
      setIsComposing(false);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendMessageMutation.isPending) return;
    
    await sendMessageMutation.mutateAsync({
      phone: selectedConversation,
      message: newMessage.trim(),
    });
  };

  // Auto-scroll to bottom when new messages arrive or conversation changes
  useEffect(() => {
    if (selectedThread) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedThread?.messages.length, selectedConversation]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversation && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedConversation]);

  const getMessageStatus = (message: SmsMessage) => {
    if (message.direction === "outbound") {
      if (message.status === "failed") {
        return <AlertCircle className="w-3 h-3 text-red-500" aria-label="Failed to send" />;
      } else if (message.status === "sent") {
        return <CheckCheck className="w-3 h-3 text-blue-500" aria-label="Delivered" />;
      } else {
        return <Clock className="w-3 h-3 text-gray-400" aria-label="Sending" />;
      }
    }
    return null;
  };

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, "h:mm a");
    } else if (isYesterday(messageDate)) {
      return "Yesterday";
    } else {
      return format(messageDate, "MMM d");
    }
  };

  const formatLastMessageTime = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) {
      return format(messageDate, "h:mm a");
    } else if (isYesterday(messageDate)) {
      return "Yesterday";
    } else {
      return formatDistanceToNow(messageDate, { addSuffix: true });
    }
  };

  // Group messages by date for display
  const groupMessagesByDate = (messages: SmsMessage[]) => {
    const groups: { date: string; messages: SmsMessage[] }[] = [];
    let currentDate = "";
    
    messages.forEach(message => {
      const messageDate = format(new Date(message.createdAt), "yyyy-MM-dd");
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({
          date: messageDate,
          messages: [message]
        });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });
    
    return groups;
  };

  const getContactName = (thread: ConversationThread) => {
    return thread.lead?.name || `Customer ${thread.phone.slice(-4)}`;
  };

  const getContactInitials = (thread: ConversationThread) => {
    if (thread.lead?.name) {
      return thread.lead.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return thread.phone.slice(-2);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50" role="region" aria-label="Messages">
      {/* Conversations List */}
      <div className={`bg-white border-r border-gray-200 ${selectedConversation ? 'hidden lg:block lg:w-80' : 'w-full lg:w-80'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <Button variant="ghost" size="sm" aria-label="Filter conversations">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search conversations"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-8rem)]">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((thread) => (
                <button
                  key={thread.phone}
                  onClick={() => setSelectedConversation(thread.phone)}
                  className={`w-full p-3 rounded-lg text-left transition-colors mb-2 ${
                    selectedConversation === thread.phone
                      ? "bg-blue-50 border-2 border-blue-200"
                      : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                  aria-label={`Conversation with ${getContactName(thread)}`}
                  aria-pressed={selectedConversation === thread.phone}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        {getContactInitials(thread)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {getContactName(thread)}
                        </h3>
                        <div className="flex items-center space-x-1">
                          {thread.unreadCount > 0 && (
                            <Badge variant="default" className="bg-blue-600 text-white px-2 py-1 text-xs">
                              {thread.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatLastMessageTime(thread.lastMessage.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate">
                        {displayPhoneNumber(thread.phone)}
                      </p>
                      
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {thread.lastMessage.direction === "outbound" && "You: "}
                        {thread.lastMessage.content}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Conversation View */}
      {selectedThread ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Conversation Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {getContactInitials(selectedThread)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {getContactName(selectedThread)}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {displayPhoneNumber(selectedThread.phone)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" aria-label="Call contact">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="More options">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {groupMessagesByDate(selectedThread.messages).map((group) => (
                <div key={group.date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-4">
                    <Separator className="flex-1" />
                    <span className="px-3 text-sm text-gray-500 bg-white">
                      {isToday(new Date(group.date)) 
                        ? "Today" 
                        : isYesterday(new Date(group.date))
                        ? "Yesterday"
                        : format(new Date(group.date), "MMMM d, yyyy")
                      }
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  {/* Messages for this date */}
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "outbound" ? "justify-end" : "justify-start"
                      } mb-2`}
                      role="group"
                      aria-label={`Message from ${message.direction === "outbound" ? "you" : getContactName(selectedThread)} at ${formatMessageTime(message.createdAt)}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.direction === "outbound"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${
                          message.direction === "outbound" ? "text-blue-100" : "text-gray-500"
                        }`}>
                          <span className="text-xs">
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {getMessageStatus(message)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
              <div className="flex-1">
                <Input
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sendMessageMutation.isPending}
                  className="resize-none"
                  aria-label="Type your message"
                  aria-describedby="send-button"
                />
              </div>
              <Button
                type="submit"
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className="px-4 py-2"
                aria-label="Send message"
                id="send-button"
              >
                {sendMessageMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-label="Sending" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            
            {isComposing && (
              <div className="mt-2 text-xs text-gray-500" aria-live="polite">
                Sending message...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p>Choose a conversation from the sidebar to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}