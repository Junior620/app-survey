package com.example.app_survey.ui.traceability

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeviceThermostat
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
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
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant

/**
 * S71 - Post-Récolte (Fermentation, Séchage, Pesée Net)
 *
 * Chronologie complète : Récolte -> Fermentation -> Séchage -> Pesée.
 * Méthodes de fermentation (caisses, bâche, etc.), pesées nettes avec source de pesée,
 * unités (kg, sacs) et statut des opérations en cours.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun S71PostHarvestScreen(
    lot: RecolteLotEntity?,
    onUpdateLot: (RecolteLotEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    if (lot == null) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Veuillez sélectionner un lot dans la liste (S69) pour gérer le Post-Récolte.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        return
    }

    var fermentationMethode by remember(lot) { mutableStateOf(lot.fermentationMethode) }
    var fermentationJours by remember(lot) { mutableStateOf(lot.fermentationDureeJours.toString()) }
    var fermentationStatut by remember(lot) { mutableStateOf(lot.fermentationStatut) }

    var sechageMethode by remember(lot) { mutableStateOf(lot.sechageMethode) }
    var sechageHumidite by remember(lot) { mutableStateOf(lot.sechageHumiditePct.toString()) }
    var sechageStatut by remember(lot) { mutableStateOf(lot.sechageStatut) }

    var peseeSource by remember(lot) { mutableStateOf(lot.peseeSourceDetails) }
    var peseeNetKg by remember(lot) { mutableStateOf(lot.peseeNetKg.toString()) }
    var sacsCount by remember(lot) { mutableStateOf(lot.sacs.toString()) }

    var expandedFermStatut by remember { mutableStateOf(false) }
    var expandedSechStatut by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S71
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "S71 - Post-Récolte & Préparation Qualité",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Lot #${lot.codeLot} | Origines : ${lot.origines}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Visual Stepper Chronologique
        TimelineStepperView(
            fermentationStatut = fermentationStatut,
            sechageStatut = sechageStatut
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Étape 1 : Fermentation
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.DeviceThermostat,
                        contentDescription = "Fermentation",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "1. Méthode & Suivi de Fermentation",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fermentationMethode,
                    onValueChange = { fermentationMethode = it },
                    label = { Text("Méthode de Fermentation") },
                    placeholder = { Text("ex: Caisses en bois, Bâche plastique, Tas sur feuilles...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = fermentationJours,
                        onValueChange = { fermentationJours = it },
                        label = { Text("Durée (Jours)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    ExposedDropdownMenuBox(
                        expanded = expandedFermStatut,
                        onExpandedChange = { expandedFermStatut = !expandedFermStatut },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = fermentationStatut,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Statut Opération") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedFermStatut) },
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )

                        ExposedDropdownMenu(
                            expanded = expandedFermStatut,
                            onDismissRequest = { expandedFermStatut = false }
                        ) {
                            listOf("En cours", "Terminé", "Validé").forEach { st ->
                                DropdownMenuItem(
                                    text = { Text(st) },
                                    onClick = {
                                        fermentationStatut = st
                                        expandedFermStatut = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Étape 2 : Séchage & Humidité
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "2. Séchage & Taux d'Humidité",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = sechageMethode,
                    onValueChange = { sechageMethode = it },
                    label = { Text("Méthode de Séchage") },
                    placeholder = { Text("ex: Claies en bois suspendues, Aires cimentées...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = sechageHumidite,
                        onValueChange = { sechageHumidite = it },
                        label = { Text("Taux d'Humidité (% H2O)") },
                        placeholder = { Text("ex: 7.2") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    ExposedDropdownMenuBox(
                        expanded = expandedSechStatut,
                        onExpandedChange = { expandedSechStatut = !expandedSechStatut },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = sechageStatut,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Statut Séchage") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedSechStatut) },
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )

                        ExposedDropdownMenu(
                            expanded = expandedSechStatut,
                            onDismissRequest = { expandedSechStatut = false }
                        ) {
                            listOf("En cours", "Terminé", "Conforme (< 8%)").forEach { st ->
                                DropdownMenuItem(
                                    text = { Text(st) },
                                    onClick = {
                                        sechageStatut = st
                                        expandedSechStatut = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Étape 3 : Pesées Nettes & Unités
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "3. Pesées Nettes, Unités & Bascule",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = peseeSource,
                    onValueChange = { peseeSource = it },
                    label = { Text("Source & Équipement de Pesée") },
                    placeholder = { Text("ex: Bascule coopérative homologuée, Pèse-sac portable...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = peseeNetKg,
                        onValueChange = { peseeNetKg = it },
                        label = { Text("Poids Net (Kg)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = sacsCount,
                        onValueChange = { sacsCount = it },
                        label = { Text("Nombre de Sacs") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Enregistrer les modifications Post-Récolte
        TerrainButton(
            text = "Enregistrer la Fiche Post-Récolte",
            icon = Icons.Default.CheckCircle,
            onClick = {
                val pNet = peseeNetKg.toDoubleOrNull() ?: lot.quantiteKg
                val nSacs = sacsCount.toIntOrNull() ?: lot.sacs
                val dJours = fermentationJours.toIntOrNull() ?: 6
                val hPct = sechageHumidite.toDoubleOrNull() ?: 7.2

                val updated = lot.copy(
                    fermentation = "$fermentationMethode ($fermentationJours j)",
                    fermentationMethode = fermentationMethode,
                    fermentationDureeJours = dJours,
                    fermentationStatut = fermentationStatut,
                    sechage = sechageMethode,
                    sechageMethode = sechageMethode,
                    sechageHumiditePct = hPct,
                    sechageStatut = sechageStatut,
                    peseeSourceDetails = peseeSource,
                    peseeSource = peseeSource,
                    peseeNetKg = pNet,
                    quantiteKg = pNet,
                    sacs = nSacs
                )
                onUpdateLot(updated)
            },
            variant = TerrainButtonVariant.PRIMARY
        )
    }
}

@Composable
private fun TimelineStepperView(
    fermentationStatut: String,
    sechageStatut: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            StepItem(label = "1. Récolte", statut = "Validé", isDone = true)
            StepDivider()
            StepItem(label = "2. Fermentation", statut = fermentationStatut, isDone = fermentationStatut != "En cours")
            StepDivider()
            StepItem(label = "3. Séchage", statut = sechageStatut, isDone = sechageStatut.contains("Terminé") || sechageStatut.contains("Conforme"))
            StepDivider()
            StepItem(label = "4. Pesée Net", statut = "Prêt", isDone = true)
        }
    }
}

@Composable
private fun StepItem(label: String, statut: String, isDone: Boolean) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(if (isDone) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiaryContainer)
                .padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = statut,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = if (isDone) Color.White else MaterialTheme.colorScheme.onTertiaryContainer
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun StepDivider() {
    Text(
        text = "➔",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}
