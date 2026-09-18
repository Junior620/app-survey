package com.example.app_survey.ui.traceability

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.StatutLogistique

/**
 * Conteneur Général Traçabilité & Récoltes S69 - S72
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TraceabilityContainerScreen(
    onBackToDashboard: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TraceabilityViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var showAddLotDialog by remember { mutableStateOf(false) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            Column {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "SCPB SURVEY",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Traçabilité & Récoltes Cacao (S69-S72)",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBackToDashboard) {
                            Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Retour")
                        }
                    },
                    actions = {
                        IconButton(onClick = { showAddLotDialog = true }) {
                            Icon(imageVector = Icons.Default.Add, contentDescription = "Nouveau Lot")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                )

                // Tab Row S69-S72
                PrimaryTabRow(
                    selectedTabIndex = state.activeTab.ordinal,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    TraceabilityTab.entries.forEach { tab ->
                        Tab(
                            selected = state.activeTab == tab,
                            onClick = { viewModel.selectTab(tab) },
                            text = {
                                Text(
                                    text = tab.label,
                                    fontWeight = if (state.activeTab == tab) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            when (state.activeTab) {
                TraceabilityTab.S69_LIST -> {
                    S69LotListScreen(
                        state = state,
                        onSearchQueryChange = { viewModel.setSearchQuery(it) },
                        onCampagneChange = { viewModel.setSelectedCampagne(it) },
                        onStatutLogistiqueChange = { viewModel.setSelectedStatutLogistique(it) },
                        onSelectLot = { viewModel.selectLot(it) },
                        onAddNewLot = { showAddLotDialog = true }
                    )
                }
                TraceabilityTab.S70_DETAIL -> {
                    S70LotDetailScreen(
                        lot = state.selectedLot,
                        onUpdateLot = { viewModel.saveLot(it) }
                    )
                }
                TraceabilityTab.S71_POST_HARVEST -> {
                    S71PostHarvestScreen(
                        lot = state.selectedLot,
                        onUpdateLot = { viewModel.saveLot(it) }
                    )
                }
                TraceabilityTab.S72_MOVEMENTS -> {
                    S72MovementsScreen(
                        lot = state.selectedLot,
                        onConfirmReception = { lot, date -> viewModel.confirmReception(lot, date) },
                        onSaveLot = { viewModel.saveLot(it) }
                    )
                }
            }
        }
    }

    if (showAddLotDialog) {
        NewLotModalDialog(
            onDismiss = { showAddLotDialog = false },
            onConfirm = { newLot ->
                viewModel.saveLot(newLot)
                showAddLotDialog = false
            }
        )
    }
}

@Composable
private fun NewLotModalDialog(
    onDismiss: () -> Unit,
    onConfirm: (RecolteLotEntity) -> Unit
) {
    var codeLot by remember { mutableStateOf("LOT-2026-AFR-" + System.currentTimeMillis().toString().takeLast(4)) }
    var campagne by remember { mutableStateOf("Grande Campagne 2025-2026") }
    var origines by remember { mutableStateOf("Kouamé N'Guessan (Parcelle PLT-001)") }
    var quantiteKg by remember { mutableStateOf("1200") }
    var sacs by remember { mutableStateOf("18") }
    var bordereau by remember { mutableStateOf("BL-2026-099") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouveau Lot de Cacao S69") },
        text = {
            Column {
                OutlinedTextField(
                    value = codeLot,
                    onValueChange = { codeLot = it },
                    label = { Text("Code du Lot") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = origines,
                    onValueChange = { origines = it },
                    label = { Text("Origines (Producteurs/Parcelles)") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = quantiteKg,
                    onValueChange = { quantiteKg = it },
                    label = { Text("Poids Net (Kg)") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = sacs,
                    onValueChange = { sacs = it },
                    label = { Text("Nombre de Sacs") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = bordereau,
                    onValueChange = { bordereau = it },
                    label = { Text("Numéro de Bordereau de Livraison") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val qKg = quantiteKg.toDoubleOrNull() ?: 0.0
                    val nSacs = sacs.toIntOrNull() ?: 0
                    val newLot = RecolteLotEntity(
                        id = "LOT-" + System.currentTimeMillis(),
                        visiteId = "V-2026-MANUAL",
                        producteurId = "P-101",
                        codeLot = codeLot,
                        periode = "Septembre 2026",
                        origines = origines,
                        quantiteKg = qKg,
                        fermentation = "Caisses en bois",
                        sechage = "Claies en bois",
                        sacs = nSacs,
                        peseeSource = "Bascule coopérative",
                        statutLogistique = StatutLogistique.EN_TRANSIT,
                        campagne = campagne,
                        contributionsDetail = "$origines: $qKg kg (100%)",
                        mouvementBordereau = bordereau
                    )
                    onConfirm(newLot)
                }
            ) {
                Text("Créer le Lot")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
