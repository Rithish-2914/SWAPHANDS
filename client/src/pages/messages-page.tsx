import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Search, Send, User, Package, Calendar } from "lucide-react";
import { SendMessageDialog } from "@/components/send-message-dialog";
import { apiRequest } from "@/lib/queryClient";
import type { Message, User as UserType, Item } from "@shared/schema";

interface MessageWithDetails extends Message {
  sender: UserType;
  receiver: UserType;
  item: Item;
}

export function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery<UserType>({ queryKey: ["/api/user"] });

  // Mutation to mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("PUT", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Fetch all messages for the current user
  const { data: messages = [], isLoading } = useQuery<MessageWithDetails[]>({
    queryKey: ["/api/messages"],
    enabled: !!currentUser,
  });

  // Group messages by conversation (item + participants)
  const conversations = messages.reduce((acc, message) => {
    // Fix: Use string sorting instead of Math.min/max on UUID strings
    const [participantA, participantB] = [message.senderId, message.receiverId].sort();
    const conversationKey = `${message.itemId}-${participantA}-${participantB}`;
    
    if (!acc[conversationKey]) {
      acc[conversationKey] = {
        id: conversationKey,
        itemId: message.itemId,
        item: message.item,
        participants: [message.sender, message.receiver],
        messages: [],
        lastMessage: message,
        unreadCount: 0,
      };
    }
    
    acc[conversationKey].messages.push(message);
    
    // Update last message if this one is newer
    if (new Date(message.createdAt) > new Date(acc[conversationKey].lastMessage.createdAt)) {
      acc[conversationKey].lastMessage = message;
    }
    
    // Count unread messages from others
    if (message.senderId !== currentUser?.id && !message.isRead) {
      acc[conversationKey].unreadCount++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  const conversationList = Object.values(conversations);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation && currentUser) {
      const conversation = conversations[selectedConversation];
      if (conversation) {
        // Mark all unread messages in this conversation addressed to current user as read
        conversation.messages.forEach((message: MessageWithDetails) => {
          if (message.receiverId === currentUser.id && !message.isRead) {
            markAsReadMutation.mutate(message.id);
          }
        });
      }
    }
  }, [selectedConversation, currentUser, conversations, markAsReadMutation]);

  // Filter conversations based on search  
  const filteredConversations = conversationList.filter(conversation =>
    (conversation.item?.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.participants.some((p: any) => 
      (p.firstName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.lastName || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getOtherParticipant = (participants: UserType[]) => {
    return participants.find(p => p.id !== currentUser?.id);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!currentUser) {
    return (
      <div className="container mx-auto p-6" data-testid="messages-page">
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please log in to view your messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" data-testid="messages-page">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Messages</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            View and manage your conversations with other users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-lg">Conversations</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-conversations"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8" data-testid="no-conversations">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No conversations yet</p>
                <p className="text-sm text-muted-foreground">
                  Start browsing items and contact sellers to begin conversations.
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {filteredConversations.map((conversation) => {
                  const otherUser = getOtherParticipant(conversation.participants);
                  const isSelected = selectedConversation === conversation.id;
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        isSelected ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedConversation(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm" data-testid={`conversation-participant-${conversation.id}`}>
                            {otherUser?.firstName} {otherUser?.lastName}
                          </span>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 px-1 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate" data-testid={`conversation-item-${conversation.id}`}>
                          {conversation.item?.title || "Unknown Item"}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate" data-testid={`conversation-preview-${conversation.id}`}>
                        {conversation.lastMessage.senderId === currentUser.id ? "You: " : ""}
                        {conversation.lastMessage.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Conversation */}
        <Card className="lg:col-span-8">
          {!selectedConversation ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center" data-testid="no-conversation-selected">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to view messages.
                </p>
              </div>
            </div>
          ) : (
            (() => {
              const conversation = conversations[selectedConversation];
              if (!conversation) return null;
              
              const otherUser = getOtherParticipant(conversation.participants);
              const sortedMessages = conversation.messages.sort((a: Message, b: Message) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );

              return (
                <>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {otherUser?.firstName} {otherUser?.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Package className="w-4 h-4" />
                          About: {conversation.item?.title || "Unknown Item"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <Separator />
                  
                  <CardContent className="flex-1 p-4">
                    <div className="h-[350px] overflow-y-auto mb-4 space-y-4" data-testid={`conversation-messages-${selectedConversation}`}>
                      {sortedMessages.map((message: Message) => {
                        const isFromCurrentUser = message.senderId === currentUser.id;
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}
                            data-testid={`message-${message.id}`}
                          >
                            <div
                              className={`max-w-[70%] p-3 rounded-lg ${
                                isFromCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3" />
                                <span className="text-xs opacity-70">
                                  {new Date(message.createdAt).toLocaleString()}
                                </span>
                                {!message.isRead && !isFromCurrentUser && (
                                  <Badge variant="secondary" className="h-4 px-1 text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Reply Section */}
                    {otherUser && (
                      <div className="border-t pt-4">
                        <SendMessageDialog 
                          item={conversation.item} 
                          receiverId={otherUser.id} 
                          currentUser={currentUser}
                        >
                          <Button className="w-full" data-testid={`button-reply-${selectedConversation}`}>
                            <Send className="w-4 h-4 mr-2" />
                            Send Reply
                          </Button>
                        </SendMessageDialog>
                      </div>
                    )}
                  </CardContent>
                </>
              );
            })()
          )}
        </Card>
      </div>
    </div>
  );
}