import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Send } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BlobBackground from './BlobBackground';

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

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isLastFromSender = index === messages.length - 1 || messages[index + 1].sender !== item.sender;
    const showAvatar = item.sender === 'assistant' && isLastFromSender;
    const marginBottom = isLastFromSender ? 16 : 4;

    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer,
          { marginBottom }
        ]}
      >
        {item.sender === 'assistant' && (
          <View style={[
            styles.avatarContainer, 
            !showAvatar && { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }
          ]}>
            {showAvatar && (
              <LinearGradient
                colors={['#c084fc', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarBar} />
                <View style={styles.avatarBar} />
              </LinearGradient>
            )}
          </View>
        )}
        {item.sender === 'user' ? (
          <LinearGradient
            colors={['#8ED7FF', '#B58DFF']} // Blue to Lilac gradient (matching homepage/avatar)
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
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Animated mesh gradient background simulation */}
      <BlobBackground opacity={0.4} flipColors={true} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ChatBox</Text>
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
    backgroundColor: 'transparent',
  },
  header: {
    padding: 24,
    borderBottomWidth: 3,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 24,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  avatarBar: {
    width: 3,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 1.5,
    marginBottom: 6,
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
    backgroundColor: '#f9fafb', // very light gray (gray-50)
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
  },
  assistantMessageText: {
    color: '#1f2937',
    fontSize: 16,
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
    borderTopWidth: 0,
    backgroundColor: 'transparent', // transparent to show gradient
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // semi-transparent white for input
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
