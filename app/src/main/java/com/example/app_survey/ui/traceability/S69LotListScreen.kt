package com.example.app_survey.ui.traceability

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant

/**
 * S69 - Liste des Lots de Cacao
 *
 * RÈGLE STRICTE RESPECTÉE :
 * AUCUNE information de protection de l'enfant dans les cartes de lots.
 * Seules les données physiques, géographiques et logistiques du cacao sont présentées.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun S69LotListScreen(
    state: TraceabilityUiState,
    onSearchQueryChange: (String) -> Unit,
    onCampagneChange: (String) -> Unit,
    onStatutLogistiqueChange: (StatutLogistique?) -> Unit,
    onSelectLot: (RecolteLotEntity) -> Unit,
    onAddNewLot: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expandedCampagne by remember { mutableStateOf(false) }

    // Filtrage des lots
    val filteredLots = remember(state.lots, state.searchQuery, state.selectedCampagne, state.selectedStatutLogistique) {
        state.lots.filter { lot ->
            val matchesQuery = state.searchQuery.isBlank() ||
                    lot.codeLot.contains(state.searchQuery, ignoreCase = true) ||
                    lot.origines.contains(state.searchQuery, ignoreCase = true) ||
                    lot.mouvementBordereau.contains(state.searchQuery, ignoreCase = true)

            val matchesCampagne = state.selectedCampagne == "Toutes" || lot.campagne.equals(state.selectedCampagne, ignoreCase = true)

            val matchesStatut = state.selectedStatutLogistique == null || lot.statutLogistique == state.selectedStatutLogistique

            matchesQuery && matchesCampagne && matchesStatut
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S69
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "S69 - Registre des Lots de Cacao",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Recherche par code, filtres par campagne, origines et statut logistique.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            TerrainButton(
                text = "+ Nouveau Lot",
                onClick = onAddNewLot,
                icon = Icons.Default.Add,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.width(160.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Barre de Recherche par code lot / origines
        OutlinedTextField(
            value = state.searchQuery,
            onValueChange = onSearchQueryChange,
            placeholder = { Text("Rechercher par Code Lot, Origine ou Bordereau...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Recherche") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Filtres : Campagne & Statut Logistique
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Dropdown Campagne
            ExposedDropdownMenuBox(
                expanded = expandedCampagne,
                onExpandedChange = { expandedCampagne = !expandedCampagne },
                modifier = Modifier.weight(1f)
            ) {
                OutlinedTextField(
                    value = "Campagne : ${state.selectedCampagne}",
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedCampagne) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyMedium
                )

                ExposedDropdownMenu(
                    expanded = expandedCampagne,
                    onDismissRequest = { expandedCampagne = false }
                ) {
                    listOf("Toutes", "Grande Campagne 2025-2026", "Petite Campagne 2026").forEach { camp ->
                        DropdownMenuItem(
                            text = { Text(camp) },
                            onClick = {
                                onCampagneChange(camp)
                                expandedCampagne = false
                            }
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Chips Filtres Statut Logistique
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.FilterList,
                contentDescription = "Filtres",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(end = 4.dp)
            )

            FilterChip(
                selected = state.selectedStatutLogistique == null,
                onClick = { onStatutLogistiqueChange(null) },
                label = { Text("Tous les Statuts (${state.lots.size})") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )

            FilterChip(
                selected = state.selectedStatutLogistique == StatutLogistique.EN_TRANSIT,
                onClick = { onStatutLogistiqueChange(StatutLogistique.EN_TRANSIT) },
                label = { Text("En Transit") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.tertiary,
                    selectedLabelColor = MaterialTheme.colorScheme.onTertiary
                )
            )

            FilterChip(
                selected = state.selectedStatutLogistique == StatutLogistique.MAGASIN,
                onClick = { onStatutLogistiqueChange(StatutLogistique.MAGASIN) },
                label = { Text("Au Magasin") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                )
            )

            FilterChip(
                selected = state.selectedStatutLogistique == StatutLogistique.EXPEDIE,
                onClick = { onStatutLogistiqueChange(StatutLogistique.EXPEDIE) },
                label = { Text("Expédié") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.secondary,
                    selectedLabelColor = MaterialTheme.colorScheme.onSecondary
                )
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Compteur & Résultat
        Text(
            text = "${filteredLots.size} lot(s) trouvé(s)",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (filteredLots.isEmpty()) {
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Aucun lot de cacao ne correspond aux critères de recherche actuels.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 12.dp)
                )
            }
        } else {
            filteredLots.forEach { lot ->
                LotCardItem(
                    lot = lot,
                    isSelected = state.selectedLot?.id == lot.id,
                    onClick = { onSelectLot(lot) }
                )
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}

/**
 * Carte de Lot S69 (Strictement réservée à la traçabilité physique & logistique)
 */
@Composable
private fun LotCardItem(
    lot: RecolteLotEntity,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant

    AfrexiaCard(
        borderColor = borderColor,
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocalShipping,
                        contentDescription = "Lot",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = lot.codeLot,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                // Badge Statut Logistique
                StatutLogistiqueBadge(statut = lot.statutLogistique)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Information de campagne & origines
            Text(
                text = "Campagne : ${lot.campagne}",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.secondary
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "Origines : ${lot.origines}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Totaux Poids & Sacs
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Poids Net : ${lot.quantiteKg} Kg",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "${lot.sacs} Sacs standard | ${lot.peseeSource}",
                        style = MaterialTheme.typography.labelSmall
                    )
                }

                Text(
                    text = "Bordereau : ${lot.mouvementBordereau}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Fermentation : ${lot.fermentation}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Séchage : ${lot.sechage}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun StatutLogistiqueBadge(statut: StatutLogistique) {
    val (bgColor, textColor, label) = when (statut) {
        StatutLogistique.EN_TRANSIT -> Triple(
            MaterialTheme.colorScheme.tertiaryContainer,
            MaterialTheme.colorScheme.onTertiaryContainer,
            "En Transit"
        )
        StatutLogistique.MAGASIN -> Triple(
            MaterialTheme.colorScheme.primaryContainer,
            MaterialTheme.colorScheme.onPrimaryContainer,
            "Au Magasin"
        )
        StatutLogistique.EXPEDIE -> Triple(
            MaterialTheme.colorScheme.secondaryContainer,
            MaterialTheme.colorScheme.onSecondaryContainer,
            "Expédié"
        )
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = textColor
        )
    }
}
