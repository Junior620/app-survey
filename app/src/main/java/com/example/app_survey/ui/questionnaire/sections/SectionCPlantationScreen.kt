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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.AlertDialog
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
import com.example.app_survey.data.local.entity.MethodeMesure
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.questionnaire.QuestionnaireState

@Composable
fun SectionCPlantationScreen(
    state: QuestionnaireState,
    onAddOrUpdatePlantation: (PlantationEntity) -> Unit,
    onDeletePlantation: (String) -> Unit,
    onNext: () -> Unit,
    onPrevious: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showAddPlotDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text(
            text = "Section C : Plantation & Parcelles",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = "Gestion par parcelle, comparaison superficie déclarée vs mesurée distinctes, méthode de mesure et géolocalisation GPS.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Liste des Parcelles / Cartographie",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${state.plantations.size} parcelle(s) enregistrée(s)",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }

                    TerrainButton(
                        text = "+ Parcelle",
                        onClick = { showAddPlotDialog = true },
                        variant = TerrainButtonVariant.PRIMARY
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (state.plantations.isEmpty()) {
                    Text(
                        text = "Aucune parcelle ajoutée. Cliquez sur '+ Parcelle' pour enregistrer une parcelle avec ses coordonnées GPS.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 12.dp)
                    )
                } else {
                    state.plantations.forEach { plt ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Parcelle #${plt.id}",
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.titleSmall
                                    )

                                    IconButton(onClick = { onDeletePlantation(plt.id) }) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Supprimer parcelle",
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(modifier = Modifier.fillMaxWidth()) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Superficie Déclarée :",
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                        Text(
                                            text = "${plt.superficieDeclaree} ha",
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Superficie Mesurée :",
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                        Text(
                                            text = "${plt.superficieMesuree} ha",
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Text(
                                    text = "Méthode de Mesure : ${plt.methodeMesure} | Année : ${plt.anneeCreation}",
                                    style = MaterialTheme.typography.bodySmall
                                )

                                Spacer(modifier = Modifier.height(4.dp))

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "GPS",
                                        tint = MaterialTheme.colorScheme.tertiary,
                                        modifier = Modifier.padding(end = 4.dp)
                                    )
                                    Text(
                                        text = if (plt.coordsGps.isBlank()) "Coordonnées GPS non saisies" else "Polygone GPS : ${plt.coordsGps}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.tertiary
                                    )
                                }
                            }
                        }
                    }
                }
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
                text = "Suivant (Section D - Récoltes)",
                onClick = onNext,
                variant = TerrainButtonVariant.PRIMARY,
                modifier = Modifier.weight(1.5f)
            )
        }
    }

    if (showAddPlotDialog) {
        AddPlotModalDialog(
            producteurId = state.producteurId,
            onDismiss = { showAddPlotDialog = false },
            onConfirm = { newPlot ->
                onAddOrUpdatePlantation(newPlot)
                showAddPlotDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddPlotModalDialog(
    producteurId: String,
    onDismiss: () -> Unit,
    onConfirm: (PlantationEntity) -> Unit
) {
    var supDeclaree by remember { mutableStateOf("4.5") }
    var supMesuree by remember { mutableStateOf("4.2") }
    var methode by remember { mutableStateOf(MethodeMesure.GPS) }
    var coordsGps by remember { mutableStateOf("5.345,-4.012; 5.346,-4.011; 5.344,-4.010") }
    var anneeCreation by remember { mutableStateOf("2014") }
    var prodEstimee by remember { mutableStateOf("2500") }
    var autresCultures by remember { mutableStateOf("Banane Douce, Manioc") }

    var expandedMethode by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouvelle Parcelle / Plantation") },
        text = {
            Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = supDeclaree,
                        onValueChange = { supDeclaree = it },
                        label = { Text("Sup. Déclarée (ha)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.width(8.dp))

                    OutlinedTextField(
                        value = supMesuree,
                        onValueChange = { supMesuree = it },
                        label = { Text("Sup. Mesurée (ha)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                ExposedDropdownMenuBox(
                    expanded = expandedMethode,
                    onExpandedChange = { expandedMethode = !expandedMethode }
                ) {
                    OutlinedTextField(
                        value = when (methode) {
                            MethodeMesure.GPS -> "GPS - Relevé Polygone"
                            MethodeMesure.MANUEL -> "Mesure Manuelle (Decamètre)"
                            MethodeMesure.ESTIMATION -> "Estimation Visuelle"
                        },
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Méthode de Mesure") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedMethode) },
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth()
                    )

                    ExposedDropdownMenu(
                        expanded = expandedMethode,
                        onDismissRequest = { expandedMethode = false }
                    ) {
                        MethodeMesure.entries.forEach { m ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        when (m) {
                                            MethodeMesure.GPS -> "GPS - Relevé Polygone"
                                            MethodeMesure.MANUEL -> "Mesure Manuelle (Decamètre)"
                                            MethodeMesure.ESTIMATION -> "Estimation Visuelle"
                                        }
                                    )
                                },
                                onClick = {
                                    methode = m
                                    expandedMethode = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = coordsGps,
                    onValueChange = { coordsGps = it },
                    label = { Text("Coordonnées GPS / Polygone (Lat,Long;...)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(6.dp))

                TerrainButton(
                    text = "Simuler Relevé GPS Terrain",
                    onClick = {
                        coordsGps = "5.3481,-4.0152; 5.3490,-4.0140; 5.3475,-4.0135"
                    },
                    variant = TerrainButtonVariant.SECONDARY
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = anneeCreation,
                    onValueChange = { anneeCreation = it },
                    label = { Text("Année de Création") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = prodEstimee,
                    onValueChange = { prodEstimee = it },
                    label = { Text("Production Estimée (kg)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = autresCultures,
                    onValueChange = { autresCultures = it },
                    label = { Text("Autres Cultures associées") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val sDecl = supDeclaree.toDoubleOrNull() ?: 0.0
                    val sMes = supMesuree.toDoubleOrNull() ?: 0.0
                    val annee = anneeCreation.toIntOrNull() ?: 2015
                    val prod = prodEstimee.toDoubleOrNull() ?: 0.0

                    val plot = PlantationEntity(
                        id = "PLT-" + System.currentTimeMillis().toString().takeLast(5),
                        producteurId = producteurId,
                        superficieDeclaree = sDecl,
                        superficieMesuree = sMes,
                        methodeMesure = methode,
                        coordsGps = coordsGps,
                        anneeCreation = annee,
                        productionEstimee = prod,
                        autresCultures = autresCultures
                    )
                    onConfirm(plot)
                }
            ) {
                Text("Ajouter la Parcelle")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
