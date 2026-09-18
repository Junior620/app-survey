package com.example.app_survey.ui.questionnaire.sections

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionGObservationsScreen(
    state: QuestionnaireState,
    onUpdateG: (Int, String, String, String, Boolean, Boolean) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section G : Observations Directes Terrain (S73)",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Distinguer explicitement les Déclarations du producteur des Observations directes constatées de visu par l'agent de plaine.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Bannière explicative distinction
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.4f)),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Visibility,
                    contentDescription = "Distinction",
                    tint = MaterialTheme.colorScheme.tertiary
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = "Règle de Saisie : Déclarations vs Observations",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                    Text(
                        text = "Les sections précédentes enregistrent ce que le producteur DECLARE. La section G enregistre exclusivement ce que vous CONSTATEZ DE VISU sur la parcelle ou au domicile.",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Constats Terrain
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Constats Physiques sur le Terrain",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.enfantsVusObs.toString(),
                    onValueChange = {
                        val count = it.toIntOrNull() ?: 0
                        onUpdateG(count, state.tachesVuesObs, state.outilsVusObs, state.produitsVusObs, state.contradictionsObs, state.signalementJeuneEnfantObs)
                    },
                    label = { Text("Nombre d'enfants VUS DIRECTEMENT sur la parcelle/champ") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.tachesVuesObs,
                    onValueChange = { onUpdateG(state.enfantsVusObs, it, state.outilsVusObs, state.produitsVusObs, state.contradictionsObs, state.signalementJeuneEnfantObs) },
                    label = { Text("Tâches observées en cours d'exécution") },
                    placeholder = { Text("ex: Ramassage des cabosses, écabossage, désherbage...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.outilsVusObs,
                    onValueChange = { onUpdateG(state.enfantsVusObs, state.tachesVuesObs, it, state.produitsVusObs, state.contradictionsObs, state.signalementJeuneEnfantObs) },
                    label = { Text("Outils dangereux vus ou accessibles") },
                    placeholder = { Text("ex: Machettes posées au sol, pulvérisateur solo...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.produitsVusObs,
                    onValueChange = { onUpdateG(state.enfantsVusObs, state.tachesVuesObs, state.outilsVusObs, it, state.contradictionsObs, state.signalementJeuneEnfantObs) },
                    label = { Text("Produits phytosanitaires / pesticides vus") },
                    placeholder = { Text("ex: Emballages de fétis, bidons de chimique...") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Contradictions & Signalement Jeune Enfant
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Contradictions & Protocole de Signalement",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Contradiction Checkbox
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = state.contradictionsObs,
                        onCheckedChange = { isChecked ->
                            onUpdateG(state.enfantsVusObs, state.tachesVuesObs, state.outilsVusObs, state.produitsVusObs, isChecked, state.signalementJeuneEnfantObs)
                        }
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "CONTRADICTION directe notée entre les Déclarations du producteur et vos Observations terrain",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Signalement Jeune Enfant Checkbox
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = if (state.signalementJeuneEnfantObs) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant
                    ),
                    border = BorderStroke(
                        width = if (state.signalementJeuneEnfantObs) 2.dp else 1.dp,
                        color = if (state.signalementJeuneEnfantObs) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = state.signalementJeuneEnfantObs,
                                onCheckedChange = { isChecked ->
                                    onUpdateG(state.enfantsVusObs, state.tachesVuesObs, state.outilsVusObs, state.produitsVusObs, state.contradictionsObs, isChecked)
                                }
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "SIGNALEMENT PROTOCOLE : Présence d'un enfant de moins de 5 ans ou d'âge incertain exposé à des travaux dangereux.",
                                fontWeight = FontWeight.Bold,
                                color = if (state.signalementJeuneEnfantObs) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                            )
                        }

                        AnimatedVisibility(visible = state.signalementJeuneEnfantObs) {
                            Column(modifier = Modifier.padding(top = 8.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Urgence",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Directives de Protection Immédiate (SOCODEVI / AFREXIA) :",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                }
                                Text(
                                    text = "1. Demander poliment au planteur d'éloigner le jeune enfant de la zone de danger.\n" +
                                            "2. Consigner le signalement sans confrontation.\n" +
                                            "3. Le dossier sera transmis en priorité au comité de protection de la section.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
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
                text = "Suivant (Section H - Prévention)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }
}
