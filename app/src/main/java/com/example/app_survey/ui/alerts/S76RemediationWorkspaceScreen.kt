package com.example.app_survey.ui.alerts

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.StatusChip
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.theme.AfrexiaTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun S76RemediationWorkspaceScreen(
    signal: RemediationSignalEntity?,
    onSaveRemediationPlan: (RemediationSignalEntity) -> Unit,
    onNavigateToWhySignal: (RemediationSignalEntity) -> Unit,
    onBackToAlertsCenter: () -> Unit,
    justificationErrorMessage: String? = null,
    onClearError: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    if (signal == null) {
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Aucun signal sélectionné pour la remédiation.")
        }
        return
    }

    var actionsPrevues by remember(signal) { mutableStateOf(signal.actionsPrevues) }
    var actionsRealisees by remember(signal) { mutableStateOf(signal.actionsRealisees) }
    var responsableDesigne by remember(signal) { mutableStateOf(signal.responsableDesigne) }
    var echeance by remember(signal) { mutableStateOf(signal.echeance) }
    var visitesTerrainSuivi by remember(signal) { mutableStateOf(signal.visitesTerrainSuivi) }
    var obstaclesRencontres by remember(signal) { mutableStateOf(signal.obstaclesRencontres) }
    var notesInvestigation by remember(signal) { mutableStateOf(signal.notesInvestigation) }
    var justificationHumaine by remember(signal) { mutableStateOf(signal.justificationHumaine) }
    var selectedQualification by remember(signal) { mutableStateOf(signal.qualification) }
    var selectedStatutSuivi by remember(signal) { mutableStateOf(signal.statutSuivi) }

    var localValidationError by remember { mutableStateOf<String?>(null) }

    val activeError = justificationErrorMessage ?: localValidationError

    if (activeError != null) {
        AlertDialog(
            onDismissRequest = {
                localValidationError = null
                onClearError()
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Erreur Motivation",
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Motivation Humaine Obligatoire")
                }
            },
            text = {
                Text(
                    text = activeError,
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        localValidationError = null
                        onClearError()
                    }
                ) {
                    Text("Compris & Corriger")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "SCPB SURVEY",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Text(
                            text = "Workspace Remédiation (S76)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackToAlertsCenter) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Retour",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        },
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Synthèse Signal
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Dossier Signal : ${signal.id}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        StatusChip(priorite = signal.priorite)
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Règle : ${signal.regleDeclenchee} • Producteur : ${signal.producteurId}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = signal.explication,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section 1 : Décisions Humaines Motivées (Qualification & Statut)
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Décision",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "1. Qualification Humaine & Statut de Suivi",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Qualification humaine selector
                    Text(
                        text = "Qualification Humaine :",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        QualificationSignal.entries.forEach { qual ->
                            val isSelected = selectedQualification == qual
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedQualification = qual },
                                label = {
                                    Text(
                                        text = when (qual) {
                                            QualificationSignal.A_VERIFIER -> "À vérifier"
                                            QualificationSignal.EN_VERIFICATION -> "En vérif."
                                            QualificationSignal.CONFIRME -> "Confirmé *"
                                            QualificationSignal.REFUTE -> "Réfuté *"
                                        },
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Statut de suivi selector
                    Text(
                        text = "Statut de Suivi de la Remédiation :",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        StatutSuivi.entries.forEach { st ->
                            val isSelected = selectedStatutSuivi == st
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedStatutSuivi = st },
                                label = {
                                    Text(
                                        text = when (st) {
                                            StatutSuivi.OUVERT -> "Ouvert"
                                            StatutSuivi.EN_COURS -> "En cours"
                                            StatutSuivi.RESOLU -> "Résolu *"
                                            StatutSuivi.A_REEVALUER -> "À rééval."
                                        },
                                        style = MaterialTheme.typography.labelSmall
                                    )
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF8E1))
                    ) {
                        Row(modifier = Modifier.padding(10.dp)) {
                            Text(
                                text = "* RÈGLE STRICTE : Les décisions 'Confirmé', 'Réfuté' et 'Résolu' nécessitent obligatoirement une justification textuelle explicite ci-dessous.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFF827717),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section 2 : Justification Humaine & Notes d'investigation
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        text = "2. Justification Humaine & Notes d'Investigation (Obligatoire)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = justificationHumaine,
                        onValueChange = { justificationHumaine = it },
                        label = { Text("Justification Humaine Motivée *") },
                        placeholder = { Text("Détaillez le motif de confirmation, de réfutation ou de décision...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = notesInvestigation,
                        onValueChange = { notesInvestigation = it },
                        label = { Text("Notes d'Investigation Complémentaires") },
                        placeholder = { Text("Compte-rendu d'entretien, constat du superviseur...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Section 3 : Plan d'Actions Correctives
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Assignment,
                            contentDescription = "Plan",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "3. Plan d'Actions Correctives & Logistique",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = actionsPrevues,
                        onValueChange = { actionsPrevues = it },
                        label = { Text("Actions Prévisibles / Programmées") },
                        placeholder = { Text("ex: Inscription kits scolaires, re-cartographie GPS, retrait...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = actionsRealisees,
                        onValueChange = { actionsRealisees = it },
                        label = { Text("Actions Réalisées à ce Jour") },
                        placeholder = { Text("ex: Entretien effectué, bordereau bloqué en magasin...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = responsableDesigne,
                            onValueChange = { responsableDesigne = it },
                            label = { Text("Responsable Désigné") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )

                        OutlinedTextField(
                            value = echeance,
                            onValueChange = { echeance = it },
                            label = { Text("Échéance (AAAA-MM-JJ)") },
                            leadingIcon = { Icon(Icons.Default.CalendarMonth, contentDescription = null) },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = visitesTerrainSuivi,
                        onValueChange = { visitesTerrainSuivi = it },
                        label = { Text("Suivi des Visites Terrain & Dates") },
                        placeholder = { Text("ex: Visite de contrôle #1 prévue le 2026-09-18") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = obstaclesRencontres,
                        onValueChange = { obstaclesRencontres = it },
                        label = { Text("Obstacles Rencontrés ou Risques Remédiation") },
                        placeholder = { Text("ex: Pluies diluviennes, refus de coopérer du planteur...") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Boutons d'actions
            TerrainButton(
                text = "Enregistrer le Plan de Remédiation (S76)",
                onClick = {
                    // Verification motivée
                    if ((selectedQualification == QualificationSignal.CONFIRME || selectedQualification == QualificationSignal.REFUTE) &&
                        justificationHumaine.trim().isBlank() && notesInvestigation.trim().isBlank()
                    ) {
                        localValidationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : Vous devez impérativement saisir une justification textuelle dans 'Justification Humaine' pour confirmer ou réfuter ce signal."
                        return@TerrainButton
                    }

                    if (selectedStatutSuivi == StatutSuivi.RESOLU &&
                        actionsRealisees.trim().isBlank() && justificationHumaine.trim().isBlank() && notesInvestigation.trim().isBlank()
                    ) {
                        localValidationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : Pour marquer une remédiation comme 'RÉSOLU', veuillez obligatoirement décrire les actions réalisées ou la justification finale."
                        return@TerrainButton
                    }

                    val updated = signal.copy(
                        actionsPrevues = actionsPrevues,
                        actionsRealisees = actionsRealisees,
                        responsableDesigne = responsableDesigne,
                        echeance = echeance,
                        visitesTerrainSuivi = visitesTerrainSuivi,
                        obstaclesRencontres = obstaclesRencontres,
                        notesInvestigation = notesInvestigation,
                        justificationHumaine = justificationHumaine,
                        qualification = selectedQualification,
                        statutSuivi = selectedStatutSuivi
                    )

                    onSaveRemediationPlan(updated)
                },
                variant = TerrainButtonVariant.PRIMARY
            )

            Spacer(modifier = Modifier.height(8.dp))

            TerrainButton(
                text = "Pourquoi ce signal ? (S75)",
                onClick = { onNavigateToWhySignal(signal) },
                variant = TerrainButtonVariant.SECONDARY
            )

            Spacer(modifier = Modifier.height(8.dp))

            TerrainButton(
                text = "Retour au Centre d'Alertes (S52-S57)",
                onClick = onBackToAlertsCenter,
                variant = TerrainButtonVariant.OUTLINED
            )

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun S76RemediationWorkspaceScreenPreview() {
    AfrexiaTheme {
        val sample = RemediationSignalEntity(
            id = "SIG-01",
            visiteId = "V-2026-001",
            producteurId = "P-101",
            axe = AxeSignal.PROTECTION_ENFANT,
            priorite = PrioriteSignal.CRITIQUE,
            qualification = QualificationSignal.A_VERIFIER,
            statutSuivi = StatutSuivi.OUVERT,
            regleDeclenchee = "PE02",
            explication = "DANGER GRAVE : Enfant manipulant pulvérisateur",
            donneesSource = "Section F/G",
            dateCalcul = System.currentTimeMillis()
        )
        S76RemediationWorkspaceScreen(
            signal = sample,
            onSaveRemediationPlan = {},
            onNavigateToWhySignal = {},
            onBackToAlertsCenter = {}
        )
    }
}
