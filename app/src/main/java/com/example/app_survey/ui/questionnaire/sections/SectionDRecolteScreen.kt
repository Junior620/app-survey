package com.example.app_survey.ui.questionnaire.sections

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionDRecolteScreen(
    state: QuestionnaireState,
    onAddOrUpdateLot: (RecolteLotEntity) -> Unit,
    onDeleteLot: (String) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddLotDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section D : Récoltes & Lots de Cacao",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Saisie par lot, origines multiples, quantité en kg, fermentation, séchage, pesée et statut logistique ('En transit', 'Magasin', 'Expédié').",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Registre des Lots de Cacao",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${state.recolteLots.size} lot(s) enregistré(s)",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    TerrainButton(
                        text = "+ Lot de Cacao",
                        onClick = { showAddLotDialog = true },
                        variant = TerrainButtonVariant.PRIMARY
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (state.recolteLots.isEmpty()) {
                    Text(
                        text = "Aucun lot enregistré. Cliquez sur '+ Lot de Cacao' pour documenter une pesée ou un lot de livraison.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                } else {
                    state.recolteLots.forEach { lot ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
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
                                            text = "Code Lot : ${lot.codeLot}",
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.titleSmall
                                        )
                                    }

                                    IconButton(onClick = { onDeleteLot(lot.id) }) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Supprimer lot",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = "Origines : ${lot.origines} | Période : ${lot.periode}",
                                    style = MaterialTheme.typography.bodySmall
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Text(
                                        text = "Poids : ${lot.quantiteKg} kg (${lot.sacs} sacs)",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.weight(1f)
                                    )

                                    Text(
                                        text = "Statut : ${lot.statutLogistique}",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = when (lot.statutLogistique) {
                                            StatutLogistique.EN_TRANSIT -> MaterialTheme.colorScheme.tertiary
                                            StatutLogistique.MAGASIN -> MaterialTheme.colorScheme.primary
                                            StatutLogistique.EXPEDIE -> MaterialTheme.colorScheme.secondary
                                        }
                                    )
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Text(
                                    text = "Fermentation : ${lot.fermentation} | Séchage : ${lot.sechage} | Pesée : ${lot.peseeSource}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Navigation
        Row(modifier = Modifier.fillMaxWidth()) {
            TerrainButton(
                text = "Précédent",
                onClick = onPrevious,
                variant = TerrainButtonVariant.SECONDARY,
                modifier = Modifier.weight(1f)
            )

            Spacer(modifier = Modifier.width(12.dp))

            TerrainButton(
                text = "Suivant (Section E - Scolarisation)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }

    if (showAddLotDialog) {
        AddLotModalDialog(
            visiteId = state.visiteId,
            producteurId = state.producteurId,
            onDismiss = { showAddLotDialog = false },
            onConfirm = { newLot ->
                onAddOrUpdateLot(newLot)
                showAddLotDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddLotModalDialog(
    visiteId: String,
    producteurId: String,
    onDismiss: () -> Unit,
    onConfirm: (RecolteLotEntity) -> Unit
) {
    var codeLot by remember { mutableStateOf("LOT-2026-" + System.currentTimeMillis().toString().takeLast(4)) }
    var periode by remember { mutableStateOf("Grande Campagne 2025-2026") }
    var origines by remember { mutableStateOf("Parcelle PLT-001, Parcelle PLT-002") }
    var quantiteKg by remember { mutableStateOf("850") }
    var sacs by remember { mutableStateOf("13") }
    var fermentation by remember { mutableStateOf("Fermenté 6 jours") }
    var sechage by remember { mutableStateOf("Sur claies en bois") }
    var peseeSource by remember { mutableStateOf("Bascule coopérative") }
    var statutLogistique by remember { mutableStateOf(StatutLogistique.EN_TRANSIT) }

    var expandedStatut by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouveau Lot de Cacao Récolté") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                OutlinedTextField(
                    value = codeLot,
                    onValueChange = { codeLot = it },
                    label = { Text("Code du Lot de Cacao") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = origines,
                    onValueChange = { origines = it },
                    label = { Text("Origines multiples (Parcelles d'origine)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = quantiteKg,
                        onValueChange = { quantiteKg = it },
                        label = { Text("Quantité (Kg)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = sacs,
                        onValueChange = { sacs = it },
                        label = { Text("Nombre de Sacs") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                ExposedDropdownMenuBox(
                    expanded = expandedStatut,
                    onExpandedChange = { expandedStatut = !expandedStatut }
                ) {
                    OutlinedTextField(
                        value = when (statutLogistique) {
                            StatutLogistique.EN_TRANSIT -> "En Transit"
                            StatutLogistique.MAGASIN -> "Au Magasin Coopérative"
                            StatutLogistique.EXPEDIE -> "Expédié / Vendu"
                        },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Statut Logistique") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedStatut) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )

                    ExposedDropdownMenu(
                        expanded = expandedStatut,
                        onDismissRequest = { expandedStatut = false }
                    ) {
                        StatutLogistique.entries.forEach { st ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        when (st) {
                                            StatutLogistique.EN_TRANSIT -> "En Transit"
                                            StatutLogistique.MAGASIN -> "Au Magasin Coopérative"
                                            StatutLogistique.EXPEDIE -> "Expédié / Vendu"
                                        }
                                    )
                                },
                                onClick = {
                                    statutLogistique = st
                                    expandedStatut = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = fermentation,
                    onValueChange = { fermentation = it },
                    label = { Text("Qualité Fermentation") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = sechage,
                    onValueChange = { sechage = it },
                    label = { Text("Méthode de Séchage") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = peseeSource,
                    onValueChange = { peseeSource = it },
                    label = { Text("Source de Pesée") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val qKg = quantiteKg.toDoubleOrNull() ?: 0.0
                    val nSacs = sacs.toIntOrNull() ?: 0

                    val lot = RecolteLotEntity(
                        id = "LOT-" + System.currentTimeMillis().toString().takeLast(5),
                        visiteId = visiteId,
                        producteurId = producteurId,
                        codeLot = codeLot,
                        periode = periode,
                        origines = origines,
                        quantiteKg = qKg,
                        fermentation = fermentation,
                        sechage = sechage,
                        sacs = nSacs,
                        peseeSource = peseeSource,
                        statutLogistique = statutLogistique
                    )
                    onConfirm(lot)
                }
            ) {
                Text("Enregistrer le Lot")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
