package com.example.app_survey.ui.observation

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Handshake
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.SupportAgent
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
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant

/**
 * S74 - Prévention, Sensibilisation & Canaux de Signalement
 *
 * Formations reçues par le producteur, besoins de sensibilisation identifiés,
 * engagements pris et canaux de signalement effectivement disponibles sur le terrain.
 */
@Composable
fun S74PreventionScreen(
    prevention: PreventionEntity?,
    onSavePrevention: (PreventionEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    val prev = prevention ?: PreventionEntity(
        id = "PREV-" + System.currentTimeMillis().toString().takeLast(6),
        visiteId = "V-2026-NEW",
        producteurId = "P-101",
        formationsRecues = "EPI, Droits de l'Enfant",
        canauxSignalement = "Hotline COOP 0800-22-22, Délégué Section",
        visitesSuivi = 1
    )

    var formationsRecues by remember(prev) { mutableStateOf(prev.formationsRecues) }
    var organismesFormateurs by remember(prev) { mutableStateOf(prev.organismesFormateurs) }
    var dateDerniereFormation by remember(prev) { mutableStateOf(prev.dateDerniereFormation) }
    var visitesSuiviCount by remember(prev) { mutableStateOf(prev.visitesSuivi.toString()) }

    var besoinsSensibilisation by remember(prev) { mutableStateOf(prev.besoinsSensibilisation) }
    var engagementsPris by remember(prev) { mutableStateOf(prev.engagementsPris) }
    var canauxSignalement by remember(prev) { mutableStateOf(prev.canauxSignalement) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S74
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "S74 - Prévention, Formations & Accompagnement",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Documenter les formations reçues, les besoins ciblés, les engagements du planteur et les canaux de recours effectifs.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Formations Reçues & Suivi
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.HealthAndSafety,
                        contentDescription = "Formations",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "1. Formations Reçues par le Producteur",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = formationsRecues,
                    onValueChange = { formationsRecues = it },
                    label = { Text("Thèmes des Formations Reçues") },
                    placeholder = { Text("ex: Utilisation des EPI, Droits de l'Enfant, Bonnes Pratiques Agricoles...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = organismesFormateurs,
                        onValueChange = { organismesFormateurs = it },
                        label = { Text("Organisme Formateur") },
                        placeholder = { Text("ex: COOP-AFREXIA / SOCODEVI") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = dateDerniereFormation,
                        onValueChange = { dateDerniereFormation = it },
                        label = { Text("Date Dernière Formation") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = visitesSuiviCount,
                    onValueChange = { visitesSuiviCount = it },
                    label = { Text("Nombre de Visites de Suivi Réalisées (12 mois)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Besoins de Sensibilisation Identifiés
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Campaign,
                        contentDescription = "Besoins",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "2. Besoins de Sensibilisation Identifiés",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = besoinsSensibilisation,
                    onValueChange = { besoinsSensibilisation = it },
                    label = { Text("Besoins prioritaires en sensibilisation & équipement") },
                    placeholder = { Text("ex: Kits scolaires, Équipement de Protection Individuelle (EPI), Formation phytosanitaire...") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Engagements Pris par le Producteur
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Handshake,
                        contentDescription = "Engagements",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "3. Engagements Pris par le Planteur",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = engagementsPris,
                    onValueChange = { engagementsPris = it },
                    label = { Text("Engagements formels souscrits lors de l'entretien") },
                    placeholder = { Text("ex: Port de bottes et gants; Garantie de la fréquentation scolaire continue de ses enfants.") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Canaux de Signalement Effectivement Disponibles
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.SupportAgent,
                        contentDescription = "Canaux",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "4. Canaux de Signalement Effectifs au Village",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = canauxSignalement,
                    onValueChange = { canauxSignalement = it },
                    label = { Text("Canaux de recours connus et réellement opérationnels sur le terrain") },
                    placeholder = { Text("ex: Hotline gratuite COOP 0800-22-22, Délégué de Section Soubré, Comité Villageois ANEPJ, Agent CDC...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                ) {
                    Text(
                        text = "Remarque Terrain : Vérifier que le producteur possède le numéro de la hotline ou connaît la personne ressource du village.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Enregistrer
        TerrainButton(
            text = "Enregistrer la Fiche de Prévention S74",
            icon = Icons.Default.Save,
            onClick = {
                val vSuivi = visitesSuiviCount.toIntOrNull() ?: 1
                val updatedPrev = prev.copy(
                    formationsRecues = formationsRecues,
                    organismesFormateurs = organismesFormateurs,
                    dateDerniereFormation = dateDerniereFormation,
                    visitesSuivi = vSuivi,
                    besoinsSensibilisation = besoinsSensibilisation,
                    engagementsPris = engagementsPris,
                    canauxSignalement = canauxSignalement
                )
                onSavePrevention(updatedPrev)
            },
            variant = TerrainButtonVariant.PRIMARY
        )
    }
}
