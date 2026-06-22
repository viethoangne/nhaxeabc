import { version } from 'expo/package.json';
import { Image } from 'expo-image';
import { useColorScheme } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import tw from 'twrnc';

export function WebBadge() {
  const scheme = useColorScheme();

  return (
    <ThemedView style={tw`p-5 items-center gap-2`}>
      <ThemedText type="code" themeColor="textSecondary" style={tw`text-center`}>
        v{version}
      </ThemedText>
      <Image
        source={
          scheme === 'dark'
            ? require('@/assets/images/expo-badge-white.png')
            : require('@/assets/images/expo-badge.png')
        }
        style={[tw`w-[123px]`, { aspectRatio: 123 / 24 }]}
      />
    </ThemedView>
  );
}
