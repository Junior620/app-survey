import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormTextField, FormTextFieldProps } from './FormTextField';

export interface PasswordFieldProps extends Omit<FormTextFieldProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'> {
  // Option to show/hide password toggle button
  toggleable?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  toggleable = true,
  leftIcon = 'lock-outline',
  ...restProps
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <FormTextField
      label={label ?? t('auth.password')}
      leftIcon={leftIcon}
      secureTextEntry={!showPassword}
      rightIcon={toggleable ? (showPassword ? 'eye-off' : 'eye') : undefined}
      onRightIconPress={toggleable ? togglePasswordVisibility : undefined}
      rightIconAccessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
      autoCapitalize="none"
      autoCorrect={false}
      {...restProps}
    />
  );
};
