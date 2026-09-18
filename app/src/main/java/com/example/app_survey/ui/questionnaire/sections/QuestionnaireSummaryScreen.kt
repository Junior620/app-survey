package com.example.app_survey.ui.questionnaire.sections

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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState
import com.example.app_survey.ui.questionnaire.SectionQuestionnaire

@Composable
fun QuestionnaireSummaryScreen(
    state: QuestionnaireState,
    onNavigateToSection: (SectionQuestionnaire) -> Unit,
    onSaveDraft: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Sommaire du Questionnaire & Contrôle Qualité",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Revue des sections A à H, visualisateur des erreurs de saisie et finalisation de la visite.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // RBAC Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = if (state.roleUtilisateur == RoleUtilisateur.CDC)
                    MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                else
                    MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.4f)
            )
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (state.roleUtilisateur == RoleUtilisateur.CDC) Icons.Default.Lock else Icons.Default.CheckCircle,
                    contentDescription = "RBAC Role"
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = if (state.roleUtilisateur == RoleUtilisateur.CDC)
                            "Mode Agent CDC (Terrain)"
                        else
                            "Mode Responsable Durabilité (Accès Complet)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (state.roleUtilisateur == RoleUtilisateur.CDC)
                            "Vous avez accès à la saisie A-H et aux vérifications d'erreurs. Les scores de risque et fiches d'alerte confidentielles (Section I) sont masqués."
                        else
                            "Accès complet avec évaluation automatique des signaux de détection et dossiers de remédiation.",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Visualisateur d'erreurs / Contrôles
        if (state.validationErrors.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f)),
                border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.error)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Erreurs",
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Avertissements et Points à Vérifier (${state.validationErrors.size})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    state.validationErrors.forEach { error ->
                        Text(
                            text = "• $error",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Grille/Liste des Sections A-H
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Progrès par Section (Pas-à-Pas)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                val sectionsList = listOf(
                    SectionQuestionnaire.SECTION_A to "Visite (${state.dateVisite} - ${state.agentNom})",
                    SectionQuestionnaire.SECTION_B to "Producteur (${state.producteurNom}, ${state.enfants.size} enfant(s))",
                    SectionQuestionnaire.SECTION_C to "Plantations (${state.plantations.size} parcelle(s))",
                    SectionQuestionnaire.SECTION_D to "Récoltes (${state.recolteLots.size} lot(s))",
                    SectionQuestionnaire.SECTION_E to "Scolarisation (${state.scolarisations.size} enfant(s) 5-17 ans)",
                    SectionQuestionnaire.SECTION_F to "Activités & Risques (${state.activitesEnfants.size} fiche(s))",
                    SectionQuestionnaire.SECTION_G to "Observations (${state.enfantsVusObs} enfant(s) vu(s))",
                    SectionQuestionnaire.SECTION_H to "Prévention & Signalement (${state.visitesSuiviCount} suivi(s))"
                )

                sectionsList.forEach { (sec, detail) ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
                        onClick = { onNavigateToSection(sec) }
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
                                    text = sec.titre,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleSmall
                                )
                                Text(
                                    text = detail,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            AssistChip(
                                onClick = { onNavigateToSection(sec) },
                                label = { Text("Ouvrir", style = MaterialTheme.typography.labelSmall) },
                                colors = AssistChipDefaults.assistChipColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Action Buttons
        TerrainButton(
            text = "Enregistrer en Brouillon Local Horodaté",
            onClick = onSaveDraft,
            variant = TerrainButtonVariant.SECONDARY
        )

        Spacer(modifier = Modifier.height(12.dp))

        TerrainButton(
            text = if (state.consentementObtenu) "Finaliser & Soumettre la Visite" else "Finaliser l'Enregistrement de Refus",
            onClick = onSubmit,
            variant = if (state.consentementObtenu) TerrainButtonVariant.PRIMARY else TerrainButtonVariant.DANGER
        )
    }
}
