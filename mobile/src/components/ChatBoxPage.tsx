import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  time: string;
}

export function ChatBoxPage() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Hello, ...', sender: 'assistant', time: '10:30' },
    { id: 2, text: 'How can I help you organize your mementos today?', sender: 'assistant', time: '10:30' },
  ]);

  const handleSend = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        { 
          id: messages.length + 1, 
          text: message, 
          sender: 'user', 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        },
      ]);
      setMessage('');
    }
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChatBox</Text>
        <Text style={styles.headerSubtitle}>Ask anything</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Say something"
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <LinearGradient
              colors={['#60a5fa', '#c084fc', '#e879f9']}
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
});
