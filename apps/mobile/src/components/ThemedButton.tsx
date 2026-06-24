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
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  label: {
    fontWeight: "800"
  }
});
