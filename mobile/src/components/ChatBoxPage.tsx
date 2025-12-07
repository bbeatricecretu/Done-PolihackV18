import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_IP_KEY = '@memento_server_ip';
const DEFAULT_PORT = '3000';
const CHAT_ID_KEY = '@memento_chat_id';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  time: string;
}

interface ChatBoxPageProps {
  onTasksUpdate?: () => void;
}

export function ChatBoxPage({ onTasksUpdate }: ChatBoxPageProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Check if we have an existing chat session
      let existingChatId: string | null = await AsyncStorage.getItem(CHAT_ID_KEY);
      
      if (!existingChatId) {
        // Create a new chat session
        const backendUrl = await getBackendUrl();
        const response = await fetch(`${backendUrl}/api/chat/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'mobile_user',
            session_name: `Mobile Chat - ${new Date().toLocaleDateString()}`
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          existingChatId = data.chat_id as string;
          await AsyncStorage.setItem(CHAT_ID_KEY, existingChatId);
        } else {
          // Fallback: generate local ID
          existingChatId = `chat-${Date.now()}`;
          await AsyncStorage.setItem(CHAT_ID_KEY, existingChatId);
        }
      }
      
      // At this point existingChatId is guaranteed to be a string
      const chatIdToUse: string = existingChatId;
      setChatId(chatIdToUse);
      
      // Load chat history
      await loadChatHistory(chatIdToUse);
      
      setInitializing(false);
    } catch (error) {
      console.error('Error initializing chat:', error);
      // Fallback: use local ID
      const localChatId = `chat-${Date.now()}`;
      setChatId(localChatId);
      await AsyncStorage.setItem(CHAT_ID_KEY, localChatId);
      setInitializing(false);
    }
  };

  const getBackendUrl = async (): Promise<string> => {
    try {
      const storedIp = await AsyncStorage.getItem(SERVER_IP_KEY);
      const ip = storedIp || '192.168.1.128';
      return `http://${ip}:${DEFAULT_PORT}`;
    } catch (e) {
      return 'http://192.168.1.128:3000';
    }
  };

  const loadChatHistory = async (chatIdToLoad: string) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/chat/${chatIdToLoad}/history?limit=50`);
      
      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.role === 'user' ? 'user' : 'assistant',
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSend = async () => {
    if (message.trim() && !loading) {
      const userMessage = message.trim();
      const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Add user message to UI immediately
      const userMessageObj: Message = {
        id: `user-${Date.now()}`,
        text: userMessage,
        sender: 'user',
        time: userTime
      };
      
      setMessages(prev => [...prev, userMessageObj]);
      setMessage('');
      setLoading(true);

      try {
        const backendUrl = await getBackendUrl();
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const response = await fetch(`${backendUrl}/api/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message: userMessage,
            timezone: deviceTimezone
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Only show assistant response if AI actually returned a message
          if (data.response && data.response.trim()) {
            const assistantMessage: Message = {
              id: data.assistant_message_id || `assistant-${Date.now()}`,
              text: data.response,
              sender: 'assistant',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            
            setMessages(prev => [...prev, assistantMessage]);
          }
          
          // If tool calls were executed, notify parent to refresh tasks
          if (data.execution_results && data.execution_results.length > 0) {
            console.log('[Chat] Tool execution results:', data.execution_results);
            
            // Show execution feedback
            const successfulExecutions = data.execution_results.filter((r: any) => r.success);
            if (successfulExecutions.length > 0 && onTasksUpdate) {
              // Delay to allow DB to update
              setTimeout(() => {
                onTasksUpdate();
              }, 500);
            }
          }
        } else {
          // Error response
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            text: 'Sorry, I encountered an error processing your message. Please make sure you\'re connected to the server.',
            sender: 'assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          text: 'Unable to connect to the server. Please check your connection and try again.',
          sender: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.initText}>Initializing chat...</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
      ]}
    >
      {item.sender === 'user' ? (
        <LinearGradient
          colors={['#60a5fa', '#c084fc', '#e879f9']} // blue-400, purple-400, pink-400
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.userBubble]}
        >
          <Text style={styles.userMessageText}>{item.text}</Text>
          <Text style={styles.userTimeText}>{item.time}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.assistantBubble]}>
          <Text style={styles.assistantMessageText}>{item.text}</Text>
          <Text style={styles.assistantTimeText}>{item.time}</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Animated mesh gradient background simulation */}
      <View style={styles.backgroundContainer}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
        <View style={[styles.orb, styles.orb4]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Task Assistant</Text>
        <Text style={styles.headerSubtitle}>Ask me about your tasks</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#60a5fa" />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your tasks..."
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
          />
          <TouchableOpacity 
            onPress={handleSend} 
            style={styles.sendButton}
            disabled={loading || !message.trim()}
          >
            <LinearGradient
              colors={loading || !message.trim() ? ['#d1d5db', '#d1d5db'] : ['#60a5fa', '#c084fc', '#e879f9']}
              style={styles.sendButtonGradient}
            >
              <Send size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  messagesList: {
    padding: 24,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: 16,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    color: 'white',
    fontSize: 14,
  },
  assistantMessageText: {
    color: '#1f2937',
    fontSize: 14,
  },
  userTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  assistantTimeText: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  inputContainer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'white',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonGradient: {
    padding: 8,
    borderRadius: 999,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    top: -50,
    left: -50,
    width: 300,
    height: 300,
    backgroundColor: '#e0f2fe', // sky-100
  },
  orb2: {
    top: 100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#ccfbf1', // teal-100
  },
  orb3: {
    bottom: 0,
    left: 50,
    width: 300,
    height: 300,
    backgroundColor: '#ffe4e6', // rose-100
  },
  orb4: {
    top: '40%',
    left: '30%',
    width: 250,
    height: 250,
    backgroundColor: '#f3e8ff', // purple-100
    opacity: 0.4,
  },
});
