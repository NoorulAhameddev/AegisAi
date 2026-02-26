import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/(protected)/chat");
      } else {
        router.replace("/onboarding");
      }
    }
  }, [user, loading]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}
