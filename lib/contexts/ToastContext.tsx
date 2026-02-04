import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

const DURATION_MS = 2500;
const DEFAULT_MESSAGE = "Added to cart";

type ToastContextValue = {
  showAddedToCart: (message?: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      showAddedToCart: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [opacity, translateY]);

  const showAddedToCart = useCallback(
    (msg?: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMessage(msg ?? DEFAULT_MESSAGE);
      setVisible(true);
      opacity.setValue(0);
      translateY.setValue(-20);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        hide();
      }, DURATION_MS);
    },
    [opacity, translateY, hide],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showAddedToCart }}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.toastInner}>
            <Text style={styles.toastText}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 56,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "center",
  },
  toastInner: {
    backgroundColor: "#111",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
