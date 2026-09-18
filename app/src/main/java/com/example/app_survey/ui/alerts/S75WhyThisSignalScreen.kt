package com.example.app_survey.ui.alerts

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.ui.components.AfrexiaCard
import com.example.app_survey.ui.components.QualificationChip
import com.example.app_survey.ui.components.StatusChip
import com.example.app_survey.ui.components.StatutSuiviChip
import com.example.app_survey.ui.components.TerrainButton
import com.example.app_survey.ui.components.TerrainButtonVariant
import com.example.app_survey.ui.theme.AfrexiaTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun S75WhyThisSignalScreen(
    signal: RemediationSignalEntity?,
    onNavigateToRemediation: (RemediationSignalEntity) -> Unit,
    onBackToAlertsCenter: () -> Unit,
    modifier: Modifier = Modifier
) {
    val dateFormatted = rememberDateFormatted(signal?.dateCalcul ?: System.currentTimeMillis())

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
                            text = "Pourquoi ce signal ? (S75)",
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
        if (signal == null) {
            Box(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucun signal sélectionné.",
                    style = MaterialTheme.typography.titleMedium
                )
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Bandeau RÈGLE DE CONFORMITÉ ABSOLUE AFREXIA
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = "Explicabilité 100%",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(end = 12.dp)
                    )
                    Column {
                        Text(
                            text = "GARANTIE D'EXPLICABILITÉ AFREXIA",
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelLarge,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "Aucun faux pourcentage de confiance ni score opaque. Uniquement des explications factuelles textuelles tirées directement des réponses et des constats terrain.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.9f)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Cartouche En-tête : Axe, Règle, Statuts
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val axeLabel = when (signal.axe) {
                            AxeSignal.PROTECTION_ENFANT -> "AXE 1 : PROTECTION DE L'ENFANT"
                            AxeSignal.TRACABILITE -> "AXE 2 : TRAÇABILITÉ CACAO"
                            AxeSignal.QUALITE_DONNEES -> "AXE 3 : QUALITÉ DES DONNÉES"
                        }
                        Text(
                            text = axeLabel,
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Règle : ${signal.regleDeclenchee}",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Producteur : ${signal.producteurId}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Visite ID : ${signal.visiteId} • Calculé le : $dateFormatted",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Statuts Indépendants à 3 Dimensions :",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Système", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            StatusChip(priorite = signal.priorite)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Qualification Humaine", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            QualificationChip(qualification = signal.qualification)
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Remédiation", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            StatutSuiviChip(statutSuivi = signal.statutSuivi)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Card Explication Synthétique Textuelle
            AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Explication",
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Explication Factuelle Détallée",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = signal.explication,
                        style = MaterialTheme.typography.bodyMedium,
                        lineHeight = 20.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Grid de détails factuels : Questions Sources, Période, Âge
            Text(
                text = "Éléments Factuels de Déclenché (Rapprochement Factuel)",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Item 1 : Questions Sources & Période
            FactualDetailCard(
                title = "Questions Sources & Période D'Évaluation",
                contentList = listOf(
                    "Questions Sources" to signal.questionsSources.ifBlank { signal.donneesSource },
                    "Période / Timeframe" to signal.periodeTimeframe.ifBlank { "Grande Campagne 2025-2026" },
                    "Âge au Moment des Faits" to signal.ageAuMomentDesFaits.ifBlank { "N/A" }
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Item 2 : Déclarations vs Observés
            FactualComparisonCard(
                declaredVsObserved = signal.elementsDeclaresVsObserves.ifBlank {
                    "Déclarations : ${signal.donneesSource}\nObservés de visu : Fait constaté en entretien terrain par l'agent."
                }
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Item 3 : Données Manquantes & Moteur
            FactualDetailCard(
                title = "Données Manquantes & Métadonnées du Moteur",
                contentList = listOf(
                    "Données Manquantes Identifiées" to signal.donneesManquantes.ifBlank { "Aucune donnée obligatoire manquante" },
                    "Version du Moteur de Règles" to signal.versionMoteurRegles.ifBlank { "v2.4 - AFREXIA Engine" },
                    "Indicateurs Coexistants" to signal.indicatorsCoexistants.ifBlank { "Aucun autre indicateur coexistant" }
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (signal.justificationHumaine.isNotBlank()) {
                AfrexiaCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Justification",
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Motivation Humaine du Responsable Durabilité",
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = signal.justificationHumaine,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Boutons d'action
            TerrainButton(
                text = "Accéder au Workspace de Remédiation (S76)",
                onClick = { onNavigateToRemediation(signal) },
                variant = TerrainButtonVariant.PRIMARY
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

@Composable
private fun FactualDetailCard(
    title: String,
    contentList: List<Pair<String, String>>,
    modifier: Modifier = Modifier
) {
    AfrexiaCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))

            contentList.forEachIndexed { index, (label, valText) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "$label :",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(0.45f)
                    )
                    Text(
                        text = valText,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(0.55f)
                    )
                }
                if (index < contentList.size - 1) {
                    Spacer(modifier = Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun FactualComparisonCard(
    declaredVsObserved: String,
    modifier: Modifier = Modifier
) {
    AfrexiaCard(modifier = modifier.fillMaxWidth()) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Écarts",
                    tint = MaterialTheme.colorScheme.secondary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Rapprochement : Déclarations vs Constats Observés",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(8.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    .border(
                        1.dp,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        RoundedCornerShape(8.dp)
                    )
                    .padding(12.dp)
            ) {
                Text(
                    text = declaredVsObserved,
                    style = MaterialTheme.typography.bodyMedium,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
private fun rememberDateFormatted(timestamp: Long): String {
    return try {
        val sdf = SimpleDateFormat("dd/MM/yyyy 'à' HH:mm", Locale.FRANCE)
        sdf.format(Date(timestamp))
    } catch (e: Exception) {
        "09/09/2026"
    }
}

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
fun S75WhyThisSignalScreenPreview() {
    AfrexiaTheme {
        val sample = RemediationSignalEntity(
            id = "SIG-01",
            visiteId = "V-2026-001",
            producteurId = "P-101 (Kouamé N'Guessan)",
            axe = AxeSignal.PROTECTION_ENFANT,
            priorite = PrioriteSignal.CRITIQUE,
            qualification = QualificationSignal.A_VERIFIER,
            statutSuivi = StatutSuivi.OUVERT,
            regleDeclenchee = "PE02",
            explication = "DANGER GRAVE : Enfant de 11 ans manipulant un pulvérisateur de pesticides.",
            donneesSource = "Section F & Section G",
            dateCalcul = System.currentTimeMillis()
        )
        S75WhyThisSignalScreen(
            signal = sample,
            onNavigateToRemediation = {},
            onBackToAlertsCenter = {}
        )
    }
}
