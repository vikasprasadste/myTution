import { Pressable, StyleSheet, Text } from "react-native";
import type { Role } from "@mytution/shared";
import { useRoleTheme } from "@/theme/useRoleTheme";

interface ThemedButtonProps {
  label: string;
  role: Role;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function ThemedButton({ label, role, onPress, disabled, variant = "primary" }: ThemedButtonProps) {
  const theme = useRoleTheme(role);
  const primary = variant === "primary";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: primary ? theme.accentStrong : "#FFFFFF",
          borderColor: theme.accent,
          opacity: disabled ? 0.45 : 1
        }
      ]}
    >
      <Text style={[styles.label, { color: primary && role !== "tutor" ? "#FFFFFF" : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#22304A",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.1
  }
});
