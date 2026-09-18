package com.example.app_survey.ui.questionnaire.sections

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.ReponseRisque
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.RiskTaskCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionFActivitesScreen(
    state: QuestionnaireState,
    onUpdateActivite: (ActiviteEnfantEntity) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedChildId by remember(state.enfants) {
        mutableStateOf(state.enfants.firstOrNull()?.id ?: "")
    }

    val selectedChild = state.enfants.find { it.id == selectedChildId }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section F : Activités & Tâches à Risque des Enfants",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Saisie par enfant et par épisode, évaluation des travaux dangereux en cartes interactives Oui / Non / Inconnu.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (state.enfants.isEmpty()) {
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Aucun enfant enregistré dans le ménage",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Vous pouvez ajouter des enfants en Section B ou passer directement aux observations terrain.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        } else {
            // Selecteur d'enfant
            ChildSelectorDropdown(
                children = state.enfants,
                selectedChildId = selectedChildId,
                onChildSelected = { selectedChildId = it }
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (selectedChild != null) {
                val activite = state.activitesEnfants.find { it.enfantId == selectedChild.id } ?: ActiviteEnfantEntity(
                    id = "ACT-" + selectedChild.id,
                    visiteId = state.visiteId,
                    enfantId = selectedChild.id,
                    participation12m = false,
                    dernierEpisode = "",
                    tachesDangereuses = "",
                    frequence = "Occasionnel",
                    encours = false
                )

                ChildRiskTaskEvaluator(
                    enfant = selectedChild,
                    activite = activite,
                    onUpdateActivite = onUpdateActivite
                )
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
                text = "Suivant (Section G - Observations)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildSelectorDropdown(
    children: List<EnfantEntity>,
    selectedChildId: String,
    onChildSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val currentChild = children.find { it.id == selectedChildId } ?: children.firstOrNull()

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = !expanded }
    ) {
        OutlinedTextField(
            value = currentChild?.let { "${it.nom} (${it.sexe}, ${it.ageEstime} ans)" } ?: "Sélectionner un enfant",
            onValueChange = {},
            readOnly = true,
            label = { Text("Sélection de l'Enfant à Évaluer") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .menuAnchor()
                .fillMaxWidth()
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            children.forEach { child ->
                DropdownMenuItem(
                    text = { Text("${child.nom} (${child.sexe}, ${child.ageEstime} ans) - ${child.lienParente}") },
                    onClick = {
                        onChildSelected(child.id)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
fun ChildRiskTaskEvaluator(
    enfant: EnfantEntity,
    activite: ActiviteEnfantEntity,
    onUpdateActivite: (ActiviteEnfantEntity) -> Unit
) {
    val currentTasks = remember(activite.tachesDangereuses) {
        activite.tachesDangereuses.split(",").map { it.trim().lowercase() }
    }

    fun getReponseForTask(taskKey: String): ReponseRisque {
        return if (currentTasks.contains(taskKey)) ReponseRisque.OUI
        else if (currentTasks.contains("non_$taskKey")) ReponseRisque.NON
        else ReponseRisque.INCONNU
    }

    fun updateTaskReponse(taskKey: String, reponse: ReponseRisque) {
        val updatedList = currentTasks.filter { it != taskKey && it != "non_$taskKey" }.toMutableList()
        when (reponse) {
            ReponseRisque.OUI -> updatedList.add(taskKey)
            ReponseRisque.NON -> updatedList.add("non_$taskKey")
            ReponseRisque.INCONNU -> {}
        }
        val newTachesString = updatedList.joinToString(",")
        val hasAnyOui = updatedList.any { !it.startsWith("non_") }
        onUpdateActivite(activite.copy(tachesDangereuses = newTachesString, participation12m = hasAnyOui))
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Tâches Dangereuses",
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "Évaluation des Tâches : ${enfant.nom}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Âge actuel : ${enfant.ageEstime} ans | Âge au moment des faits (S28) : ${enfant.ageAuMomentDesFaits} ans",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Checkbox participation globale 12m
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = activite.participation12m,
                    onCheckedChange = { onUpdateActivite(activite.copy(participation12m = it)) }
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Participation aux travaux de la plantation dans les 12 derniers mois",
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = activite.dernierEpisode,
                onValueChange = { onUpdateActivite(activite.copy(dernierEpisode = it)) },
                label = { Text("Période / Date du dernier épisode de travail") },
                placeholder = { Text("ex: Octobre 2025 pendant les vacances") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Grille des Tâches à Risque (Cartes Oui / Non / Inconnu)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 1. Défrichage
            RiskTaskCard(
                title = "1. Défrichage & Préparation de Sous-Bois",
                description = "Abattage, nettoyage à la machette, essartage et brûlage de sous-bois.",
                reponse = getReponseForTask("defrichage"),
                onReponseChange = { updateTaskReponse("defrichage", it) },
                frequence = activite.frequence,
                onFrequenceChange = { onUpdateActivite(activite.copy(frequence = it)) },
                enCours = activite.encours,
                onEnCoursChange = { onUpdateActivite(activite.copy(encours = it)) }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 2. Outils tranchants
            RiskTaskCard(
                title = "2. Utilisation d'Outils Tranchants Lourds",
                description = "Machettes, haches, émondoirs, tronçonneuses, gaufreuses.",
                reponse = getReponseForTask("machette"),
                onReponseChange = { updateTaskReponse("machette", it) },
                frequence = activite.frequence,
                onFrequenceChange = { onUpdateActivite(activite.copy(frequence = it)) },
                enCours = activite.encours,
                onEnCoursChange = { onUpdateActivite(activite.copy(encours = it)) }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 3. Pesticides
            RiskTaskCard(
                title = "3. Produits Chimiques & Pesticides",
                description = "Application, mélange, transport de pulvérisateur ou produits phytosanitaires.",
                reponse = getReponseForTask("pesticides"),
                onReponseChange = { updateTaskReponse("pesticides", it) },
                frequence = activite.frequence,
                onFrequenceChange = { onUpdateActivite(activite.copy(frequence = it)) },
                enCours = activite.encours,
                onEnCoursChange = { onUpdateActivite(activite.copy(encours = it)) }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 4. Port de charges
            RiskTaskCard(
                title = "4. Port de Charges Lourdes (> 10-15 kg)",
                description = "Transport de sacs de cacao, bidons d'eau, bois de chauffe sur longue distance.",
                reponse = getReponseForTask("port_charges"),
                onReponseChange = { updateTaskReponse("port_charges", it) },
                frequence = activite.frequence,
                onFrequenceChange = { onUpdateActivite(activite.copy(frequence = it)) },
                enCours = activite.encours,
                onEnCoursChange = { onUpdateActivite(activite.copy(encours = it)) }
            )

            Spacer(modifier = Modifier.height(10.dp))

            // 5. Travail de nuit
            RiskTaskCard(
                title = "5. Travail de Nuit & Longues Heures",
                description = "Activité avant 6h du matin, après 18h ou plus de 4 heures d'affilée les jours d'école.",
                reponse = getReponseForTask("nuit"),
                onReponseChange = { updateTaskReponse("nuit", it) },
                frequence = activite.frequence,
                onFrequenceChange = { onUpdateActivite(activite.copy(frequence = it)) },
                enCours = activite.encours,
                onEnCoursChange = { onUpdateActivite(activite.copy(encours = it)) }
            )
        }
    }
}
