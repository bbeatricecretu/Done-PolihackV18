import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { DevLogger } from '../services/DevLogger';
import { X, Trash2, Terminal } from 'lucide-react-native';

interface DevConsoleModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DevConsoleModal({ visible, onClose }: DevConsoleModalProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs(DevLogger.getLogs());
    const unsubscribe = DevLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Terminal size={20} color="#333" />
              <Text style={styles.title}>Dev Console</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => DevLogger.clear()} style={styles.iconButton}>
                <Trash2 size={20} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No logs yet...</Text>
            ) : (
              logs.map((log, index) => (
                <View key={index} style={styles.logEntry}>
                  <Text style={styles.logText}>{log}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
  logsContainer: {
    flex: 1,
  },
  logEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
