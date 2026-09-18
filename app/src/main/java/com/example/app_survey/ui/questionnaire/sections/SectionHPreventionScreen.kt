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
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
fun SectionHPreventionScreen(
    state: QuestionnaireState,
    onUpdateH: (String, String, String, Int) -> Unit,
    onNextToSummary: () -> Unit,
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
            text = "Section H : Prévention & Sensibilisation (S74)",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Formations reçues, besoins d'accompagnement et canaux de signalement réellement disponibles dans la communauté.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.HealthAndSafety,
                        contentDescription = "Prévention",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Formations & Suivis Préventifs",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.formationsRecuesPrev,
                    onValueChange = { onUpdateH(it, state.canalSignalementDisponible, state.besoinsSensibilisation, state.visitesSuiviCount) },
                    label = { Text("Formations reçues par le producteur / ménage") },
                    placeholder = { Text("ex: Utilisation des EPI, Droits de l'Enfant, Bonnes pratiques agricoles...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.visitesSuiviCount.toString(),
                    onValueChange = {
                        val count = it.toIntOrNull() ?: 0
                        onUpdateH(state.formationsRecuesPrev, state.canalSignalementDisponible, state.besoinsSensibilisation, count)
                    },
                    label = { Text("Nombre de visites de suivi préventif réalisées (12 mois)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.besoinsSensibilisation,
                    onValueChange = { onUpdateH(state.formationsRecuesPrev, state.canalSignalementDisponible, it, state.visitesSuiviCount) },
                    label = { Text("Besoins identifiés en sensibilisation / assistance") },
                    placeholder = { Text("ex: Kits scolaires, équipement de protection, formation phytosanitaire...") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Canal de Signalement
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.SupportAgent,
                        contentDescription = "Canal Signalement",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Canaux de Signalement Réellement Disponibles",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.canalSignalementDisponible,
                    onValueChange = { onUpdateH(state.formationsRecuesPrev, it, state.besoinsSensibilisation, state.visitesSuiviCount) },
                    label = { Text("Canal de signalement connu et accessible au village") },
                    placeholder = { Text("ex: Hotline gratuite COOP, Délégué de section, Comité Villageois ANEPJ/SOCODEVI, Agent CDC...") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f))
                ) {
                    Text(
                        text = "Remarque : Indiquer uniquement les canaux de recours dont le producteur confirme avoir connaissance et accès effectif.",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Navigation vers le Sommaire & Finalisation
        Row(modifier = Modifier.fillMaxWidth()) {
            TerrainButton(
                text = "Précédent",
                onClick = onPrevious,
                variant = TerrainButtonVariant.SECONDARY,
                modifier = Modifier.weight(1f)
            )

            Spacer(modifier = Modifier.width(12.dp))

            TerrainButton(
                text = "Terminer & Voir le Sommaire",
                onClick = onNextToSummary,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }
}
