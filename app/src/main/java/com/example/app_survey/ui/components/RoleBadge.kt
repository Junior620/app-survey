package com.example.app_survey.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.SupervisorAccount
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.RoleUtilisateur

@Composable
fun RoleBadge(
    currentRole: RoleUtilisateur,
    onRoleToggle: (RoleUtilisateur) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        FilterChip(
            selected = currentRole == RoleUtilisateur.CDC,
            onClick = { onRoleToggle(RoleUtilisateur.CDC) },
            label = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "CDC Role",
                        modifier = Modifier.padding(end = 4.dp)
                    )
                    Text("CDC (Agent Terrain)", fontWeight = FontWeight.Medium)
                }
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer
            )
        )

        Spacer(modifier = Modifier.width(8.dp))

        FilterChip(
            selected = currentRole == RoleUtilisateur.RESPONSABLE_DURABILITE,
            onClick = { onRoleToggle(RoleUtilisateur.RESPONSABLE_DURABILITE) },
            label = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.SupervisorAccount,
                        contentDescription = "Durabilité Role",
                        modifier = Modifier.padding(end = 4.dp)
                    )
                    Text("Durabilité (Complet)", fontWeight = FontWeight.Medium)
                }
            },
            colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = MaterialTheme.colorScheme.tertiaryContainer,
                selectedLabelColor = MaterialTheme.colorScheme.onTertiaryContainer
            )
        )
    }
}
