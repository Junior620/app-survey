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
import androidx.compose.material.icons.filled.AccountTree
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FolderZip
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant

/**
 * S70 - Détail du Lot de Cacao
 *
 * Affichage des origines multiples (producteurs/parcelles),
 * contributions (kg et %), arborescence de mélange/fractionnement,
 * liens vers parcelles et documents/bordereaux joints.
 */
@Composable
fun S70LotDetailScreen(
    lot: RecolteLotEntity?,
    onUpdateLot: (RecolteLotEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddDocDialog by remember { mutableStateOf(false) }

    if (lot == null) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "Veuillez sélectionner un lot dans la liste (S69) pour afficher les détails.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        return
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S70
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "S70 - Détail du Lot : ${lot.codeLot}",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Campagne : ${lot.campagne} | Période : ${lot.periode}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    StatutLogistiqueBadge(statut = lot.statutLogistique)
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "Poids Net Total", style = MaterialTheme.typography.labelSmall)
                        Text(
                            text = "${lot.quantiteKg} Kg",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "Sacs Standard", style = MaterialTheme.typography.labelSmall)
                        Text(
                            text = "${lot.sacs} Sacs",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "Bordereau", style = MaterialTheme.typography.labelSmall)
                        Text(
                            text = lot.mouvementBordereau,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section 1 : Origines Multiples & Contributions (Kg et %)
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Landscape,
                        contentDescription = "Origines",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Origines Multiples & Contributions (Kg et %)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Parsing / Affichage des contributions
                val contributionsList = parseContributions(lot.contributionsDetail, lot.origines, lot.quantiteKg)

                contributionsList.forEachIndexed { index, contrib ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = contrib.producteurEtParcelle,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "Contribution mesurée à la pesée",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${contrib.poidsKg} Kg",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(MaterialTheme.colorScheme.primaryContainer)
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "${contrib.pourcentage}%",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section 2 : Arborescence de Mélange / Fractionnement
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AccountTree,
                        contentDescription = "Arborescence",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Arborescence de Mélange & Fractionnement",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Diagramme Visuel d'Arborescence
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Lot Parent
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "MÉLANGE PARENT :",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = lot.parentLotCode ?: "Lot Natif (Pas de mélange parent)",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        androidx.compose.material3.HorizontalDivider()
                        Spacer(modifier = Modifier.height(8.dp))

                        // Lot Actuel
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.LocalShipping,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "LOT ACTUEL : ${lot.codeLot} (${lot.quantiteKg} Kg)",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        androidx.compose.material3.HorizontalDivider()
                        Spacer(modifier = Modifier.height(8.dp))

                        // Sous-Lots / Fractionnement
                        Text(
                            text = "FRACTIONNEMENT / SOUS-LOTS :",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = if (lot.childLotsCodes.isNotBlank()) lot.childLotsCodes else "Aucun sous-lot fractionné",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section 3 : Liens vers Parcelles & Documents / Bordereaux Joints
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.FolderZip,
                            contentDescription = "Documents",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Parcelles Liées & Bordereaux Joints",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    TextButton(onClick = { showAddDocDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Text("Ajouter Doc")
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Liens Parcelles
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Map,
                        contentDescription = "GPS",
                        tint = MaterialTheme.colorScheme.secondary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Parcelles vérifiées GPS : ${lot.origines}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Documents joints list
                val docsList = parseDocuments(lot.documentsJoints)

                docsList.forEach { doc ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Description,
                                contentDescription = "PDF",
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = doc,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    text = "Document numérisé & horodaté",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddDocDialog) {
        var docName by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showAddDocDialog = false },
            title = { Text("Ajouter un Document / Bordereau") },
            text = {
                Column {
                    OutlinedTextField(
                        value = docName,
                        onValueChange = { docName = it },
                        label = { Text("Nom du bordereau / document") },
                        placeholder = { Text("ex: Bordereau #BL-2026-199.pdf") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (docName.isNotBlank()) {
                            val updatedDocs = if (lot.documentsJoints.isBlank()) docName else "${lot.documentsJoints}, $docName"
                            onUpdateLot(lot.copy(documentsJoints = updatedDocs))
                        }
                        showAddDocDialog = false
                    }
                ) {
                    Text("Ajouter")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDocDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
}

private data class ContributionItem(
    val producteurEtParcelle: String,
    val poidsKg: Double,
    val pourcentage: Double
)

private fun parseContributions(detailText: String, originesDefault: String, totalKg: Double): List<ContributionItem> {
    if (detailText.isNotBlank() && detailText.contains("|")) {
        return detailText.split("|").map { part ->
            val clean = part.trim()
            val name = clean.substringBefore(":").ifBlank { originesDefault }
            val kgStr = clean.substringAfter(":").substringBefore("kg").trim()
            val kg = kgStr.toDoubleOrNull() ?: (totalKg / 2)
            val pct = if (totalKg > 0) ((kg / totalKg) * 100).let { Math.round(it * 10) / 10.0 } else 50.0
            ContributionItem(name, kg, pct)
        }
    } else {
        return listOf(
            ContributionItem(
                producteurEtParcelle = if (originesDefault.isNotBlank()) originesDefault else "Producteur Principal (Parcelle PLT-001)",
                poidsKg = totalKg,
                pourcentage = 100.0
            )
        )
    }
}

private fun parseDocuments(docsText: String): List<String> {
    if (docsText.isNotBlank()) {
        return docsText.split(",").map { it.trim() }
    }
    return listOf("Bordereau de livraison #BL-2026-088.pdf", "Certificat de Durabilité & Origine.pdf")
}
