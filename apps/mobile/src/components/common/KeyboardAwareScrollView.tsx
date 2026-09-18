import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme';

type KeyboardScrollApi = {
  ensureVisible: (target: View | null) => void;
  keyboardHeight: number;
  keyboardOpen: boolean;
};

const KeyboardScrollContext = createContext<KeyboardScrollApi | null>(null);

export function useKeyboardScroll(): KeyboardScrollApi | null {
  return useContext(KeyboardScrollContext);
}

/** Call from any focused field so the parent KeyboardAwareScrollView scrolls it into view. */
export function useEnsureFieldVisible() {
  const api = useKeyboardScroll();
  const ref = useRef<View>(null);
  const focused = useRef(false);

  const onFocusEnsureVisible = useCallback(() => {
    focused.current = true;
    const run = () => api?.ensureVisible(ref.current);
    setTimeout(run, Platform.OS === 'android' ? 160 : 60);
  }, [api]);

  useEffect(() => {
    if (!api?.keyboardOpen || !focused.current) return;
    const t = setTimeout(() => api.ensureVisible(ref.current), 40);
    return () => clearTimeout(t);
  }, [api, api?.keyboardHeight, api?.keyboardOpen]);

  const onBlurClear = useCallback(() => {
    focused.current = false;
  }, []);

  return {
    containerRef: ref,
    onFocusEnsureVisible,
    onBlurClear,
    keyboardOpen: !!api?.keyboardOpen,
  };
}

type Props = ScrollViewProps & {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra gap above the keyboard (default spacing.m) */
  keyboardGap?: number;
};

/**
 * ScrollView that:
 * - pads bottom by keyboard height
 * - exposes ensureVisible() for form fields via context
 */
export const KeyboardAwareScrollView = React.forwardRef<ScrollView, Props>(
  function KeyboardAwareScrollView(
    { children, contentContainerStyle, keyboardGap = spacing.m, onScroll, ...rest },
    forwardedRef
  ) {
    const insets = useSafeAreaInsets();
    const innerRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const setRefs = useCallback(
      (node: ScrollView | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );

    useEffect(() => {
      const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
      const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const onShow = Keyboard.addListener(showEvent, (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
      return () => {
        onShow.remove();
        onHide.remove();
      };
    }, []);

    const ensureVisible = useCallback(
      (target: View | null) => {
        if (!target || !innerRef.current) return;
        const kb = keyboardHeight > 0 ? keyboardHeight : Platform.OS === 'android' ? 280 : 0;
        target.measureInWindow((_x, y, _w, h) => {
          const windowH = Dimensions.get('window').height;
          const visibleBottom = windowH - kb - keyboardGap;
          const fieldBottom = y + h;
          const topSafe = insets.top + 56;

          if (fieldBottom > visibleBottom) {
            const delta = fieldBottom - visibleBottom + 12;
            innerRef.current?.scrollTo({
              y: Math.max(0, scrollY.current + delta),
              animated: true,
            });
          } else if (y < topSafe) {
            const delta = topSafe - y;
            innerRef.current?.scrollTo({
              y: Math.max(0, scrollY.current - delta),
              animated: true,
            });
          }
        });
      },
      [insets.top, keyboardGap, keyboardHeight]
    );

    const api = useMemo<KeyboardScrollApi>(
      () => ({
        ensureVisible,
        keyboardHeight,
        keyboardOpen: keyboardHeight > 0,
      }),
      [ensureVisible, keyboardHeight]
    );

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    };

    const bottomPad =
      keyboardHeight > 0
        ? Math.max(0, keyboardHeight - insets.bottom) + keyboardGap + spacing.l
        : spacing.l;

    return (
      <KeyboardScrollContext.Provider value={api}>
        <ScrollView
          ref={setRefs}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={[{ paddingBottom: bottomPad, flexGrow: 1 }, contentContainerStyle]}
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    );
  }
);
