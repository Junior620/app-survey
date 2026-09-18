package com.example.app_survey.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val AfrexiaLightColorScheme = lightColorScheme(
    primary = DarkForestGreen,
    onPrimary = Color.White,
    primaryContainer = DarkForestGreenLight,
    onPrimaryContainer = Color.White,
    secondary = CacaoBrown,
    onSecondary = Color.White,
    secondaryContainer = CacaoBrownLight,
    onSecondaryContainer = Color.White,
    tertiary = AccentGold,
    onTertiary = DarkForestGreenDark,
    background = Ivory,
    onBackground = CacaoBrown,
    surface = IvorySurface,
    onSurface = CacaoBrown,
    surfaceVariant = Color(0xFFEFE8DC),
    onSurfaceVariant = CacaoBrown
)

private val AfrexiaDarkColorScheme = darkColorScheme(
    primary = DarkForestGreenLight,
    onPrimary = Color.White,
    secondary = CacaoBrownLight,
    onSecondary = Color.White,
    tertiary = AccentGoldLight,
    onTertiary = DarkForestGreenDark,
    background = DarkForestGreenDark,
    onBackground = Ivory,
    surface = DarkForestGreen,
    onSurface = Ivory
)

@Composable
fun AfrexiaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Force AFREXIA brand colors by default
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> AfrexiaDarkColorScheme
        else -> AfrexiaLightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
