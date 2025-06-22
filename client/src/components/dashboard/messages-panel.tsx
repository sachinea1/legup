import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SmsMessage } from "@shared/schema";

export function MessagesPanel() {
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['/api/messages', selectedPhone],
    staleTime: 0, // Always fetch fresh data
    queryFn: async () => {
      const params = selectedPhone ? `?phone=${selectedPhone}` : "";
      const response = await fetch(`/api/messages${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ phone, message }: { phone: string; message: string }) => {
      return apiRequest("POST", "/api/messages", { phone, message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPhone) return;
    
    await sendMessageMutation.mutateAsync({
      phone: selectedPhone,
      message: newMessage.trim(),
    });
  };

  // Group messages by phone number for conversation threads
  const messageThreads = messages?.reduce((acc: Record<string, SmsMessage[]>, message: SmsMessage) => {
    if (!acc[message.phone]) {
      acc[message.phone] = [];
    }
    acc[message.phone].push(message);
    return acc;
  }, {}) || {};

  const getInitials = (phone: string) => {
    return phone.slice(-4);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(messageThreads).map(([phone, phoneMessages]) => {
              const lastMessage = phoneMessages[phoneMessages.length - 1];
              const isSelected = selectedPhone === phone;
              
              return (
                <div
                  key={phone}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedPhone(isSelected ? "" : phone)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {getInitials(phone)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">Customer</div>
                        <div className="text-xs text-gray-500">{phone}</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(lastMessage.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {isSelected ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {phoneMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-2 rounded-lg max-w-xs ${
                            message.direction === "outbound"
                              ? "bg-blue-600 text-white ml-auto"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
                      <p className="text-sm text-gray-900">{lastMessage.content}</p>
                    </div>
                  )}
                  
                  {isSelected && (
                    <form onSubmit={handleSendMessage} className="mt-3 flex space-x-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={sendMessageMutation.isPending || !newMessage.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  )}
                  
                  {!isSelected && (
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                        Quick Reply
                      </Button>
                      <Button variant="link" size="sm" className="text-blue-600">
                        View Full Thread
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-4 flex justify-center">
          <Button variant="link" className="text-blue-600">
            View All Messages <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
