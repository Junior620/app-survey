package com.example.app_survey.ui.questionnaire.sections

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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ChildCare
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Face
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.TypeAge
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionBProducteurScreen(
    state: QuestionnaireState,
    onUpdateB: (String, String, String, String, String, Int, Int) -> Unit,
    onAddOrUpdateEnfant: (EnfantEntity) -> Unit,
    onDeleteEnfant: (String) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddEnfantDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section B : Producteur & Liste Unique des Enfants",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Informations sur le planteur, la taille du ménage et enregistrement unique des enfants du ménage (S26-S28).",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Identification Producteur
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(
                    text = "Identité du Producteur",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = state.producteurNom,
                    onValueChange = { onUpdateB(it, state.producteurSexe, state.producteurAgeOrIntervalle, state.producteurTelephone, state.producteurCni, state.producteurMenageCount, state.producteurTravailleursExtCount) },
                    label = { Text("Nom et Prénoms") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Sexe : ", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(8.dp))
                    RadioButton(
                        selected = state.producteurSexe == "M",
                        onClick = { onUpdateB(state.producteurNom, "M", state.producteurAgeOrIntervalle, state.producteurTelephone, state.producteurCni, state.producteurMenageCount, state.producteurTravailleursExtCount) }
                    )
                    Text("Masculin")
                    Spacer(modifier = Modifier.width(16.dp))
                    RadioButton(
                        selected = state.producteurSexe == "F",
                        onClick = { onUpdateB(state.producteurNom, "F", state.producteurAgeOrIntervalle, state.producteurTelephone, state.producteurCni, state.producteurMenageCount, state.producteurTravailleursExtCount) }
                    )
                    Text("Féminin")
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.producteurCni,
                    onValueChange = { onUpdateB(state.producteurNom, state.producteurSexe, state.producteurAgeOrIntervalle, state.producteurTelephone, it, state.producteurMenageCount, state.producteurTravailleursExtCount) },
                    label = { Text("Numéro CNI / Pièce d'Identité") },
                    placeholder = { Text("ex: CI-00123944") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = state.producteurTelephone,
                    onValueChange = { onUpdateB(state.producteurNom, state.producteurSexe, state.producteurAgeOrIntervalle, it, state.producteurCni, state.producteurMenageCount, state.producteurTravailleursExtCount) },
                    label = { Text("Téléphone de Contact") },
                    placeholder = { Text("ex: 0708091011") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = state.producteurMenageCount.toString(),
                        onValueChange = {
                            val count = it.toIntOrNull() ?: 1
                            onUpdateB(state.producteurNom, state.producteurSexe, state.producteurAgeOrIntervalle, state.producteurTelephone, state.producteurCni, count, state.producteurTravailleursExtCount)
                        },
                        label = { Text("Taille du Ménage") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = state.producteurTravailleursExtCount.toString(),
                        onValueChange = {
                            val count = it.toIntOrNull() ?: 0
                            onUpdateB(state.producteurNom, state.producteurSexe, state.producteurAgeOrIntervalle, state.producteurTelephone, state.producteurCni, state.producteurMenageCount, count)
                        },
                        label = { Text("Travailleurs Ext.") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Section Liste Unique des Enfants du Ménage
        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Membres Enfants du Ménage",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Liste unique sans duplication dans d'autres sections",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    TerrainButton(
                        text = "+ Enfant",
                        onClick = { showAddEnfantDialog = true },
                        variant = TerrainButtonVariant.PRIMARY
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (state.enfants.isEmpty()) {
                    Text(
                        text = "Aucun enfant enregistré pour le moment. Cliquez sur '+ Enfant' pour ajouter un membre.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                } else {
                    state.enfants.forEach { enfant ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = if (enfant.ageEstime < 5) Icons.Default.ChildCare else Icons.Default.Face,
                                        contentDescription = "Enfant",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(
                                            text = "${enfant.nom} (${enfant.sexe})",
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.titleSmall
                                        )
                                        Text(
                                            text = if (enfant.typeAge == TypeAge.DATE_NAISSANCE_EXACTE)
                                                "Né(e) le : ${enfant.dateNaissance} (${enfant.ageEstime} ans)"
                                            else
                                                "Tranche d'âge : ${enfant.intervalleAge} (${enfant.ageEstime} ans)",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                        Text(
                                            text = "Lien : ${enfant.lienParente} | Âge aux faits : ${enfant.ageAuMomentDesFaits} ans",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                    }
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (enfant.ageEstime in 5..17) {
                                        AssistChip(
                                            onClick = {},
                                            label = { Text("5-17 ans", style = MaterialTheme.typography.labelSmall) },
                                            colors = AssistChipDefaults.assistChipColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                                        )
                                    } else {
                                        AssistChip(
                                            onClick = {},
                                            label = { Text("< 5 ans", style = MaterialTheme.typography.labelSmall) },
                                            colors = AssistChipDefaults.assistChipColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                                        )
                                    }

                                    IconButton(onClick = { onDeleteEnfant(enfant.id) }) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Supprimer enfant",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Navigation buttons
        Row(modifier = Modifier.fillMaxWidth()) {
            TerrainButton(
                text = "Précédent",
                onClick = onPrevious,
                variant = TerrainButtonVariant.SECONDARY,
                modifier = Modifier.weight(1f)
            )

            Spacer(modifier = Modifier.width(12.dp))

            TerrainButton(
                text = "Suivant (Section C - Plantations)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }

    // Modal Dialog d'ajout d'enfant (S26-S28)
    if (showAddEnfantDialog) {
        AddEnfantModalDialog(
            visiteId = state.visiteId,
            producteurId = state.producteurId,
            onDismiss = { showAddEnfantDialog = false },
            onConfirm = { newEnfant ->
                onAddOrUpdateEnfant(newEnfant)
                showAddEnfantDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEnfantModalDialog(
    visiteId: String,
    producteurId: String,
    onDismiss: () -> Unit,
    onConfirm: (EnfantEntity) -> Unit
) {
    var nom by remember { mutableStateOf("") }
    var sexe by remember { mutableStateOf("M") }
    var typeAge by remember { mutableStateOf(TypeAge.INTERVALLE_AGE_ESTIME) }
    var dateNaissance by remember { mutableStateOf("") }
    var intervalleAge by remember { mutableStateOf("10-12 ans") }
    var ageAuMomentDesFaits by remember { mutableStateOf("11") }
    var lienParente by remember { mutableStateOf("Enfant") }

    var expandedIntervalle by remember { mutableStateOf(false) }

    val meIntervals = listOf("< 5 ans", "5-9 ans", "10-12 ans", "13-15 ans", "16-17 ans")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle Fiche Enfant (S26-S28)") },
        text = {
            Column {
                OutlinedTextField(
                    value = nom,
                    onValueChange = { nom = it },
                    label = { Text("Nom et Prénom de l'Enfant") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Sexe : ")
                    RadioButton(selected = sexe == "M", onClick = { sexe = "M" })
                    Text("M")
                    Spacer(modifier = Modifier.width(8.dp))
                    RadioButton(selected = sexe == "F", onClick = { sexe = "F" })
                    Text("F")
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text("Fiabilité de la Date de Naissance :", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelLarge)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(
                        selected = typeAge == TypeAge.INTERVALLE_AGE_ESTIME,
                        onClick = { typeAge = TypeAge.INTERVALLE_AGE_ESTIME }
                    )
                    Text("Intervalle Estimé", style = MaterialTheme.typography.bodySmall)

                    Spacer(modifier = Modifier.width(8.dp))

                    RadioButton(
                        selected = typeAge == TypeAge.DATE_NAISSANCE_EXACTE,
                        onClick = { typeAge = TypeAge.DATE_NAISSANCE_EXACTE }
                    )
                    Text("Date Exacte", style = MaterialTheme.typography.bodySmall)
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (typeAge == TypeAge.DATE_NAISSANCE_EXACTE) {
                    OutlinedTextField(
                        value = dateNaissance,
                        onValueChange = { dateNaissance = it },
                        label = { Text("Date de Naissance Fiable (AAAA-MM-JJ)") },
                        placeholder = { Text("2015-08-20") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                } else {
                    ExposedDropdownMenuBox(
                        expanded = expandedIntervalle,
                        onExpandedChange = { expandedIntervalle = !expandedIntervalle }
                    ) {
                        OutlinedTextField(
                            value = intervalleAge,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Intervalle d'Âge Estimé") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedIntervalle) },
                            modifier = Modifier
                                .menuAnchor()
                                .fillMaxWidth()
                        )

                        ExposedDropdownMenu(
                            expanded = expandedIntervalle,
                            onDismissRequest = { expandedIntervalle = false }
                        ) {
                            meIntervals.forEach { interval ->
                                DropdownMenuItem(
                                    text = { Text(interval) },
                                    onClick = {
                                        intervalleAge = interval
                                        expandedIntervalle = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = ageAuMomentDesFaits,
                    onValueChange = { ageAuMomentDesFaits = it },
                    label = { Text("Âge au moment des faits (S28)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = lienParente,
                    onValueChange = { lienParente = it },
                    label = { Text("Lien de Parenté") },
                    placeholder = { Text("Fils, Fille, Neveu, Nièce...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val calcAge = if (typeAge == TypeAge.DATE_NAISSANCE_EXACTE) {
                        2026 - (dateNaissance.take(4).toIntOrNull() ?: 2015)
                    } else {
                        when (intervalleAge) {
                            "< 5 ans" -> 3
                            "5-9 ans" -> 7
                            "10-12 ans" -> 11
                            "13-15 ans" -> 14
                            "16-17 ans" -> 16
                            else -> 10
                        }
                    }

                    val ageFaits = ageAuMomentDesFaits.toIntOrNull() ?: calcAge

                    val entity = EnfantEntity(
                        id = "ENF-" + System.currentTimeMillis().toString().takeLast(6),
                        visiteId = visiteId,
                        producteurId = producteurId,
                        nom = if (nom.isBlank()) "Enfant Anonyme" else nom,
                        sexe = sexe,
                        typeAge = typeAge,
                        dateNaissance = if (typeAge == TypeAge.DATE_NAISSANCE_EXACTE) dateNaissance else null,
                        intervalleAge = if (typeAge == TypeAge.INTERVALLE_AGE_ESTIME) intervalleAge else null,
                        ageEstime = calcAge,
                        ageAuMomentDesFaits = ageFaits,
                        lienParente = lienParente
                    )
                    onConfirm(entity)
                }
            ) {
                Text("Enregistrer L'Enfant")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
