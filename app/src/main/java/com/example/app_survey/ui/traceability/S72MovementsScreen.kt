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
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * S72 - Mouvements de Lots (Expédition & Réception)
 *
 * Acteurs (collecteur, transporteur, réceptionnaire), lieux d'origine et destination,
 * bordereaux de livraison et gestion explicite du statut 'En transit'
 * (une réception non effectuée est 'En transit', pas une erreur de date).
 */
@Composable
fun S72MovementsScreen(
    lot: RecolteLotEntity?,
    onConfirmReception: (RecolteLotEntity, String) -> Unit,
    onSaveLot: (RecolteLotEntity) -> Unit,
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
                text = "Veuillez sélectionner un lot dans la liste (S69) pour gérer les Mouvements.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
        return
    }

    var collecteur by remember(lot) { mutableStateOf(lot.mouvementCollecteur) }
    var transporteur by remember(lot) { mutableStateOf(lot.mouvementTransporteur) }
    var receptionnaire by remember(lot) { mutableStateOf(lot.mouvementReceptionnaire) }

    var lieuOrigine by remember(lot) { mutableStateOf(lot.mouvementLieuOrigine) }
    var lieuDestination by remember(lot) { mutableStateOf(lot.mouvementLieuDestination) }

    var bordereau by remember(lot) { mutableStateOf(lot.mouvementBordereau) }
    var dateExpedition by remember(lot) { mutableStateOf(lot.mouvementDateExpedition) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S72
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "S72 - Mouvements & Expéditions",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Code Lot : ${lot.codeLot} | Poids : ${lot.quantiteKg} Kg",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    StatutLogistiqueBadge(statut = lot.statutLogistique)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Banner Explicite Règle 'En Transit'
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f)),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Info,
                    contentDescription = "Info Règle",
                    tint = MaterialTheme.colorScheme.onTertiaryContainer
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "Règle de Gestion Logistique AFREXIA : Status 'En Transit'",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                    Text(
                        text = "Une expédition dont la réception n'a pas encore été confirmée au magasin est statutairement 'EN TRANSIT'. Il ne s'agit pas d'une erreur de date ou de saisie.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Acteurs du Mouvement
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Badge,
                        contentDescription = "Acteurs",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Acteurs Logistiques de la Chaîne",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = collecteur,
                    onValueChange = { collecteur = it },
                    label = { Text("Collecteur / Agent d'Origine") },
                    placeholder = { Text("ex: Agent Collecte Coulibaly") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = transporteur,
                    onValueChange = { transporteur = it },
                    label = { Text("Transporteur & Véhicule") },
                    placeholder = { Text("ex: Transports Cacao CI (Camion CI-4491-BG)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = receptionnaire,
                    onValueChange = { receptionnaire = it },
                    label = { Text("Réceptionnaire / Magasinier Cible") },
                    placeholder = { Text("ex: Magasinier Bamba Yao") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Lieux Origine & Destination
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Lieux",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Lieux d'Origine & Destination",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = lieuOrigine,
                    onValueChange = { lieuOrigine = it },
                    label = { Text("Lieu d'Origine / Point de Chargement") },
                    placeholder = { Text("ex: Soubré - Secteur Nord / Champ") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = lieuDestination,
                    onValueChange = { lieuDestination = it },
                    label = { Text("Lieu de Destination / Magasin Récepteur") },
                    placeholder = { Text("ex: Magasin Central COOP Soubré") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Bordereau de Livraison & Horodatage
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ReceiptLong,
                        contentDescription = "Bordereau",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Bordereau de Livraison & Horodatage",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = bordereau,
                    onValueChange = { bordereau = it },
                    label = { Text("Numéro de Bordereau de Livraison") },
                    placeholder = { Text("ex: BL-2026-088") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = dateExpedition,
                    onValueChange = { dateExpedition = it },
                    label = { Text("Date & Heure d'Expédition") },
                    placeholder = { Text("ex: 2026-09-08 08:30") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Date de Réception effective : ${lot.mouvementDateReception ?: "En attente de confirmation au magasin"}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = if (lot.mouvementDateReception != null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.tertiary
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Boutons d'Action
        if (lot.statutLogistique == StatutLogistique.EN_TRANSIT) {
            TerrainButton(
                text = "Valider la Réception au Magasin (Clôturer le Transit)",
                icon = Icons.Default.CheckCircle,
                onClick = {
                    val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.FRANCE)
                    val nowStr = sdf.format(Date())
                    onConfirmReception(
                        lot.copy(
                            mouvementCollecteur = collecteur,
                            mouvementTransporteur = transporteur,
                            mouvementReceptionnaire = receptionnaire,
                            mouvementLieuOrigine = lieuOrigine,
                            mouvementLieuDestination = lieuDestination,
                            mouvementBordereau = bordereau,
                            mouvementDateExpedition = dateExpedition
                        ),
                        nowStr
                    )
                },
                variant = TerrainButtonVariant.PRIMARY
            )

            Spacer(modifier = Modifier.height(8.dp))
        }

        TerrainButton(
            text = "Sauvegarder les Données du Mouvement",
            icon = Icons.Default.LocalShipping,
            onClick = {
                val updated = lot.copy(
                    mouvementCollecteur = collecteur,
                    mouvementTransporteur = transporteur,
                    mouvementReceptionnaire = receptionnaire,
                    mouvementLieuOrigine = lieuOrigine,
                    mouvementLieuDestination = lieuDestination,
                    mouvementBordereau = bordereau,
                    mouvementDateExpedition = dateExpedition
                )
                onSaveLot(updated)
            },
            variant = TerrainButtonVariant.SECONDARY
        )
    }
}
