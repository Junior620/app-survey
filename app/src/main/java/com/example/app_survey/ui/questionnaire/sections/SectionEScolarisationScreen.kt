package com.example.app_survey.ui.questionnaire.sections

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
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionEScolarisationScreen(
    state: QuestionnaireState,
    onUpdateScolarisation: (ScolarisationEntity) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Filtrer les enfants du ménage âgés de 5 à 17 ans
    val eligibleChildren = remember(state.enfants) {
        state.enfants.filter { it.ageEstime in 5..17 }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section E : Scolarisation des Enfants (5-17 ans)",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Saisie par enfant du ménage (5 à 17 ans), statut d'inscription, absentéisme sur les 30 derniers jours et motifs.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (eligibleChildren.isEmpty()) {
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Aucun enfant de 5 à 17 ans dans le ménage",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Les membres enregistrés en Section B ont tous moins de 5 ans ou plus de 17 ans. Vous pouvez passer à la section suivante.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        } else {
            eligibleChildren.forEach { enfant ->
                val scol = state.scolarisations.find { it.enfantId == enfant.id } ?: ScolarisationEntity(
                    id = "SCOL-" + enfant.id,
                    visiteId = state.visiteId,
                    producteurId = state.producteurId,
                    enfantId = enfant.id,
                    nomEnfant = enfant.nom,
                    age = enfant.ageEstime,
                    lien = enfant.lienParente,
                    inscrit = true,
                    frequentation = "REGULIERE",
                    absences30j = 0,
                    motifs = ""
                )

                ScolarisationCard(
                    scolarisation = scol,
                    enfantNom = enfant.nom,
                    enfantAge = enfant.ageEstime,
                    onUpdate = onUpdateScolarisation,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
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
                text = "Suivant (Section F - Activités)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScolarisationCard(
    scolarisation: ScolarisationEntity,
    enfantNom: String,
    enfantAge: Int,
    onUpdate: (ScolarisationEntity) -> Unit,
    modifier: Modifier = Modifier
) {
    var expandedFreq by remember { mutableStateOf(false) }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (scolarisation.inscrit) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f) else MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.School,
                    contentDescription = "École",
                    tint = if (scolarisation.inscrit) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "$enfantNom ($enfantAge ans)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Checkbox Inscription scolaire
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = scolarisation.inscrit,
                    onCheckedChange = { isChecked ->
                        onUpdate(scolarisation.copy(inscrit = isChecked))
                    }
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (scolarisation.inscrit) "Enfant actuellement inscrit à l'école" else "Enfant NON INSCRIT à l'école",
                    fontWeight = FontWeight.Bold,
                    color = if (scolarisation.inscrit) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (scolarisation.inscrit) {
                // Fréquentation Dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedFreq,
                    onExpandedChange = { expandedFreq = !expandedFreq }
                ) {
                    OutlinedTextField(
                        value = when (scolarisation.frequentation) {
                            "REGULIERE" -> "Fréquentation Régulière"
                            "IRREGULIERE" -> "Fréquentation Irrégulière"
                            "ABANDON" -> "Abandon en cours d'année"
                            else -> scolarisation.frequentation
                        },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Fréquentation Scolaire") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedFreq) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )

                    ExposedDropdownMenu(
                        expanded = expandedFreq,
                        onDismissRequest = { expandedFreq = false }
                    ) {
                        listOf("REGULIERE", "IRREGULIERE", "ABANDON").forEach { freqOption ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        when (freqOption) {
                                            "REGULIERE" -> "Fréquentation Régulière"
                                            "IRREGULIERE" -> "Fréquentation Irrégulière"
                                            "ABANDON" -> "Abandon en cours d'année"
                                            else -> freqOption
                                        }
                                    )
                                },
                                onClick = {
                                    onUpdate(scolarisation.copy(frequentation = freqOption))
                                    expandedFreq = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = scolarisation.absences30j.toString(),
                    onValueChange = {
                        val days = it.toIntOrNull() ?: 0
                        onUpdate(scolarisation.copy(absences30j = days))
                    },
                    label = { Text("Nombre de jours d'absence (30 derniers jours)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = scolarisation.motifs,
                    onValueChange = { onUpdate(scolarisation.copy(motifs = it)) },
                    label = { Text("Motifs de l'absence / difficultés") },
                    placeholder = { Text("Maladie, travaux champ, frais non payés...") },
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                OutlinedTextField(
                    value = scolarisation.motifs,
                    onValueChange = { onUpdate(scolarisation.copy(motifs = it)) },
                    label = { Text("Motifs de la non-scolarisation") },
                    placeholder = { Text("Manque de moyens, pas d'école à proximité, aide aux champs...") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
