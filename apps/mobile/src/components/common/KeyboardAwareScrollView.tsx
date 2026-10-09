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
  registerFocused: (target: View | null) => void;
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
    api?.registerFocused(ref.current);
    if (Platform.OS === 'android') return;
    const run = () => api?.ensureVisible(ref.current);
    setTimeout(run, 60);
  }, [api]);

  useEffect(() => {
    if (Platform.OS === 'android') return;
    if (!api?.keyboardOpen || !focused.current) return;
    const t = setTimeout(() => api.ensureVisible(ref.current), 40);
    return () => clearTimeout(t);
  }, [api, api?.keyboardHeight, api?.keyboardOpen]);

  const onBlurClear = useCallback(() => {
    focused.current = false;
    api?.registerFocused(null);
  }, [api]);

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
    const focusedRef = useRef<View | null>(null);
    const keyboardTopRef = useRef(0);
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
      if (Platform.OS === 'android') return;
      const onShow = Keyboard.addListener('keyboardWillShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const onHide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
      return () => {
        onShow.remove();
        onHide.remove();
      };
    }, []);

    const scrollFocusedAboveKeyboard = useCallback(() => {
      const target = focusedRef.current;
      const keyboardTop = keyboardTopRef.current;
      if (!target || !innerRef.current || keyboardTop <= 0) return;
      target.measureInWindow((_x, y, _w, h) => {
        if (!innerRef.current) return;
        const visibleBottom = keyboardTop - keyboardGap;
        const fieldBottom = y + h;
        if (fieldBottom <= visibleBottom) return;
        const delta = fieldBottom - visibleBottom + 8;
        const nextY = Math.max(0, scrollY.current + delta);
        scrollY.current = nextY;
        innerRef.current.scrollTo({ y: nextY, animated: false });
      });
    }, [keyboardGap]);

    useEffect(() => {
      if (Platform.OS !== 'android') return;
      let again: ReturnType<typeof setTimeout> | undefined;
      let later: ReturnType<typeof setTimeout> | undefined;
      const onShow = Keyboard.addListener('keyboardDidShow', (e) => {
        keyboardTopRef.current = e.endCoordinates.screenY;
        scrollFocusedAboveKeyboard();
        again = setTimeout(scrollFocusedAboveKeyboard, 80);
        later = setTimeout(scrollFocusedAboveKeyboard, 220);
      });
      const onHide = Keyboard.addListener('keyboardDidHide', () => {
        keyboardTopRef.current = 0;
      });
      return () => {
        if (again) clearTimeout(again);
        if (later) clearTimeout(later);
        onShow.remove();
        onHide.remove();
      };
    }, [scrollFocusedAboveKeyboard]);

    const registerFocused = useCallback((target: View | null) => {
      focusedRef.current = target;
      if (target && keyboardTopRef.current > 0) scrollFocusedAboveKeyboard();
    }, [scrollFocusedAboveKeyboard]);

    const ensureVisible = useCallback(
      (target: View | null) => {
        if (!target || !innerRef.current) return;
        const kb = keyboardHeight;
        if (kb <= 0) return;
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
        registerFocused,
        keyboardHeight,
        keyboardOpen: keyboardHeight > 0,
      }),
      [ensureVisible, keyboardHeight, registerFocused]
    );

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    };

    const bottomPad =
      Platform.OS === 'android'
        ? 360
        : keyboardHeight > 0
          ? Math.max(0, keyboardHeight - insets.bottom) + keyboardGap + spacing.l
          : spacing.l;

    return (
      <KeyboardScrollContext.Provider value={api}>
        <ScrollView
          ref={setRefs}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={[contentContainerStyle, { flexGrow: 1, paddingBottom: bottomPad }]}
          {...rest}
        >
          {children}
        </ScrollView>
      </KeyboardScrollContext.Provider>
    );
  }
);
