import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  italic,
  kerning,
  lineLimit,
  minimumScaleFactor,
  opacity,
  padding,
  resizable,
  textCase,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { SFSymbol } from 'sf-symbols-typescript';

export type FactActivityProps = {
  topic: string;
  text: string;
  symbol: SFSymbol;
  /** "7/24": position of the card in the deck. */
  position: string;
  /** Show the card on the lock screen banner. When false only a quiet one-line strip remains (iOS always draws a card). */
  lockScreen: boolean;
  /** Show the Dynamic Island presentations. When false they are left empty. */
  island: boolean;
  /** file:// URI of the mascot PNG in the shared widgets directory; empty when unavailable. */
  shell: string;
};

// Runs inside the widget extension's isolated runtime: no hooks, no app state,
// no helpers or constants declared outside this function. Only @expo/ui/swift-ui views.
// Colors are the brand palette from src/theme.ts, inlined by necessity.
// There is deliberately no countdown here: the card changes when it changes.
const FactActivity = (props: FactActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const coral = environment.isLuminanceReduced ? '#FFFFFF' : '#D99B7F';
  const white = '#FFFFFF';
  const mist = '#A7ACBE';
  const contentOpacity = environment.isStale ? 0.55 : 1;
  const hasShell = props.shell.length > 0;

  // iOS always draws a lock screen card for a running activity and enforces a minimum size,
  // so "Dynamic Island only" keeps a quiet one-line strip instead of an empty glass box.
  const quiet = (
    <HStack spacing={8} modifiers={[padding({ horizontal: 16, vertical: 4 }), activityBackgroundTint('#061821')]}>
      {hasShell ? (
        <Image uiImage={props.shell} modifiers={[resizable(), frame({ width: 22, height: 18 })]} />
      ) : (
        <Image systemName={props.symbol} color={coral} size={14} />
      )}
      <Text
        modifiers={[font({ size: 11, weight: 'bold' }), kerning(1.2), textCase('uppercase'), foregroundStyle(coral)]}
      >
        {props.topic}
      </Text>
      <Spacer />
    </HStack>
  );

  return {
    banner: !props.lockScreen ? (
      quiet
    ) : (
      <HStack
        spacing={14}
        modifiers={[
          padding({ horizontal: 18, vertical: 16 }),
          opacity(contentOpacity),
          activityBackgroundTint('#061821'),
        ]}
      >
        {hasShell ? (
          <Image uiImage={props.shell} modifiers={[resizable(), frame({ width: 46, height: 37 })]} />
        ) : (
          <Image systemName={props.symbol} color={coral} size={26} />
        )}
        <VStack alignment="leading" spacing={6}>
          <HStack spacing={7}>
            <Text
              modifiers={[
                font({ size: 11, weight: 'bold' }),
                kerning(1.2),
                textCase('uppercase'),
                foregroundStyle(coral),
              ]}
            >
              {props.topic}
            </Text>
            <Spacer />
            <Text modifiers={[font({ size: 12, design: 'serif' }), italic(), foregroundStyle(mist)]}>
              {props.position}
            </Text>
          </HStack>
          <Text
            modifiers={[
              font({ size: 17, weight: 'medium', design: 'serif' }),
              foregroundStyle(white),
              lineLimit(3),
              minimumScaleFactor(0.8),
            ]}
          >
            {props.text}
          </Text>
        </VStack>
      </HStack>
    ),
    compactLeading: !props.island ? undefined : hasShell ? (
      <Image uiImage={props.shell} modifiers={[resizable(), frame({ width: 22, height: 18 })]} />
    ) : (
      <Image systemName={props.symbol} color={coral} />
    ),
    compactTrailing: !props.island ? undefined : <Image systemName={props.symbol} color={coral} size={13} />,
    minimal: !props.island ? undefined : hasShell ? (
      <Image uiImage={props.shell} modifiers={[resizable(), frame({ width: 20, height: 16 })]} />
    ) : (
      <Image systemName={props.symbol} color={coral} />
    ),
    expandedLeading: !props.island ? undefined : hasShell ? (
      <Image
        uiImage={props.shell}
        modifiers={[resizable(), frame({ width: 34, height: 27 }), padding({ leading: 6 })]}
      />
    ) : (
      <Image systemName={props.symbol} color={coral} size={18} />
    ),
    expandedCenter: !props.island ? undefined : (
      <Text modifiers={[font({ size: 12, weight: 'bold' }), kerning(1), textCase('uppercase'), foregroundStyle(coral)]}>
        {props.topic}
      </Text>
    ),
    expandedTrailing: !props.island ? undefined : (
      <Text
        modifiers={[font({ size: 12, design: 'serif' }), italic(), foregroundStyle(mist), padding({ trailing: 6 })]}
      >
        {props.position}
      </Text>
    ),
    expandedBottom: !props.island ? undefined : (
      <Text
        modifiers={[
          font({ size: 15, weight: 'medium', design: 'serif' }),
          foregroundStyle(white),
          lineLimit(3),
          minimumScaleFactor(0.8),
          padding({ horizontal: 8, bottom: 6 }),
        ]}
      >
        {props.text}
      </Text>
    ),
  };
};

export default createLiveActivity('FactActivity', FactActivity);
