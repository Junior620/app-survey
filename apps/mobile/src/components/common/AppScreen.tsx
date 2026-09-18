import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ViewStyle,
  StyleProp,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

export interface AppScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing | number;
  /** Prefer true on forms. */
  keyboardAvoiding?: boolean;
  backgroundColor?: string;
  testID?: string;
}

export const AppScreen: React.FC<AppScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  padding = 16,
  keyboardAvoiding = true,
  backgroundColor = colors.fond,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!keyboardAvoiding || scrollable) return;
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
  }, [keyboardAvoiding, scrollable]);

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  const innerPad: ViewStyle = {
    padding: paddingValue,
  };

  const useKav = keyboardAvoiding && Platform.OS === 'ios' && !scrollable;

  const body = scrollable ? (
    <KeyboardAwareScrollView
      style={styles.flexOne}
      contentContainerStyle={[innerPad, contentContainerStyle]}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View
      style={[
        styles.flexOne,
        innerPad,
        contentContainerStyle,
        keyboardHeight > 0
          ? { paddingBottom: paddingValue + Math.max(0, keyboardHeight - insets.bottom) }
          : null,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[containerStyle, style]} testID={testID}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {useKav ? (
        <KeyboardAvoidingView behavior="padding" style={styles.flexOne}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.flexOne}>{body}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
});
