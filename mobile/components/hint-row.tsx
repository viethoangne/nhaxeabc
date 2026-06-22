import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import tw from 'twrnc';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
};

export function HintRow({ title = 'Try editing', hint = 'app/index.tsx' }: HintRowProps) {
  return (
    <View style={tw`flex-row justify-between`}>
      <ThemedText type="small">{title}</ThemedText>
      <ThemedView type="backgroundSelected" style={tw`rounded px-2 py-0.5`}>
        <ThemedText themeColor="textSecondary">{hint}</ThemedText>
      </ThemedView>
    </View>
  );
}
