package com.example.app_survey.ui.observation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.filled.AssignmentInd
import androidx.compose.material.icons.filled.ChildCare
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant

/**
 * S73 - Observations Directes sur le Terrain
 *
 * Faits datés et attribués par personne/identifiant provisoire,
 * source (déclaration vs constat direct par l'agent),
 * enfants vus sur parcelle, charges/outils vus.
 * Prise en compte du protocole pour enfant de moins de 5 ans ou d'âge incertain.
 */
@Composable
fun S73FieldObservationScreen(
    observation: ObservationTerrainEntity?,
    onSaveObservation: (ObservationTerrainEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    val obs = observation ?: ObservationTerrainEntity(
        id = "OBS-" + System.currentTimeMillis().toString().takeLast(6),
        visiteId = "V-2026-NEW",
        personneId = "P-101",
        date = "2026-09-09",
        auteur = "Agent CDC Traoré",
        enfantsVus = 0,
        tachesVues = "",
        outilsVus = "",
        produitsVus = "",
        contradictionsDeclarations = false,
        signalementJeuneEnfant = false
    )

    var identifiantProvisoire by remember(obs) { mutableStateOf(obs.identifiantProvisoire) }
    var sourceObservation by remember(obs) { mutableStateOf(obs.sourceObservation) } // "CONSTAT_DIRECT" vs "DECLARATION"
    var dateObservation by remember(obs) { mutableStateOf(obs.date) }
    var auteurAgent by remember(obs) { mutableStateOf(obs.auteur) }

    var enfantsVusCount by remember(obs) { mutableStateOf(obs.enfantsVus.toString()) }
    var tachesVues by remember(obs) { mutableStateOf(obs.tachesVues) }
    var outilsVus by remember(obs) { mutableStateOf(obs.outilsVus) }
    var chargesVues by remember(obs) { mutableStateOf(obs.chargesVues) }
    var produitsVus by remember(obs) { mutableStateOf(obs.produitsVus) }

    var contradictions by remember(obs) { mutableStateOf(obs.contradictionsDeclarations) }
    var signalementJeuneEnfant by remember(obs) { mutableStateOf(obs.signalementJeuneEnfant) }
    var protocoleApplique by remember(obs) { mutableStateOf(obs.protocoleJeuneEnfantApplique) }
    var details by remember(obs) { mutableStateOf(obs.detailsObservation) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // En-tête S73
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "S73 - Observation Terrain & Fait Daté",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Consigner des faits observés de visu sur la parcelle, attribués par personne / identifiant provisoire.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Attribution & Source de l'observation
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.AssignmentInd,
                        contentDescription = "Identifiant",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Attribution & Source de l'Observation",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = identifiantProvisoire,
                        onValueChange = { identifiantProvisoire = it },
                        label = { Text("Identifiant Provisoire Personne") },
                        placeholder = { Text("ex: IND-2026-04") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = dateObservation,
                        onValueChange = { dateObservation = it },
                        label = { Text("Date de Constat") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = auteurAgent,
                    onValueChange = { auteurAgent = it },
                    label = { Text("Agent Observateur (Auteur)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Distinction Source : Déclaration vs Constat Direct
                Text(
                    text = "Origine du fait consigné (Source) :",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary
                )

                Spacer(modifier = Modifier.height(6.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = sourceObservation == "CONSTAT_DIRECT",
                        onClick = { sourceObservation = "CONSTAT_DIRECT" },
                        label = { Text("Constat Direct (Vu De Visu)") },
                        leadingIcon = { Icon(Icons.Default.Visibility, contentDescription = null) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                        )
                    )

                    FilterChip(
                        selected = sourceObservation == "DECLARATION",
                        onClick = { sourceObservation = "DECLARATION" },
                        label = { Text("Déclaration Producteur") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.secondary,
                            selectedLabelColor = MaterialTheme.colorScheme.onSecondary
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Constats Physiques & Éléments Vus
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.ChildCare,
                        contentDescription = "Constats",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Éléments et Enfants Observés de Visu",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = enfantsVusCount,
                    onValueChange = { enfantsVusCount = it },
                    label = { Text("Nombre d'enfants VUS DIRECTEMENT sur la parcelle") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = tachesVues,
                    onValueChange = { tachesVues = it },
                    label = { Text("Tâches observées en cours d'exécution") },
                    placeholder = { Text("ex: Ramassage des cabosses, écabossage, désherbage...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = outilsVus,
                    onValueChange = { outilsVus = it },
                    label = { Text("Outils dangereux vus ou manipulés") },
                    placeholder = { Text("ex: Machettes posées au sol, pulvérisateur...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = chargesVues,
                    onValueChange = { chargesVues = it },
                    label = { Text("Charges / Fardeaux lourds observés") },
                    placeholder = { Text("ex: Sacs de cacao de ~20kg portés par un adolescent") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = produitsVus,
                    onValueChange = { produitsVus = it },
                    label = { Text("Produits phytosanitaires / pesticides vus") },
                    placeholder = { Text("ex: Emballages de fétis, bidons chimiques à proximité") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = details,
                    onValueChange = { details = it },
                    label = { Text("Détails circonstanciés du fait observé") },
                    placeholder = { Text("ex: Fait observé à 10h15 sous fort ensoleillement en présence du tuteur.") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Contradictions & Protocole Enfant < 5 ans
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Contradictions & Protocole Jeune Enfant (< 5 ans)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = contradictions,
                        onCheckedChange = { contradictions = it }
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "CONTRADICTION majeure notée entre les Déclarations du planteur et vos Observations de visu",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Card Alerte Protocole Jeune Enfant
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (signalementJeuneEnfant) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    border = BorderStroke(
                        width = if (signalementJeuneEnfant) 2.dp else 1.dp,
                        color = if (signalementJeuneEnfant) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = signalementJeuneEnfant,
                                onCheckedChange = { isChecked ->
                                    signalementJeuneEnfant = isChecked
                                    if (isChecked) protocoleApplique = true
                                }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "SIGNALEMENT PROTOCOLE : Présence d'un enfant de moins de 5 ans ou d'âge incertain exposé sur la parcelle.",
                                fontWeight = FontWeight.Bold,
                                color = if (signalementJeuneEnfant) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                            )
                        }

                        AnimatedVisibility(visible = signalementJeuneEnfant) {
                            Column(modifier = Modifier.padding(top = 8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Urgence",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Directives de Protection Immédiate pour Jeune Enfant :",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                                Text(
                                    text = "1. Demander poliment au planteur/parent d'éloigner le jeune enfant de la zone de danger ou d'outils.\n" +
                                            "2. Ne pas entrer en confrontation directe.\n" +
                                            "3. Transmettre la fiche au délégué de section et au comité de protection du village.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(
                                        checked = protocoleApplique,
                                        onCheckedChange = { protocoleApplique = it }
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Protocole de sensibilisation sans confrontation APPLIQUÉ sur le terrain",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.labelMedium
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Bouton Sauvegarder
        TerrainButton(
            text = "Enregistrer la Fiche d'Observation S73",
            icon = Icons.Default.Save,
            onClick = {
                val eCount = enfantsVusCount.toIntOrNull() ?: 0
                val updatedObs = obs.copy(
                    identifiantProvisoire = identifiantProvisoire,
                    sourceObservation = sourceObservation,
                    date = dateObservation,
                    auteur = auteurAgent,
                    enfantsVus = eCount,
                    tachesVues = tachesVues,
                    outilsVus = outilsVus,
                    chargesVues = chargesVues,
                    produitsVus = produitsVus,
                    contradictionsDeclarations = contradictions,
                    signalementJeuneEnfant = signalementJeuneEnfant,
                    protocoleJeuneEnfantApplique = protocoleApplique,
                    detailsObservation = details
                )
                onSaveObservation(updatedObs)
            },
            variant = TerrainButtonVariant.PRIMARY
        )
    }
}
