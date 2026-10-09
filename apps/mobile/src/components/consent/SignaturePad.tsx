import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius } from '../../theme';

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toSvg: () => string;
};

type Props = {
  onChange?: (empty: boolean) => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { onChange },
  ref
) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [live, setLive] = useState('');
  const strokesRef = useRef<string[]>([]);
  const liveRef = useRef('');
  const sizeRef = useRef({ width: 320, height: 220 });

  const publish = (next: string[], current: string) => {
    strokesRef.current = next;
    liveRef.current = current;
    setStrokes(next);
    setLive(current);
    onChange?.(next.length === 0 && current.length === 0);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const d = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        publish(strokesRef.current, d);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        publish(
          strokesRef.current,
          `${liveRef.current} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`
        );
      },
      onPanResponderRelease: () => {
        if (!liveRef.current) return;
        publish([...strokesRef.current, liveRef.current], '');
      },
      onPanResponderTerminate: () => {
        if (!liveRef.current) return;
        publish([...strokesRef.current, liveRef.current], '');
      },
    })
  ).current;

  useImperativeHandle(ref, () => ({
    clear() {
      publish([], '');
    },
    isEmpty() {
      return strokesRef.current.length === 0 && liveRef.current.length === 0;
    },
    toSvg() {
      const { width, height } = sizeRef.current;
      const all = liveRef.current ? [...strokesRef.current, liveRef.current] : strokesRef.current;
      const paths = all
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
        )
        .join('');
      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
${paths}
</svg>`;
    },
  }));

  return (
    <View
      style={styles.pad}
      onLayout={(e) => {
        sizeRef.current = {
          width: Math.max(1, Math.round(e.nativeEvent.layout.width)),
          height: Math.max(1, Math.round(e.nativeEvent.layout.height)),
        };
      }}
      {...pan.panHandlers}
    >
      <Svg width="100%" height="100%">
        {strokes.map((d, i) => (
          <Path
            key={`${i}-${d.length}`}
            d={d}
            stroke={colors.texte}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {live ? (
          <Path
            d={live}
            stroke={colors.texte}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  pad: {
    height: 220,
    borderWidth: 1,
    borderColor: colors.bordure,
    borderRadius: radius.m,
    backgroundColor: colors.blanc,
    overflow: 'hidden',
  },
});
