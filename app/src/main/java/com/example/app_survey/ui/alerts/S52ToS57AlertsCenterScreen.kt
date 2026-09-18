package com.example.app_survey.ui.alerts

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
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
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.QualificationChip
import com.example.app_survey.ui.components.RoleBadge
import com.example.app_survey.ui.components.StatusChip
import com.example.app_survey.ui.components.StatutSuiviChip
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.theme.AfrexiaTheme

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun S52ToS57AlertsCenterScreen(
    viewModel: AlertsViewModel,
    onBackToDashboard: () -> Unit,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    var showFilterPanel by remember { mutableStateOf(false) }
    var signalToQualify by remember { mutableStateOf<RemediationSignalEntity?>(null) }

    LaunchedEffect(state.successMessage) {
        state.successMessage?.let { msg ->
            snackbarHostState.showSnackbar(msg)
            viewModel.clearSuccessMessage()
        }
    }

    // Modal Error Dialog for mandatory justification
    if (state.justificationError != null) {
        AlertDialog(
            onDismissRequest = { viewModel.clearJustificationError() },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Règle Motivation",
                        tint = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Motivation Humaine Obligatoire")
                }
            },
            text = {
                Text(
                    text = state.justificationError ?: "",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                TextButton(onClick = { viewModel.clearJustificationError() }) {
                    Text("Compris")
                }
            }
        )
    }

    // Modal Quick Qualification Dialog
    if (signalToQualify != null) {
        val currentSig = signalToQualify!!
        var targetQualification by remember { mutableStateOf(currentSig.qualification) }
        var targetStatutSuivi by remember { mutableStateOf(currentSig.statutSuivi) }
        var textMotivation by remember { mutableStateOf(currentSig.justificationHumaine) }
        var dialogError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { signalToQualify = null },
            title = {
                Text(
                    text = "Qualification Rapide Signal ${currentSig.id}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column {
                    Text(
                        text = "Règle : ${currentSig.regleDeclenchee}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text("Qualification Humaine :", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        QualificationSignal.entries.forEach { q ->
                            FilterChip(
                                selected = targetQualification == q,
                                onClick = { targetQualification = q },
                                label = { Text(q.name, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text("Statut de Suivi :", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        StatutSuivi.entries.forEach { st ->
                            FilterChip(
                                selected = targetStatutSuivi == st,
                                onClick = { targetStatutSuivi = st },
                                label = { Text(st.name, style = MaterialTheme.typography.labelSmall) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = textMotivation,
                        onValueChange = {
                            textMotivation = it
                            dialogError = null
                        },
                        label = { Text("Motivation Humaine Obligatoire *") },
                        placeholder = { Text("Justification motivée de la décision...") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 4,
                        isError = dialogError != null
                    )

                    if (dialogError != null) {
                        Text(
                            text = dialogError!!,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val isMotivationRequired = (targetQualification == QualificationSignal.CONFIRME ||
                                targetQualification == QualificationSignal.REFUTE ||
                                targetStatutSuivi == StatutSuivi.RESOLU)

                        if (isMotivationRequired && textMotivation.trim().isBlank()) {
                            dialogError = "RÈGLE CONFORMITÉ : La justification motivée est obligatoire pour passer en '${targetQualification.name}' ou '${targetStatutSuivi.name}'."
                            return@TextButton
                        }

                        viewModel.updateQualification(currentSig, targetQualification, textMotivation)
                        viewModel.updateStatutSuivi(currentSig, targetStatutSuivi, textMotivation)
                        signalToQualify = null
                    }
                ) {
                    Text("Valider la Décision")
                }
            },
            dismissButton = {
                TextButton(onClick = { signalToQualify = null }) {
                    Text("Annuler")
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
                            text = "Centre d'Alertes Durabilité (S52-S57)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackToDashboard) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Retour",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showFilterPanel = !showFilterPanel }) {
                        Icon(
                            imageVector = Icons.Default.FilterList,
                            contentDescription = "Filtres",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        modifier = modifier.fillMaxSize()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Role Switcher Card
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Système de Sécurité & RBAC",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Basculez entre le rôle Agent Terrain (CDC) et Manager",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    RoleBadge(
                        currentRole = state.roleUtilisateur,
                        onRoleToggle = { viewModel.setRole(it) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Controle d'accès CDC (Masquage Section I)
            if (state.roleUtilisateur == RoleUtilisateur.CDC) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Accès restreint",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(end = 12.dp)
                        )
                        Column {
                            Text(
                                text = "Accès Restreint : Mode CDC (Agent Terrain)",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.titleMedium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Conformément à la politique d'habilitation RBAC de la Section I, le Centre d'Alertes Durabilité, l'explication explicite (S75) et le Workspace de Remédiation (S76) sont réservés au Responsable Durabilité.\n\nVeuillez basculer sur le rôle 'Responsable Durabilité' ci-dessus pour consulter et qualifier les signaux.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
                return@Scaffold
            }

            // Vue Responsable Durabilité : Metrics Dashboard top cards
            val totalSignaux = state.signaux.size
            val critiquesCount = state.signaux.count { it.priorite == PrioriteSignal.CRITIQUE || it.priorite == PrioriteSignal.ELEVE }
            val enRemediationCount = state.signaux.count { it.statutSuivi == StatutSuivi.EN_COURS || it.statutSuivi == StatutSuivi.OUVERT }
            val confirmesCount = state.signaux.count { it.qualification == QualificationSignal.CONFIRME }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                MetricSummaryCard(
                    title = "Total Signaux",
                    count = totalSignaux.toString(),
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.weight(1f)
                )
                MetricSummaryCard(
                    title = "Critiques/Élevés",
                    count = critiquesCount.toString(),
                    color = Color(0xFFD32F2F),
                    modifier = Modifier.weight(1f)
                )
                MetricSummaryCard(
                    title = "En Remédiation",
                    count = enRemediationCount.toString(),
                    color = Color(0xFFE65100),
                    modifier = Modifier.weight(1f)
                )
                MetricSummaryCard(
                    title = "Confirmés",
                    count = confirmesCount.toString(),
                    color = Color(0xFF1B5E20),
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Barre de Recherche & Panneau de Filtres Amélioré
            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text("Rechercher par règle, producteur, explication...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (state.searchQuery.isNotBlank()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Effacer")
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            AnimatedVisibility(visible = showFilterPanel) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Filtres par Axe et Statuts Indépendants",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        // Filter Axe
                        Text("Axe de Signal :", style = MaterialTheme.typography.labelSmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            FilterChip(
                                selected = state.selectedAxe == null,
                                onClick = { viewModel.setSelectedAxe(null) },
                                label = { Text("Tous", style = MaterialTheme.typography.labelSmall) }
                            )
                            AxeSignal.entries.forEach { axe ->
                                FilterChip(
                                    selected = state.selectedAxe == axe,
                                    onClick = { viewModel.setSelectedAxe(axe) },
                                    label = { Text(axe.name, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Filter Priority
                        Text("Priorité Système :", style = MaterialTheme.typography.labelSmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            FilterChip(
                                selected = state.selectedPriorite == null,
                                onClick = { viewModel.setSelectedPriorite(null) },
                                label = { Text("Toutes", style = MaterialTheme.typography.labelSmall) }
                            )
                            PrioriteSignal.entries.forEach { prio ->
                                FilterChip(
                                    selected = state.selectedPriorite == prio,
                                    onClick = { viewModel.setSelectedPriorite(prio) },
                                    label = { Text(prio.name, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Filter Qualification
                        Text("Qualification Humaine :", style = MaterialTheme.typography.labelSmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            FilterChip(
                                selected = state.selectedQualification == null,
                                onClick = { viewModel.setSelectedQualification(null) },
                                label = { Text("Toutes", style = MaterialTheme.typography.labelSmall) }
                            )
                            QualificationSignal.entries.forEach { q ->
                                FilterChip(
                                    selected = state.selectedQualification == q,
                                    onClick = { viewModel.setSelectedQualification(q) },
                                    label = { Text(q.name, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        // Filter StatutSuivi
                        Text("Statut de Suivi :", style = MaterialTheme.typography.labelSmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            FilterChip(
                                selected = state.selectedStatutSuivi == null,
                                onClick = { viewModel.setSelectedStatutSuivi(null) },
                                label = { Text("Tous", style = MaterialTheme.typography.labelSmall) }
                            )
                            StatutSuivi.entries.forEach { st ->
                                FilterChip(
                                    selected = state.selectedStatutSuivi == st,
                                    onClick = { viewModel.setSelectedStatutSuivi(st) },
                                    label = { Text(st.name, style = MaterialTheme.typography.labelSmall) }
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Filtering logic
            val filteredList = state.signaux.filter { signal ->
                val matchesQuery = state.searchQuery.isBlank() ||
                        signal.regleDeclenchee.contains(state.searchQuery, ignoreCase = true) ||
                        signal.producteurId.contains(state.searchQuery, ignoreCase = true) ||
                        signal.explication.contains(state.searchQuery, ignoreCase = true)

                val matchesAxe = state.selectedAxe == null || signal.axe == state.selectedAxe
                val matchesPrio = state.selectedPriorite == null || signal.priorite == state.selectedPriorite
                val matchesQual = state.selectedQualification == null || signal.qualification == state.selectedQualification
                val matchesStatut = state.selectedStatutSuivi == null || signal.statutSuivi == state.selectedStatutSuivi

                matchesQuery && matchesAxe && matchesPrio && matchesQual && matchesStatut
            }

            if (filteredList.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Aucun signal ne correspond aux critères de recherche.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredList) { signal ->
                        SignalCardItem(
                            signal = signal,
                            onWhySignalClick = { viewModel.navigateToWhySignal(signal) },
                            onRemediationClick = { viewModel.navigateToRemediation(signal) },
                            onQualifyClick = { signalToQualify = signal }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricSummaryCard(
    title: String,
    count: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.12f))
    ) {
        Column(
            modifier = Modifier.padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = count,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = title,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
private fun SignalCardItem(
    signal: RemediationSignalEntity,
    onWhySignalClick: () -> Unit,
    onRemediationClick: () -> Unit,
    onQualifyClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    AfrexiaCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = signal.regleDeclenchee,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    val axeName = when (signal.axe) {
                        AxeSignal.PROTECTION_ENFANT -> "Protection Enfant"
                        AxeSignal.TRACABILITE -> "Traçabilité Cacao"
                        AxeSignal.QUALITE_DONNEES -> "Qualité Données"
                    }
                    Text(
                        text = axeName,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }

                IconButton(onClick = onQualifyClick) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Qualifier",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Producteur : ${signal.producteurId}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = signal.explication,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Affichage Clair des 3 Statuts Indépendants side by side
            Text(
                text = "Statuts à 3 dimensions :",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(4.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusChip(priorite = signal.priorite)
                QualificationChip(qualification = signal.qualification)
                StatutSuiviChip(statutSuivi = signal.statutSuivi)
            }

            if (signal.justificationHumaine.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                        .padding(8.dp)
                ) {
                    Text(
                        text = "Motivation Humaine : ${signal.justificationHumaine}",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))

            // Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TerrainButton(
                    text = "Pourquoi ce signal ? (S75)",
                    onClick = onWhySignalClick,
                    variant = TerrainButtonVariant.SECONDARY,
                    modifier = Modifier.weight(1f)
                )

                TerrainButton(
                    text = "Workspace Remédiation (S76)",
                    onClick = onRemediationClick,
                    variant = TerrainButtonVariant.PRIMARY,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun S52ToS57AlertsCenterScreenPreview() {
    AfrexiaTheme {
        // Preview
    }
}
