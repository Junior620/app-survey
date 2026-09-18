import React, { useState } from 'react';
import { FormTextField, FormTextFieldProps } from './FormTextField';

export interface PasswordFieldProps extends Omit<FormTextFieldProps, 'secureTextEntry' | 'rightIcon' | 'onRightIconPress'> {
  // Option to show/hide password toggle button
  toggleable?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label = 'Mot de passe',
  toggleable = true,
  leftIcon = 'lock-outline',
  ...restProps
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <FormTextField
      label={label}
      leftIcon={leftIcon}
      secureTextEntry={!showPassword}
      rightIcon={toggleable ? (showPassword ? 'eye-off' : 'eye') : undefined}
      onRightIconPress={toggleable ? togglePasswordVisibility : undefined}
      autoCapitalize="none"
      autoCorrect={false}
      {...restProps}
    />
  );
};
