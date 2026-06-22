import { Platform, Text, type TextProps } from 'react-native';
import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import tw from 'twrnc';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && tw`text-base leading-6 font-medium`,
        type === 'title' && tw`text-5xl font-semibold leading-12`,
        type === 'small' && tw`text-sm leading-5 font-medium`,
        type === 'smallBold' && tw`text-sm leading-5 font-bold`,
        type === 'subtitle' && tw`text-3xl leading-[44px] font-semibold`,
        type === 'link' && tw`text-sm leading-7`,
        type === 'linkPrimary' && tw`text-sm leading-7 text-[#3c87f7]`,
        type === 'code' && [
          tw`text-xs`,
          {
            fontFamily: Fonts.mono,
            fontWeight: Platform.select({ android: '700' as const }) ?? ('500' as const),
          },
        ],
        style,
      ]}
      {...rest}
    />
  );
}
