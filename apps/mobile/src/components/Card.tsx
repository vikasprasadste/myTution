import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface CardProps extends PropsWithChildren {
  onPress?: () => void;
}

export function Card({ children, onPress }: CardProps) {
  const Container = onPress ? Pressable : View;
  return <Container onPress={onPress} style={styles.card}>{children}</Container>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4
  }
});
