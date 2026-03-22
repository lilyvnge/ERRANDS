import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type Toast = { id: string; title: string; type?: 'success' | 'error' | 'info' };
type ToastContextValue = { show: (title: string, type?: Toast['type']) => void };

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = (title: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToast({ id, title, type });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setToast(null);
        });
      }, 2500);
    });
  };

  const value = useMemo(() => ({ show }), []);

  return (
    <ToastContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {toast && (
          <Animated.View style={[styles.toast, styles[`toast_${toast.type}`], { opacity }]}>
            <Text style={styles.toastText}>{toast.title}</Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4
  },
  toastText: { color: '#fff', fontWeight: '700' },
  toast_success: { backgroundColor: '#16a34a' },
  toast_error: { backgroundColor: '#dc2626' },
  toast_info: { backgroundColor: '#2563eb' },
});
