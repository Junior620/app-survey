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
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.TypeVisite
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SectionAVisiteScreen(
    state: QuestionnaireState,
    onUpdateA: (String, String, String, String, String, TypeVisite, Boolean) -> Unit,
    onRefusTerminate: () -> Unit,
    onNext: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expandedType by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section A : Visite & Consentement Éclairé",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Informations générales sur la visite terrain et obtention obligatoire du consentement éclairé du producteur.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Informations générales
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Identification de la Visite",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.dateVisite,
                    onValueChange = { onUpdateA(it, state.agentNom, state.localisation, state.cooperative, state.producteurId, state.typeVisite, state.consentementObtenu) },
                    label = { Text("Date de la visite (AAAA-MM-JJ)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.agentNom,
                    onValueChange = { onUpdateA(state.dateVisite, it, state.localisation, state.cooperative, state.producteurId, state.typeVisite, state.consentementObtenu) },
                    label = { Text("Nom de l'Agent CDC / Plaine") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.localisation,
                    onValueChange = { onUpdateA(state.dateVisite, state.agentNom, it, state.cooperative, state.producteurId, state.typeVisite, state.consentementObtenu) },
                    label = { Text("Localisation / Village / Secteur") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.cooperative,
                    onValueChange = { onUpdateA(state.dateVisite, state.agentNom, state.localisation, it, state.producteurId, state.typeVisite, state.consentementObtenu) },
                    label = { Text("Coopérative Partenaire") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Type de Visite Dropdown
                ExposedDropdownMenuBox(
                    expanded = expandedType,
                    onExpandedChange = { expandedType = !expandedType }
                ) {
                    OutlinedTextField(
                        value = when (state.typeVisite) {
                            TypeVisite.ROUTINE -> "Visite de Routine"
                            TypeVisite.SIGNALEMENT -> "Enquête de Signalement"
                            TypeVisite.SUIVI -> "Visite de Suivi / Remédiation"
                            TypeVisite.ANNUELLE -> "Évaluation Annuelle"
                        },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Type de Visite") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedType) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )

                    ExposedDropdownMenu(
                        expanded = expandedType,
                        onDismissRequest = { expandedType = false }
                    ) {
                        TypeVisite.entries.forEach { type ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        when (type) {
                                            TypeVisite.ROUTINE -> "Visite de Routine"
                                            TypeVisite.SIGNALEMENT -> "Enquête de Signalement"
                                            TypeVisite.SUIVI -> "Visite de Suivi / Remédiation"
                                            TypeVisite.ANNUELLE -> "Évaluation Annuelle"
                                        }
                                    )
                                },
                                onClick = {
                                    onUpdateA(state.dateVisite, state.agentNom, state.localisation, state.cooperative, state.producteurId, type, state.consentementObtenu)
                                    expandedType = false
                                }
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Consentement Éclairé Obligatoire
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (state.consentementObtenu) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f)
            ),
            border = BorderStroke(
                width = 2.dp,
                color = if (state.consentementObtenu) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (state.consentementObtenu) Icons.Default.CheckCircle else Icons.Default.Block,
                        contentDescription = "Consentement",
                        tint = if (state.consentementObtenu) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Consentement Éclairé OBLIGATOIRE",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if (state.consentementObtenu) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Avant de commencer, vous devez expliquer clairement l'objectif de l'enquête au producteur et obtenir son accord libre et éclairé. Le producteur est libre de refuser.",
                    style = MaterialTheme.typography.bodyMedium
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Choix Accord vs Refus
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        RadioButton(
                            selected = state.consentementObtenu,
                            onClick = { onUpdateA(state.dateVisite, state.agentNom, state.localisation, state.cooperative, state.producteurId, state.typeVisite, true) }
                        )
                        Text(
                            text = "Consentement Accordé",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        RadioButton(
                            selected = !state.consentementObtenu,
                            onClick = { onUpdateA(state.dateVisite, state.agentNom, state.localisation, state.cooperative, state.producteurId, state.typeVisite, false) }
                        )
                        Text(
                            text = "Consentement Refusé",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }

                // Bloc explicatif en cas de REFUS
                AnimatedVisibility(visible = !state.consentementObtenu) {
                    Column(modifier = Modifier.padding(top = 12.dp)) {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Info,
                                        contentDescription = "Règles Refus",
                                        tint = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "Protocole de Refus Respectueux",
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Text(
                                    text = "• L'entretien doit s'arrêter immédiatement avec courtoisie et respect.\n" +
                                            "• Le questionnaire sera enregistré comme 'Non consenti'.\n" +
                                            "• AUCUNE note de risque ni classement 'Faible' pénalisant ne sera appliqué.\n" +
                                            "• Le producteur ne subit aucune sanction administrative.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer
                                )

                                Spacer(modifier = Modifier.height(12.dp))

                                TerrainButton(
                                    text = "Enregistrer comme Refus et Terminer",
                                    onClick = onRefusTerminate,
                                    variant = TerrainButtonVariant.DANGER
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Bouton Continuer si consentement accordé
        AnimatedVisibility(visible = state.consentementObtenu) {
            TerrainButton(
                text = "Continuer vers Section B (Producteur & Enfants)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY
            )
        }
    }
}
