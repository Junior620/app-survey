package com.example.app_survey.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.ui.theme.StatusCritique
import com.example.app_survey.ui.theme.StatusCritiqueBg
import com.example.app_survey.ui.theme.StatusCritiqueText
import com.example.app_survey.ui.theme.StatusEleve
import com.example.app_survey.ui.theme.StatusEleveBg
import com.example.app_survey.ui.theme.StatusEleveText
import com.example.app_survey.ui.theme.StatusFaible
import com.example.app_survey.ui.theme.StatusFaibleBg
import com.example.app_survey.ui.theme.StatusFaibleText
import com.example.app_survey.ui.theme.StatusModere
import com.example.app_survey.ui.theme.StatusModereBg
import com.example.app_survey.ui.theme.StatusModereText
import com.example.app_survey.ui.theme.StatusNonEvaluable
import com.example.app_survey.ui.theme.StatusNonEvaluableBg
import com.example.app_survey.ui.theme.StatusNonEvaluableText
import com.example.app_survey.ui.theme.StatusNonEvalue
import com.example.app_survey.ui.theme.StatusNonEvalueBg
import com.example.app_survey.ui.theme.StatusNonEvalueText

/**
 * Puce de statut colorée AFREXIA pour l'affichage de la priorité des signaux.
 */
@Composable
fun StatusChip(
    priorite: PrioriteSignal,
    modifier: Modifier = Modifier
) {
    val (label, bgColor, textColor, borderColor) = when (priorite) {
        PrioriteSignal.CRITIQUE -> Quadruple(
            "CRITIQUE",
            StatusCritiqueBg,
            StatusCritiqueText,
            StatusCritique
        )
        PrioriteSignal.ELEVE -> Quadruple(
            "ÉLEVÉ",
            StatusEleveBg,
            StatusEleveText,
            StatusEleve
        )
        PrioriteSignal.MODERE -> Quadruple(
            "MODÉRÉ",
            StatusModereBg,
            StatusModereText,
            StatusModere
        )
        PrioriteSignal.FAIBLE -> Quadruple(
            "FAIBLE",
            StatusFaibleBg,
            StatusFaibleText,
            StatusFaible
        )
        PrioriteSignal.NON_EVALUABLE -> Quadruple(
            "NON ÉVALUABLE",
            StatusNonEvaluableBg,
            StatusNonEvaluableText,
            StatusNonEvaluable
        )
        PrioriteSignal.NON_EVALUE -> Quadruple(
            "NON ÉVALUÉ",
            StatusNonEvalueBg,
            StatusNonEvalueText,
            StatusNonEvalue
        )
    }

    ChipContainer(
        label = label,
        bgColor = bgColor,
        textColor = textColor,
        borderColor = borderColor,
        modifier = modifier
    )
}

/**
 * Puce de qualification humaine AFREXIA (S52-S57).
 */
@Composable
fun QualificationChip(
    qualification: QualificationSignal,
    modifier: Modifier = Modifier
) {
    val (label, bgColor, textColor, borderColor) = when (qualification) {
        QualificationSignal.A_VERIFIER -> Quadruple(
            "À VÉRIFIER",
            Color(0xFFFFF8E1),
            Color(0xFFF57F17),
            Color(0xFFFBC02D)
        )
        QualificationSignal.EN_VERIFICATION -> Quadruple(
            "EN VÉRIFICATION",
            Color(0xFFE3F2FD),
            Color(0xFF1565C0),
            Color(0xFF1E88E5)
        )
        QualificationSignal.CONFIRME -> Quadruple(
            "CONFIRMÉ",
            Color(0xFFFFEBEE),
            Color(0xFFC62828),
            Color(0xFFE53935)
        )
        QualificationSignal.REFUTE -> Quadruple(
            "RÉFUTÉ",
            Color(0xFFF3E5F5),
            Color(0xFF6A1B9A),
            Color(0xFF8E24AA)
        )
    }

    ChipContainer(
        label = label,
        bgColor = bgColor,
        textColor = textColor,
        borderColor = borderColor,
        modifier = modifier
    )
}

/**
 * Puce de statut de suivi de la remédiation AFREXIA (S52-S57 / S76).
 */
@Composable
fun StatutSuiviChip(
    statutSuivi: StatutSuivi,
    modifier: Modifier = Modifier
) {
    val (label, bgColor, textColor, borderColor) = when (statutSuivi) {
        StatutSuivi.OUVERT -> Quadruple(
            "OUVERT",
            Color(0xFFFFEBEE),
            Color(0xFFB71C1C),
            Color(0xFFD32F2F)
        )
        StatutSuivi.EN_COURS -> Quadruple(
            "EN COURS",
            Color(0xFFFFF3E0),
            Color(0xFFE65100),
            Color(0xFFF57C00)
        )
        StatutSuivi.RESOLU -> Quadruple(
            "RÉSOLU",
            Color(0xE8E8F5E9),
            Color(0xFF1B5E20),
            Color(0xFF2E7D32)
        )
        StatutSuivi.A_REEVALUER -> Quadruple(
            "À RÉÉVALUER",
            Color(0xFFEDE7F6),
            Color(0xFF4A148C),
            Color(0xFF7B1FA2)
        )
    }

    ChipContainer(
        label = label,
        bgColor = bgColor,
        textColor = textColor,
        borderColor = borderColor,
        modifier = modifier
    )
}

@Composable
private fun ChipContainer(
    label: String,
    bgColor: Color,
    textColor: Color,
    borderColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(bgColor)
            .border(1.dp, borderColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(borderColor)
            )
            Text(
                text = label,
                color = textColor,
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                ),
                modifier = Modifier.padding(start = 6.dp)
            )
        }
    }
}

private data class Quadruple<A, B, C, D>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D
)
