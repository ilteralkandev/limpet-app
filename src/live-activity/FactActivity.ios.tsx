import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, minimumScaleFactor, opacity, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { SFSymbol } from 'sf-symbols-typescript';

export type FactActivityProps = {
  topic: string;
  text: string;
  symbol: SFSymbol;
};

// Runs inside the widget extension's isolated runtime: no hooks, no app state,
// no helpers declared outside this function. Only @expo/ui/swift-ui views.
const FactActivity = (props: FactActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const accent = environment.isLuminanceReduced ? '#FFFFFF' : '#2DD4BF';
  const contentOpacity = environment.isStale ? 0.6 : 1;

  return {
    banner: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 16 }), opacity(contentOpacity)]}>
        <HStack spacing={6}>
          <Image systemName={props.symbol} color={accent} size={13} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accent)]}>{props.topic}</Text>
          <Spacer />
        </HStack>
        <Text modifiers={[font({ size: 15, weight: 'medium' }), lineLimit(3), minimumScaleFactor(0.85)]}>
          {props.text}
        </Text>
      </VStack>
    ),
    compactLeading: <Image systemName={props.symbol} color={accent} />,
    compactTrailing: (
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>{props.topic}</Text>
    ),
    minimal: <Image systemName={props.symbol} color={accent} />,
    expandedLeading: <Image systemName={props.symbol} color={accent} size={18} />,
    expandedCenter: (
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(accent)]}>{props.topic}</Text>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 14 }), lineLimit(3), minimumScaleFactor(0.85), padding({ horizontal: 8 })]}>
        {props.text}
      </Text>
    ),
  };
};

export default createLiveActivity('FactActivity', FactActivity);
