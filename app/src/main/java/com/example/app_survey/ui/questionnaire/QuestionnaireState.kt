package com.example.app_survey.ui.questionnaire

import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.data.local.entity.TypeVisite
import com.example.app_survey.data.local.entity.VisiteEntity

enum class SectionQuestionnaire(val code: String, val titre: String) {
    SUMMARY("SUMMARY", "Sommaire & Progrès"),
    SECTION_A("A", "Visite & Consentement"),
    SECTION_B("B", "Producteur & Enfants"),
    SECTION_C("C", "Plantations & Parcelles"),
    SECTION_D("D", "Récoltes & Lots"),
    SECTION_E("E", "Scolarisation"),
    SECTION_F("F", "Activités & Risques"),
    SECTION_G("G", "Observations Terrain"),
    SECTION_H("H", "Prévention & Signalement")
}

data class QuestionnaireState(
    // Identifiants & Rôle RBAC
    val visiteId: String = "V-" + System.currentTimeMillis().toString().takeLast(6),
    val activeSection: SectionQuestionnaire = SectionQuestionnaire.SECTION_A,
    val roleUtilisateur: RoleUtilisateur = RoleUtilisateur.CDC,
    val lastSavedTimestamp: Long? = null,
    val isDraftSaved: Boolean = false,
    val isSubmitted: Boolean = false,

    // Section A - Visite
    val dateVisite: String = "2026-09-09",
    val agentNom: String = "Agent Traoré",
    val localisation: String = "Soubré, Secteur Cacao Nord",
    val cooperative: String = "COOP-AFREXIA",
    val producteurId: String = "P-101",
    val typeVisite: TypeVisite = TypeVisite.ROUTINE,
    val consentementObtenu: Boolean = true,
    val refusEnregistre: Boolean = false,

    // Section B - Producteur & Liste unique des enfants
    val producteurNom: String = "Kouamé N'Guessan",
    val producteurSexe: String = "M",
    val producteurAgeOrIntervalle: String = "1982-04-12",
    val producteurTelephone: String = "0708091011",
    val producteurCni: String = "CI-0012394",
    val producteurMenageCount: Int = 6,
    val producteurTravailleursExtCount: Int = 2,
    val enfants: List<EnfantEntity> = emptyList(),

    // Section C - Plantations & Parcelles
    val plantations: List<PlantationEntity> = emptyList(),

    // Section D - Récoltes & Lots
    val recolteLots: List<RecolteLotEntity> = emptyList(),

    // Section E - Scolarisation
    val scolarisations: List<ScolarisationEntity> = emptyList(),

    // Section F - Activités & Risques Enfants
    val activitesEnfants: List<ActiviteEnfantEntity> = emptyList(),

    // Section G - Observations Terrain (S73)
    val enfantsVusObs: Int = 0,
    val tachesVuesObs: String = "",
    val outilsVusObs: String = "",
    val produitsVusObs: String = "",
    val contradictionsObs: Boolean = false,
    val signalementJeuneEnfantObs: Boolean = false,

    // Section H - Prévention (S74)
    val formationsRecuesPrev: String = "",
    val canalSignalementDisponible: String = "",
    val besoinsSensibilisation: String = "",
    val visitesSuiviCount: Int = 1,

    // Message de validation ou d'erreur
    val validationErrors: List<String> = emptyList()
)
