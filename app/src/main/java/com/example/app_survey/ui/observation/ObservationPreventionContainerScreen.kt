package com.example.app_survey.ui.observation

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * Conteneur Général Observation & Prévention S73 - S74
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ObservationPreventionContainerScreen(
    onBackToDashboard: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ObservationPreventionViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

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
                                text = "Observation Directe & Prévention (S73-S74)",
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBackToDashboard) {
                            Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Retour")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                )

                // Tab Row S73 - S74
                PrimaryTabRow(
                    selectedTabIndex = state.activeTab.ordinal,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ObservationTab.entries.forEach { tab ->
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
                ObservationTab.S73_OBSERVATIONS -> {
                    S73FieldObservationScreen(
                        observation = state.currentObservation,
                        onSaveObservation = { viewModel.saveObservation(it) }
                    )
                }
                ObservationTab.S74_PREVENTION -> {
                    S74PreventionScreen(
                        prevention = state.currentPrevention,
                        onSavePrevention = { viewModel.savePrevention(it) }
                    )
                }
            }
        }
    }
}
