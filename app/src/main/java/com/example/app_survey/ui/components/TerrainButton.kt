package com.example.app_survey.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.app_survey.ui.theme.CacaoBrown
import com.example.app_survey.ui.theme.DarkForestGreen
import com.example.app_survey.ui.theme.StatusCritique

enum class TerrainButtonVariant {
    PRIMARY,
    SECONDARY,
    OUTLINED,
    DANGER
}

/**
 * Bouton ergonomique adapté aux conditions de terrain (hauteur min 52dp, grande zone tactile, contraste fort).
 */
@Composable
fun TerrainButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    variant: TerrainButtonVariant = TerrainButtonVariant.PRIMARY,
    enabled: Boolean = true
) {
    val minHeight = 54.dp
    val shape = RoundedCornerShape(12.dp)

    when (variant) {
        TerrainButtonVariant.PRIMARY -> {
            Button(
                onClick = onClick,
                enabled = enabled,
                shape = shape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = DarkForestGreen,
                    contentColor = Color.White
                ),
                modifier = modifier
                    .fillMaxWidth()
                    .heightIn(min = minHeight)
            ) {
                ButtonContent(icon = icon, text = text)
            }
        }
        TerrainButtonVariant.SECONDARY -> {
            Button(
                onClick = onClick,
                enabled = enabled,
                shape = shape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = CacaoBrown,
                    contentColor = Color.White
                ),
                modifier = modifier
                    .fillMaxWidth()
                    .heightIn(min = minHeight)
            ) {
                ButtonContent(icon = icon, text = text)
            }
        }
        TerrainButtonVariant.OUTLINED -> {
            OutlinedButton(
                onClick = onClick,
                enabled = enabled,
                shape = shape,
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = DarkForestGreen
                ),
                modifier = modifier
                    .fillMaxWidth()
                    .heightIn(min = minHeight)
            ) {
                ButtonContent(icon = icon, text = text)
            }
        }
        TerrainButtonVariant.DANGER -> {
            Button(
                onClick = onClick,
                enabled = enabled,
                shape = shape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = StatusCritique,
                    contentColor = Color.White
                ),
                modifier = modifier
                    .fillMaxWidth()
                    .heightIn(min = minHeight)
            ) {
                ButtonContent(icon = icon, text = text)
            }
        }
    }
}

@Composable
private fun ButtonContent(icon: ImageVector?, text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.padding(end = 8.dp)
            )
        }
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
        )
    }
}
