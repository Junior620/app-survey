package com.example.app_survey.data.local

import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.data.local.entity.VisiteEntity

/**
 * Conteneur complet regroupant l'ensemble des données d'une visite terrain (Sections A à H).
 * Utilisé par le Moteur de Détection Explicable (ExplainableDetectionEngine).
 */
data class VisiteFullData(
    val visite: VisiteEntity?,
    val producteur: ProducteurEntity?,
    val enfants: List<EnfantEntity> = emptyList(),
    val plantations: List<PlantationEntity> = emptyList(),
    val recolteLots: List<RecolteLotEntity> = emptyList(),
    val scolarisations: List<ScolarisationEntity> = emptyList(),
    val activitesEnfants: List<ActiviteEnfantEntity> = emptyList(),
    val observationsTerrain: List<ObservationTerrainEntity> = emptyList(),
    val preventions: List<PreventionEntity> = emptyList()
)
