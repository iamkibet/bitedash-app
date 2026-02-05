import { IconSymbol } from "@/components/ui/icon-symbol";
import { resolveImageUrl } from "@/lib/utils/imageUrl";
import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type PlaceholderIcon = "menucard.fill" | "storefront.fill";

interface MenuItemImageProps {
  imageUrl: string | null | undefined;
  style?: ViewStyle;
  placeholderIcon?: PlaceholderIcon;
  placeholderIconSize?: number;
}

export function MenuItemImage({
  imageUrl,
  style,
  placeholderIcon = "menucard.fill",
  placeholderIconSize = 32,
}: MenuItemImageProps) {
  const [error, setError] = useState(false);
  const resolved = resolveImageUrl(imageUrl);
  const showPlaceholder = !resolved || error;

  if (showPlaceholder) {
    return (
      <View style={[styles.placeholder, style]}>
        <IconSymbol
          name={placeholderIcon}
          size={placeholderIconSize}
          color="#cbd5e1"
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: resolved }}
      style={[styles.image, style]}
      contentFit="cover"
      onError={() => setError(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    backgroundColor: "#f1f5f9",
  },
});
