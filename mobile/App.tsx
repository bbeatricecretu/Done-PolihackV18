import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Settings } from 'lucide-react-native';
import { Navbar } from './src/components/Navbar';
import { HomePage } from './src/components/HomePage';
import { ChatBoxPage } from './src/components/ChatBoxPage';
import { TasksPage } from './src/components/TasksPage';
import { SettingsPage } from './src/components/SettingsPage';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'chat' | 'tasks' | 'settings'>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'chat':
        return <ChatBoxPage />;
      case 'tasks':
        return <TasksPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <LinearGradient
      colors={['#eff6ff', '#f5f3ff', '#fdf2f8']} // blue-50, purple-50, pink-50
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        
        {/* Page content */}
        <View style={styles.content}>
          {renderPage()}
        </View>
        
        {/* Bottom navbar */}
        <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
