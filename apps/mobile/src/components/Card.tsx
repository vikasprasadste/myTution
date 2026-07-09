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
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(214,225,235,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    shadowColor: "#22304A",
    shadowOpacity: 0.055,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2
  }
});
