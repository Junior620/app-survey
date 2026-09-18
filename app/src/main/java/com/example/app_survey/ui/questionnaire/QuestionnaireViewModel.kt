package com.example.app_survey.ui.questionnaire

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.app_survey.data.local.AfrexiaDatabase
import com.example.app_survey.data.local.VisiteFullData
import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.DraftEntity
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.MethodeMesure
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.data.local.entity.TypeAge
import com.example.app_survey.data.local.entity.TypeVisite
import com.example.app_survey.data.local.entity.VisiteEntity
import com.example.app_survey.data.repository.AfrexiaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.Locale
import java.util.UUID

class QuestionnaireViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AfrexiaRepository(AfrexiaDatabase.getDatabase(application))

    private val _uiState = MutableStateFlow(QuestionnaireState())
    val uiState: StateFlow<QuestionnaireState> = _uiState.asStateFlow()

    init {
        // Initialiser avec des exemples par défaut pour le terrain
        initDefaultSampleData()
        checkExistingDraft()
    }

    private fun initDefaultSampleData() {
        val visiteId = _uiState.value.visiteId
        val producteurId = _uiState.value.producteurId

        val sampleEnfant1 = EnfantEntity(
            id = "ENF-001",
            visiteId = visiteId,
            producteurId = producteurId,
            nom = "Kouamé Jean",
            sexe = "M",
            typeAge = TypeAge.INTERVALLE_AGE_ESTIME,
            intervalleAge = "10-12 ans",
            ageEstime = 11,
            ageAuMomentDesFaits = 11,
            lienParente = "Fils"
        )

        val sampleEnfant2 = EnfantEntity(
            id = "ENF-002",
            visiteId = visiteId,
            producteurId = producteurId,
            nom = "Kouamé Aminata",
            sexe = "F",
            typeAge = TypeAge.DATE_NAISSANCE_EXACTE,
            dateNaissance = "2018-05-14",
            ageEstime = 8,
            ageAuMomentDesFaits = 8,
            lienParente = "Fille"
        )

        val samplePlantation = PlantationEntity(
            id = "PLT-001",
            producteurId = producteurId,
            superficieDeclaree = 4.5,
            superficieMesuree = 4.2,
            methodeMesure = MethodeMesure.GPS,
            coordsGps = "5.345,-4.012; 5.346,-4.011; 5.344,-4.010",
            anneeCreation = 2012,
            productionEstimee = 2800.0,
            autresCultures = "Bananes, Manioc"
        )

        val sampleLot = RecolteLotEntity(
            id = "LOT-001",
            visiteId = visiteId,
            producteurId = producteurId,
            codeLot = "LOT-2026-A1",
            periode = "Grande Campagne 2025-2026",
            origines = "Parcelle PLT-001",
            quantiteKg = 1200.0,
            fermentation = "Fermenté 6 jours",
            sechage = "Sur claies en bois",
            sacs = 18,
            peseeSource = "Bascule coopérative",
            statutLogistique = StatutLogistique.EN_TRANSIT
        )

        val sampleScol1 = ScolarisationEntity(
            id = "SCOL-001",
            visiteId = visiteId,
            producteurId = producteurId,
            enfantId = "ENF-001",
            nomEnfant = "Kouamé Jean",
            age = 11,
            lien = "Fils",
            inscrit = true,
            frequentation = "REGULIERE",
            absences30j = 2,
            motifs = "Fatigue passagère"
        )

        val sampleAct1 = ActiviteEnfantEntity(
            id = "ACT-001",
            visiteId = visiteId,
            enfantId = "ENF-001",
            participation12m = true,
            dernierEpisode = "Pendant la récolte d'octobre",
            tachesDangereuses = "machette,port_charges",
            frequence = "Hebdomadaire",
            encours = true
        )

        _uiState.update { current ->
            current.copy(
                enfants = listOf(sampleEnfant1, sampleEnfant2),
                plantations = listOf(samplePlantation),
                recolteLots = listOf(sampleLot),
                scolarisations = listOf(sampleScol1),
                activitesEnfants = listOf(sampleAct1),
                formationsRecuesPrev = "Utilisation EPI, Droits de l'enfant",
                canalSignalementDisponible = "Hotline COOP & Délégué Section",
                besoinsSensibilisation = "Gestion des emballages de pesticides"
            )
        }
        recalculateValidationErrors()
    }

    private fun checkExistingDraft() {
        viewModelScope.launch {
            val draft = repository.getLatestDraft()
            if (draft != null) {
                // Un brouillon existe
                _uiState.update { it.copy(lastSavedTimestamp = draft.horodatage) }
            }
        }
    }

    // =========================================================================
    // NAV & ROLE RBAC
    // =========================================================================

    fun setRole(role: RoleUtilisateur) {
        _uiState.update { it.copy(roleUtilisateur = role) }
    }

    fun navigateToSection(section: SectionQuestionnaire) {
        _uiState.update { it.copy(activeSection = section) }
        autoSaveDraft()
    }

    fun nextSection() {
        val sections = SectionQuestionnaire.entries
        val currentIndex = sections.indexOf(_uiState.value.activeSection)
        if (currentIndex < sections.size - 1) {
            _uiState.update { it.copy(activeSection = sections[currentIndex + 1]) }
            autoSaveDraft()
        }
    }

    fun previousSection() {
        val sections = SectionQuestionnaire.entries
        val currentIndex = sections.indexOf(_uiState.value.activeSection)
        if (currentIndex > 0) {
            _uiState.update { it.copy(activeSection = sections[currentIndex - 1]) }
            autoSaveDraft()
        }
    }

    // =========================================================================
    // SECTION A : VISITE & CONSENTEMENT
    // =========================================================================

    fun updateSectionA(
        dateVisite: String,
        agentNom: String,
        localisation: String,
        cooperative: String,
        producteurId: String,
        typeVisite: TypeVisite,
        consentementObtenu: Boolean
    ) {
        _uiState.update { current ->
            current.copy(
                dateVisite = dateVisite,
                agentNom = agentNom,
                localisation = localisation,
                cooperative = cooperative,
                producteurId = producteurId,
                typeVisite = typeVisite,
                consentementObtenu = consentementObtenu,
                refusEnregistre = !consentementObtenu
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    fun enregistrerRefusEtTerminer() {
        _uiState.update { current ->
            current.copy(
                consentementObtenu = false,
                refusEnregistre = true,
                isSubmitted = true
            )
        }
        submitQuestionnaire()
    }

    // =========================================================================
    // SECTION B : PRODUCTEUR & ENFANTS
    // =========================================================================

    fun updateSectionBProducteur(
        nom: String,
        sexe: String,
        ageOrIntervalle: String,
        telephone: String,
        cni: String,
        menage: Int,
        travailleursExt: Int
    ) {
        _uiState.update { current ->
            current.copy(
                producteurNom = nom,
                producteurSexe = sexe,
                producteurAgeOrIntervalle = ageOrIntervalle,
                producteurTelephone = telephone,
                producteurCni = cni,
                producteurMenageCount = menage,
                producteurTravailleursExtCount = travailleursExt
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    fun addOrUpdateEnfant(enfant: EnfantEntity) {
        _uiState.update { current ->
            val updatedEnfants = current.enfants.filter { it.id != enfant.id } + enfant

            // Synchroniser automatiquement avec Scolarisation (pour 5-17 ans)
            val updatedScol = current.scolarisations.toMutableList()
            if (enfant.ageEstime in 5..17) {
                val existingIndex = updatedScol.indexOfFirst { it.enfantId == enfant.id }
                if (existingIndex < 0) {
                    updatedScol.add(
                        ScolarisationEntity(
                            id = "SCOL-" + UUID.randomUUID().toString().take(6),
                            visiteId = current.visiteId,
                            producteurId = current.producteurId,
                            enfantId = enfant.id,
                            nomEnfant = enfant.nom,
                            age = enfant.ageEstime,
                            lien = enfant.lienParente,
                            inscrit = true,
                            frequentation = "REGULIERE",
                            absences30j = 0,
                            motifs = ""
                        )
                    )
                }
            } else {
                // Retirer de la scolarisation si hors de la tranche d'âge 5-17
                updatedScol.removeAll { it.enfantId == enfant.id }
            }

            current.copy(
                enfants = updatedEnfants,
                scolarisations = updatedScol
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    fun deleteEnfant(enfantId: String) {
        _uiState.update { current ->
            current.copy(
                enfants = current.enfants.filter { it.id != enfantId },
                scolarisations = current.scolarisations.filter { it.enfantId != enfantId },
                activitesEnfants = current.activitesEnfants.filter { it.enfantId != enfantId }
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION C : PLANTATIONS & PARCELLES
    // =========================================================================

    fun addOrUpdatePlantation(plantation: PlantationEntity) {
        _uiState.update { current ->
            val list = current.plantations.filter { it.id != plantation.id } + plantation
            current.copy(plantations = list)
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    fun deletePlantation(plantationId: String) {
        _uiState.update { current ->
            current.copy(plantations = current.plantations.filter { it.id != plantationId })
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION D : RÉCOLTES & LOTS
    // =========================================================================

    fun addOrUpdateRecolteLot(lot: RecolteLotEntity) {
        _uiState.update { current ->
            val list = current.recolteLots.filter { it.id != lot.id } + lot
            current.copy(recolteLots = list)
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    fun deleteRecolteLot(lotId: String) {
        _uiState.update { current ->
            current.copy(recolteLots = current.recolteLots.filter { it.id != lotId })
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION E : SCOLARISATION
    // =========================================================================

    fun updateScolarisation(scolarisation: ScolarisationEntity) {
        _uiState.update { current ->
            val list = current.scolarisations.filter { it.id != scolarisation.id } + scolarisation
            current.copy(scolarisations = list)
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION F : ACTIVITÉS & RISQUES
    // =========================================================================

    fun updateActiviteEnfant(activite: ActiviteEnfantEntity) {
        _uiState.update { current ->
            val list = current.activitesEnfants.filter { it.id != activite.id && it.enfantId != activite.enfantId } + activite
            current.copy(activitesEnfants = list)
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION G : OBSERVATIONS TERRAIN (S73)
    // =========================================================================

    fun updateSectionGObservations(
        enfantsVus: Int,
        tachesVues: String,
        outilsVus: String,
        produitsVus: String,
        contradictions: Boolean,
        signalementJeuneEnfant: Boolean
    ) {
        _uiState.update { current ->
            current.copy(
                enfantsVusObs = enfantsVus,
                tachesVuesObs = tachesVues,
                outilsVusObs = outilsVus,
                produitsVusObs = produitsVus,
                contradictionsObs = contradictions,
                signalementJeuneEnfantObs = signalementJeuneEnfant
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // SECTION H : PRÉVENTION (S74)
    // =========================================================================

    fun updateSectionHPrevention(
        formationsRecues: String,
        canalSignalement: String,
        besoins: String,
        visitesSuivi: Int
    ) {
        _uiState.update { current ->
            current.copy(
                formationsRecuesPrev = formationsRecues,
                canalSignalementDisponible = canalSignalement,
                besoinsSensibilisation = besoins,
                visitesSuiviCount = visitesSuivi
            )
        }
        recalculateValidationErrors()
        autoSaveDraft()
    }

    // =========================================================================
    // VALIDATION & CONTROLES DE SAISIE
    // =========================================================================

    private fun recalculateValidationErrors() {
        val state = _uiState.value
        val errors = mutableListOf<String>()

        if (!state.consentementObtenu) {
            errors.add("ATTENTION : Le consentement de la visite a été REFUSÉ. L'entretien s'arrête ici sans pénalité.")
            _uiState.update { it.copy(validationErrors = errors) }
            return
        }

        if (state.producteurCni.isBlank() || state.producteurCni.equals("INCONNU", ignoreCase = true)) {
            errors.add("Section B : Numéro CNI manquant ou non renseigné.")
        }

        if (state.producteurTelephone.isBlank()) {
            errors.add("Section B : Numéro de téléphone du producteur manquant.")
        }

        if (state.enfants.isEmpty() && state.producteurMenageCount > 1) {
            errors.add("Section B : Aucun enfant enregistré alors que le ménage compte ${state.producteurMenageCount} personnes.")
        }

        state.plantations.forEach { plt ->
            if (plt.coordsGps.isBlank()) {
                errors.add("Section C : Polygone / Coordonnées GPS manquants pour la parcelle #${plt.id}.")
            }
            if (plt.superficieMesuree > 0.0 && plt.superficieDeclaree > 0.0) {
                val ratio = Math.abs(plt.superficieDeclaree - plt.superficieMesuree) / plt.superficieDeclaree
                if (ratio > 0.3) {
                    errors.add("Section C : Écart de ${String.format(Locale.FRANCE, "%.0f", ratio * 100)}% entre superficie déclarée (${plt.superficieDeclaree}ha) et mesurée (${plt.superficieMesuree}ha).")
                }
            }
        }

        state.scolarisations.forEach { scol ->
            if (!scol.inscrit) {
                errors.add("Section E : L'enfant ${scol.nomEnfant} (${scol.age} ans) n'est pas scolarisé.")
            } else if (scol.absences30j > 5) {
                errors.add("Section E : Absences répétées (${scol.absences30j}j / 30) pour ${scol.nomEnfant}.")
            }
        }

        if (state.signalementJeuneEnfantObs) {
            errors.add("Section G : SIGNALEMENT CRITIQUE - Jeune enfant (< 5 ans) ou âge incertain vu en situation de risque sur le terrain.")
        }

        _uiState.update { it.copy(validationErrors = errors) }
    }

    // =========================================================================
    // SAISIE HORS-LIGNE & REPRISE (DRAFTS)
    // =========================================================================

    fun autoSaveDraft() {
        saveDraftInternal()
    }

    fun saveDraftAndExit(onComplete: () -> Unit = {}) {
        saveDraftInternal()
        onComplete()
    }

    private fun saveDraftInternal() {
        val state = _uiState.value
        val now = System.currentTimeMillis()

        viewModelScope.launch {
            val jsonObj = JSONObject().apply {
                put("visiteId", state.visiteId)
                put("producteurNom", state.producteurNom)
                put("activeSection", state.activeSection.name)
                put("consentementObtenu", state.consentementObtenu)
                put("refusEnregistre", state.refusEnregistre)
                put("enfantsCount", state.enfants.size)
                put("plantationsCount", state.plantations.size)
            }

            val draft = DraftEntity(
                id = "DRAFT-" + state.visiteId,
                visiteId = state.visiteId,
                producteurId = state.producteurId,
                activeSection = state.activeSection.name,
                horodatage = now,
                jsonContent = jsonObj.toString()
            )

            repository.saveDraft(draft)
            _uiState.update { it.copy(lastSavedTimestamp = now, isDraftSaved = true) }
        }
    }

    fun resumeDraft() {
        viewModelScope.launch {
            val draft = repository.getLatestDraft()
            if (draft != null) {
                val targetSection = try {
                    SectionQuestionnaire.valueOf(draft.activeSection)
                } catch (_: Exception) {
                    SectionQuestionnaire.SECTION_A
                }
                _uiState.update { it.copy(activeSection = targetSection) }
            }
        }
    }

    // =========================================================================
    // SUBMISSION & SAVING
    // =========================================================================

    fun submitQuestionnaire(onComplete: () -> Unit = {}) {
        val state = _uiState.value
        viewModelScope.launch {
            val visite = VisiteEntity(
                id = state.visiteId,
                date = state.dateVisite,
                agent = state.agentNom,
                localisation = state.localisation,
                cooperative = state.cooperative,
                producteurId = state.producteurId,
                typeVisite = state.typeVisite,
                consentementObtenu = state.consentementObtenu
            )

            val producteur = ProducteurEntity(
                id = state.producteurId,
                nom = state.producteurNom,
                sexe = state.producteurSexe,
                dateNaissanceOrIntervalleAge = state.producteurAgeOrIntervalle,
                telephone = state.producteurTelephone,
                cni = state.producteurCni,
                menage = state.producteurMenageCount,
                travailleursExt = state.producteurTravailleursExtCount
            )

            val obsEntity = ObservationTerrainEntity(
                id = "OBS-" + UUID.randomUUID().toString().take(6),
                visiteId = state.visiteId,
                personneId = state.producteurId,
                date = state.dateVisite,
                auteur = state.agentNom,
                enfantsVus = state.enfantsVusObs,
                tachesVues = state.tachesVuesObs,
                outilsVus = state.outilsVusObs,
                produitsVus = state.produitsVusObs,
                contradictionsDeclarations = state.contradictionsObs,
                signalementJeuneEnfant = state.signalementJeuneEnfantObs
            )

            val prevEntity = PreventionEntity(
                id = "PREV-" + UUID.randomUUID().toString().take(6),
                visiteId = state.visiteId,
                producteurId = state.producteurId,
                formationsRecues = state.formationsRecuesPrev,
                canauxSignalement = state.canalSignalementDisponible,
                visitesSuivi = state.visitesSuiviCount
            )

            val fullData = VisiteFullData(
                visite = visite,
                producteur = producteur,
                enfants = state.enfants,
                plantations = state.plantations,
                recolteLots = state.recolteLots,
                scolarisations = state.scolarisations,
                activitesEnfants = state.activitesEnfants,
                observationsTerrain = listOf(obsEntity),
                preventions = listOf(prevEntity)
            )

            repository.saveVisiteAndEvaluate(fullData)
            _uiState.update { it.copy(isSubmitted = true) }
            onComplete()
        }
    }
}
