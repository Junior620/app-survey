package com.example.app_survey

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.app_survey.data.local.VisiteFullData
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.data.local.entity.TypeVisite
import com.example.app_survey.data.local.entity.VisiteEntity
import com.example.app_survey.engine.ExplainableDetectionEngine
import com.example.app_survey.ui.alerts.AlertsViewModel
import com.example.app_survey.ui.alerts.S52ToS57AlertsCenterScreen
import com.example.app_survey.ui.alerts.S75WhyThisSignalScreen
import com.example.app_survey.ui.alerts.S76RemediationWorkspaceScreen
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.QualificationChip
import com.example.app_survey.ui.components.RoleBadge
import com.example.app_survey.ui.components.StatusChip
import com.example.app_survey.ui.components.StatutSuiviChip
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.observation.ObservationPreventionContainerScreen
import com.example.app_survey.ui.questionnaire.QuestionnaireScreen
import com.example.app_survey.ui.questionnaire.QuestionnaireViewModel
import com.example.app_survey.ui.theme.AfrexiaTheme
import com.example.app_survey.ui.traceability.TraceabilityContainerScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AfrexiaTheme {
                val questionnaireViewModel: QuestionnaireViewModel = viewModel()
                val alertsViewModel: AlertsViewModel = viewModel()

                val alertsState by alertsViewModel.uiState.collectAsState()
                var currentScreen by remember { mutableStateOf("DASHBOARD") }

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Crossfade(
                        targetState = currentScreen,
                        modifier = Modifier.padding(innerPadding)
                    ) { screen ->
                        when (screen) {
                            "DASHBOARD" -> {
                                AfrexiaTerrainDashboard(
                                    viewModel = questionnaireViewModel,
                                    onStartQuestionnaire = { currentScreen = "QUESTIONNAIRE" },
                                    onResumeDraft = {
                                        questionnaireViewModel.resumeDraft()
                                        currentScreen = "QUESTIONNAIRE"
                                    },
                                    onOpenTraceability = { currentScreen = "TRACEABILITY" },
                                    onOpenObservations = { currentScreen = "OBSERVATION_PREVENTION" },
                                    onOpenAlertsCenter = { currentScreen = "ALERTS_CENTER" },
                                    onOpenWhySignal = { sig ->
                                        alertsViewModel.navigateToWhySignal(sig)
                                        currentScreen = "WHY_SIGNAL"
                                    },
                                    onOpenRemediation = { sig ->
                                        alertsViewModel.navigateToRemediation(sig)
                                        currentScreen = "REMEDIATION_WORKSPACE"
                                    },
                                    onRoleChanged = { role ->
                                        questionnaireViewModel.setRole(role)
                                        alertsViewModel.setRole(role)
                                    }
                                )
                            }
                            "QUESTIONNAIRE" -> {
                                QuestionnaireScreen(
                                    viewModel = questionnaireViewModel,
                                    onBackToDashboard = { currentScreen = "DASHBOARD" }
                                )
                            }
                            "TRACEABILITY" -> {
                                TraceabilityContainerScreen(
                                    onBackToDashboard = { currentScreen = "DASHBOARD" }
                                )
                            }
                            "OBSERVATION_PREVENTION" -> {
                                ObservationPreventionContainerScreen(
                                    onBackToDashboard = { currentScreen = "DASHBOARD" }
                                )
                            }
                            "ALERTS_CENTER" -> {
                                S52ToS57AlertsCenterScreen(
                                    viewModel = alertsViewModel,
                                    onBackToDashboard = { currentScreen = "DASHBOARD" }
                                )
                            }
                            "WHY_SIGNAL" -> {
                                S75WhyThisSignalScreen(
                                    signal = alertsState.selectedSignal,
                                    onNavigateToRemediation = { sig ->
                                        alertsViewModel.navigateToRemediation(sig)
                                        currentScreen = "REMEDIATION_WORKSPACE"
                                    },
                                    onBackToAlertsCenter = {
                                        alertsViewModel.navigateToAlertsCenter()
                                        currentScreen = "ALERTS_CENTER"
                                    }
                                )
                            }
                            "REMEDIATION_WORKSPACE" -> {
                                S76RemediationWorkspaceScreen(
                                    signal = alertsState.selectedSignal,
                                    onSaveRemediationPlan = { updatedSig ->
                                        alertsViewModel.saveRemediationWorkspace(updatedSig)
                                    },
                                    onNavigateToWhySignal = { sig ->
                                        alertsViewModel.navigateToWhySignal(sig)
                                        currentScreen = "WHY_SIGNAL"
                                    },
                                    onBackToAlertsCenter = {
                                        alertsViewModel.navigateToAlertsCenter()
                                        currentScreen = "ALERTS_CENTER"
                                    },
                                    justificationErrorMessage = alertsState.justificationError,
                                    onClearError = { alertsViewModel.clearJustificationError() }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AfrexiaTerrainDashboard(
    viewModel: QuestionnaireViewModel,
    onStartQuestionnaire: () -> Unit,
    onResumeDraft: () -> Unit,
    onOpenTraceability: () -> Unit = {},
    onOpenObservations: () -> Unit = {},
    onOpenAlertsCenter: () -> Unit = {},
    onOpenWhySignal: (com.example.app_survey.data.local.entity.RemediationSignalEntity) -> Unit = {},
    onOpenRemediation: (com.example.app_survey.data.local.entity.RemediationSignalEntity) -> Unit = {},
    onRoleChanged: (RoleUtilisateur) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val engine = remember { ExplainableDetectionEngine() }

    // Visite simulée
    val sampleData = remember {
        VisiteFullData(
            visite = VisiteEntity("V-2026-001", "2026-09-09", "Agent Traoré", "Soubré", "COOP-AFREXIA", "P-101", TypeVisite.ROUTINE, true),
            producteur = ProducteurEntity("P-101", "Kouamé N'Guessan", "M", "1982-04-12", "0708091011", "CI-0012394", 6, 2),
            observationsTerrain = listOf(
                ObservationTerrainEntity("OBS-01", "V-2026-001", "P-101", "2026-09-09", "Agent Traoré", 1, "Pulvérisation phytosanitaire", "Pulvérisateur", "Pesticides", false, true)
            )
        )
    }

    val signaux = remember(sampleData) { engine.evaluateVisite(sampleData) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "SCPB SURVEY",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Système de Suivi & Saisie Dynamique (Sections A-I)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // RBAC Role Switcher Card
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Gestion des Rôles & Sécurité (RBAC)",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(6.dp))

                RoleBadge(
                    currentRole = state.roleUtilisateur,
                    onRoleToggle = { newRole ->
                        viewModel.setRole(newRole)
                        onRoleChanged(newRole)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Accès Rapide Centre d'Alertes Durabilité
        AfrexiaCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = "Alertes",
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Centre d'Alertes Durabilité (S52-S57)",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Gestion des signaux, qualification & suivi de remédiation",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            TerrainButton(
                text = "Ouvrir le Centre d'Alertes Durabilité",
                onClick = onOpenAlertsCenter,
                variant = TerrainButtonVariant.PRIMARY
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Modules Spécifiques Terrain
        Text(
            text = "Gestion Spécifique Terrain (S69-S74)",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        TerrainButton(
            text = "Traçabilité & Récoltes de Cacao (S69-S72)",
            onClick = onOpenTraceability,
            variant = TerrainButtonVariant.PRIMARY
        )

        Spacer(modifier = Modifier.height(8.dp))

        TerrainButton(
            text = "Observations Terrain & Prévention (S73-S74)",
            onClick = onOpenObservations,
            variant = TerrainButtonVariant.SECONDARY
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Boutons principaux de démarrage de questionnaire
        Text(
            text = "Saisie du Questionnaire Terrain (S21-S28)",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        TerrainButton(
            text = "Démarrer un Nouveau Questionnaire (S21-S28)",
            onClick = onStartQuestionnaire,
            variant = TerrainButtonVariant.OUTLINED
        )

        Spacer(modifier = Modifier.height(8.dp))

        if (state.lastSavedTimestamp != null) {
            TerrainButton(
                text = "Reprendre le Brouillon Hors-Ligne (Saisie Reprise)",
                onClick = onResumeDraft,
                variant = TerrainButtonVariant.SECONDARY
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section Masquage RBAC / Signaux de détection (Section I)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Évaluation Explicable & Signaux de Détection",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (state.roleUtilisateur == RoleUtilisateur.CDC) {
            // Rôle CDC : Masquage RBAC strict de la Section I et des scores de risque
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Masquage CDC",
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Accès CDC (Agent Terrain) : Section I Masquée",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Conformément aux règles de confidentialité, le score de risque global et les dossiers de remédiation confidentiels (Section I) sont uniquement accessibles au Responsable Durabilité.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            // Rôle Responsable Durabilité : Accès complet aux 3 axes avec boutons S75 / S76
            signaux.forEach { signal ->
                AfrexiaCard(modifier = Modifier.padding(vertical = 6.dp)) {
                    Column {
                        val axeTitle = when (signal.axe) {
                            AxeSignal.PROTECTION_ENFANT -> "Axe 1 : Protection de l'Enfant"
                            AxeSignal.TRACABILITE -> "Axe 2 : Traçabilité du Cacao"
                            AxeSignal.QUALITE_DONNEES -> "Axe 3 : Qualité des Données"
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = axeTitle,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            StatusChip(priorite = signal.priorite)
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            QualificationChip(qualification = signal.qualification)
                            StatutSuiviChip(statutSuivi = signal.statutSuivi)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = signal.explication,
                            style = MaterialTheme.typography.bodyMedium
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            TerrainButton(
                                text = "Pourquoi ce signal ? (S75)",
                                onClick = { onOpenWhySignal(signal) },
                                variant = TerrainButtonVariant.SECONDARY,
                                modifier = Modifier.weight(1f)
                            )

                            TerrainButton(
                                text = "Remédiation (S76)",
                                onClick = { onOpenRemediation(signal) },
                                variant = TerrainButtonVariant.PRIMARY,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun AfrexiaTerrainDashboardPreview() {
    AfrexiaTheme {
        // Preview dummy
    }
}
