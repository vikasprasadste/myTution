import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { Role } from "@mytution/shared";
import { useRoleTheme } from "@/theme/useRoleTheme";

interface ScreenProps extends PropsWithChildren {
  role: Role;
}

export function Screen({ role, children }: ScreenProps) {
  const theme = useRoleTheme(role);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 16
  }
});
