import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function IndexScreen() {
  const router = useRouter();
  const { isHydrated, user } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;
    if (user) {
      router.replace("/(tabs)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [isHydrated, user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#ed751a" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
