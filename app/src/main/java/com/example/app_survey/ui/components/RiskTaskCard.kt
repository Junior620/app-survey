package com.example.app_survey.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.app_survey.data.local.entity.ReponseRisque

@Composable
fun RiskTaskCard(
    title: String,
    description: String,
    reponse: ReponseRisque,
    onReponseChange: (ReponseRisque) -> Unit,
    modifier: Modifier = Modifier,
    outilUtilise: String = "",
    onOutilChange: (String) -> Unit = {},
    frequence: String = "",
    onFrequenceChange: (String) -> Unit = {},
    enCours: Boolean = false,
    onEnCoursChange: (Boolean) -> Unit = {}
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = when (reponse) {
                ReponseRisque.OUI -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.25f)
                ReponseRisque.NON -> MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.25f)
                ReponseRisque.INCONNU -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
            }
        ),
        border = BorderStroke(
            width = if (reponse == ReponseRisque.OUI) 2.dp else 1.dp,
            color = when (reponse) {
                ReponseRisque.OUI -> MaterialTheme.colorScheme.error
                ReponseRisque.NON -> MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                ReponseRisque.INCONNU -> MaterialTheme.colorScheme.outline
            }
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (reponse == ReponseRisque.OUI) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Boutons Oui / Non / Inconnu
            Row(modifier = Modifier.fillMaxWidth()) {
                val ouiSelected = reponse == ReponseRisque.OUI
                OutlinedButton(
                    onClick = { onReponseChange(ReponseRisque.OUI) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (ouiSelected) MaterialTheme.colorScheme.error else Color.Transparent,
                        contentColor = if (ouiSelected) MaterialTheme.colorScheme.onError else MaterialTheme.colorScheme.error
                    ),
                    border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.error)
                ) {
                    Text(text = "Oui", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.width(8.dp))

                val nonSelected = reponse == ReponseRisque.NON
                OutlinedButton(
                    onClick = { onReponseChange(ReponseRisque.NON) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (nonSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                        contentColor = if (nonSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary
                    ),
                    border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
                ) {
                    Text(text = "Non", fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.width(8.dp))

                val inconnuSelected = reponse == ReponseRisque.INCONNU
                OutlinedButton(
                    onClick = { onReponseChange(ReponseRisque.INCONNU) },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (inconnuSelected) MaterialTheme.colorScheme.outline else Color.Transparent,
                        contentColor = if (inconnuSelected) Color.White else MaterialTheme.colorScheme.outline
                    )
                ) {
                    Text(text = "Inconnu")
                }
            }

            // Précisions si "OUI"
            AnimatedVisibility(visible = reponse == ReponseRisque.OUI) {
                Column(modifier = Modifier.padding(top = 12.dp)) {
                    Text(
                        text = "Précisions sur le risque :",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    OutlinedTextField(
                        value = outilUtilise,
                        onValueChange = onOutilChange,
                        label = { Text("Outil / Produit spécifique") },
                        placeholder = { Text("ex: Machette 24\", Pulvérisateur solo, sac 25kg") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = frequence,
                        onValueChange = onFrequenceChange,
                        label = { Text("Fréquence d'exposition") },
                        placeholder = { Text("ex: Tous les jours, 2x par semaine") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = enCours,
                            onCheckedChange = onEnCoursChange
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Activité actuellement EN COURS (dernier épisode récents)",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
        }
    }
}
