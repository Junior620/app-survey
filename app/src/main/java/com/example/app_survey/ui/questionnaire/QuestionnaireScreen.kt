package com.example.app_survey.ui.questionnaire

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.ui.components.RoleBadge
import com.example.app_survey.ui.questionnaire.sections.QuestionnaireSummaryScreen
import com.example.app_survey.ui.questionnaire.sections.SectionAVisiteScreen
import com.example.app_survey.ui.questionnaire.sections.SectionBProducteurScreen
import com.example.app_survey.ui.questionnaire.sections.SectionCPlantationScreen
import com.example.app_survey.ui.questionnaire.sections.SectionDRecolteScreen
import com.example.app_survey.ui.questionnaire.sections.SectionEScolarisationScreen
import com.example.app_survey.ui.questionnaire.sections.SectionFActivitesScreen
import com.example.app_survey.ui.questionnaire.sections.SectionGObservationsScreen
import com.example.app_survey.ui.questionnaire.sections.SectionHPreventionScreen
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionnaireScreen(
    viewModel: QuestionnaireViewModel,
    onBackToDashboard: () -> Unit,
    modifier: Modifier = Modifier
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
                                text = "Visite #${state.visiteId.takeLast(6)} | ${state.producteurNom}",
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
                        TextButton(onClick = { viewModel.saveDraftAndExit(onBackToDashboard) }) {
                            Icon(
                                imageVector = Icons.Default.Save,
                                contentDescription = "Enregistrer et Quitter",
                                modifier = Modifier.padding(end = 4.dp)
                            )
                            Text("Enregistrer & Quitter", fontWeight = FontWeight.Bold)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                )

                // Role Switcher & Draft status bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RoleBadge(
                        currentRole = state.roleUtilisateur,
                        onRoleToggle = { viewModel.setRole(it) }
                    )

                    if (state.lastSavedTimestamp != null) {
                        val sdf = SimpleDateFormat("HH:mm:ss", Locale.FRANCE)
                        val timeStr = sdf.format(Date(state.lastSavedTimestamp!!))
                        Text(
                            text = "Brouillon : $timeStr",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }
                }

                // Scrollable Section Tabs / Stepper
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SectionQuestionnaire.entries.forEach { section ->
                        val isSelected = state.activeSection == section
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.navigateToSection(section) },
                            label = {
                                Text(
                                    text = if (section == SectionQuestionnaire.SUMMARY) "Sommaire" else "Sec. ${section.code}",
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary
                            )
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
            when (state.activeSection) {
                SectionQuestionnaire.SUMMARY -> {
                    QuestionnaireSummaryScreen(
                        state = state,
                        onNavigateToSection = { viewModel.navigateToSection(it) },
                        onSaveDraft = { viewModel.autoSaveDraft() },
                        onSubmit = { viewModel.submitQuestionnaire(onBackToDashboard) }
                    )
                }
                SectionQuestionnaire.SECTION_A -> {
                    SectionAVisiteScreen(
                        state = state,
                        onUpdateA = { d, a, l, c, p, t, con -> viewModel.updateSectionA(d, a, l, c, p, t, con) },
                        onRefusTerminate = { viewModel.enregistrerRefusEtTerminer() },
                        onNext = { viewModel.nextSection() }
                    )
                }
                SectionQuestionnaire.SECTION_B -> {
                    SectionBProducteurScreen(
                        state = state,
                        onUpdateB = { n, s, a, t, c, m, e -> viewModel.updateSectionBProducteur(n, s, a, t, c, m, e) },
                        onAddOrUpdateEnfant = { viewModel.addOrUpdateEnfant(it) },
                        onDeleteEnfant = { viewModel.deleteEnfant(it) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_C -> {
                    SectionCPlantationScreen(
                        state = state,
                        onAddOrUpdatePlantation = { viewModel.addOrUpdatePlantation(it) },
                        onDeletePlantation = { viewModel.deletePlantation(it) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_D -> {
                    SectionDRecolteScreen(
                        state = state,
                        onAddOrUpdateLot = { viewModel.addOrUpdateRecolteLot(it) },
                        onDeleteLot = { viewModel.deleteRecolteLot(it) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_E -> {
                    SectionEScolarisationScreen(
                        state = state,
                        onUpdateScolarisation = { viewModel.updateScolarisation(it) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_F -> {
                    SectionFActivitesScreen(
                        state = state,
                        onUpdateActivite = { viewModel.updateActiviteEnfant(it) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_G -> {
                    SectionGObservationsScreen(
                        state = state,
                        onUpdateG = { e, t, o, p, c, sj -> viewModel.updateSectionGObservations(e, t, o, p, c, sj) },
                        onNext = { viewModel.nextSection() },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
                SectionQuestionnaire.SECTION_H -> {
                    SectionHPreventionScreen(
                        state = state,
                        onUpdateH = { f, c, b, v -> viewModel.updateSectionHPrevention(f, c, b, v) },
                        onNextToSummary = { viewModel.navigateToSection(SectionQuestionnaire.SUMMARY) },
                        onPrevious = { viewModel.previousSection() }
                    )
                }
            }
        }
    }
}
