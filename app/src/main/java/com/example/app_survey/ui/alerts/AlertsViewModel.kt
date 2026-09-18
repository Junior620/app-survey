package com.example.app_survey.ui.alerts

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.app_survey.data.local.AfrexiaDatabase
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.RoleUtilisateur
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.data.repository.AfrexiaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AlertsTab {
    ALERTS_CENTER,      // S52-S57
    WHY_SIGNAL,         // S75
    REMEDIATION_WORKSPACE // S76
}

data class AlertsUiState(
    val activeTab: AlertsTab = AlertsTab.ALERTS_CENTER,
    val roleUtilisateur: RoleUtilisateur = RoleUtilisateur.RESPONSABLE_DURABILITE,
    val searchQuery: String = "",
    val selectedAxe: AxeSignal? = null,
    val selectedPriorite: PrioriteSignal? = null,
    val selectedQualification: QualificationSignal? = null,
    val selectedStatutSuivi: StatutSuivi? = null,
    val signaux: List<RemediationSignalEntity> = emptyList(),
    val selectedSignal: RemediationSignalEntity? = null,
    val justificationError: String? = null,
    val successMessage: String? = null
)

class AlertsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AfrexiaRepository(AfrexiaDatabase.getDatabase(application))

    private val _uiState = MutableStateFlow(AlertsUiState())
    val uiState: StateFlow<AlertsUiState> = _uiState.asStateFlow()

    init {
        observeSignaux()
    }

    private fun observeSignaux() {
        viewModelScope.launch {
            repository.observeAllSignaux().collect { dbSignaux ->
                if (dbSignaux.isEmpty()) {
                    val defaultSignaux = createDefaultSampleSignals()
                    defaultSignaux.forEach { repository.saveSignal(it) }
                } else {
                    _uiState.update { current ->
                        current.copy(
                            signaux = dbSignaux,
                            selectedSignal = current.selectedSignal ?: dbSignaux.firstOrNull()
                        )
                    }
                }
            }
        }
    }

    private fun createDefaultSampleSignals(): List<RemediationSignalEntity> {
        val sig1 = RemediationSignalEntity(
            id = "SIG-2026-PE01",
            visiteId = "V-2026-001",
            producteurId = "P-101 (Kouamé N'Guessan)",
            axe = AxeSignal.PROTECTION_ENFANT,
            priorite = PrioriteSignal.CRITIQUE,
            qualification = QualificationSignal.A_VERIFIER,
            statutSuivi = StatutSuivi.OUVERT,
            regleDeclenchee = "PE02 - Travail Dangereux Jeune Enfant",
            explication = "Constat direct terrain : Enfant de 11 ans aperçu manipulant un pulvérisateur de produits phytosanitaires sans équipement de protection (EPI).",
            donneesSource = "Section F - Q12 (Tâches à risque), Section G - Q03 (Constats directs terrain)",
            dateCalcul = System.currentTimeMillis() - 86400000L,
            questionsSources = "Section F (Activités Enfant - Q12) & Section G (Constat Visuel Direct - Q03)",
            periodeTimeframe = "Grande Campagne 2025-2026 (Constat du 09/09/2026)",
            ageAuMomentDesFaits = "11 ans (Enfant Yao Kouassi, né le 14/03/2015)",
            elementsDeclaresVsObserves = "Déclaré par le parent : Aucune activité pénible ou dangereuse confiée aux enfants du ménage.\nObservé sur la parcelle : Manipulation directe d'un fût de pesticides et présence à proximité immédiate de la zone d'épandage.",
            donneesManquantes = "Attestation d'inscription scolaire non fournie pour l'année 2025-2026; Fiche EPI non signée.",
            versionMoteurRegles = "v2.4 - AFREXIA Engine (Règle PE02)",
            justificationHumaine = "",
            actionsPrevues = "1. Retrait immédiat de l'enfant des travaux à risque.\n2. Inscription au programme de kits scolaires COOP.\n3. Visite de suivi par l'agent relais sous 14 jours.",
            actionsRealisees = "Signalement transmis au Délégué de Section Soubré Nord.",
            responsableDesigne = "Kouassi Jean (Responsable Durabilité Section Soubré)",
            echeance = "2026-09-25",
            visitesTerrainSuivi = "Visite #1 programmée le 2026-09-18",
            obstaclesRencontres = "Éloignement de la parcelle (accès difficile en période de pluies).",
            notesInvestigation = "Entretien téléphonique préalable avec le planteur Kouamé N'Guessan effectué le 08/09/2026.",
            indicatorsCoexistants = "Indicateur Coexistant #TR01 (Mélange de lots suspects) noté sur le même secteur."
        )

        val sig2 = RemediationSignalEntity(
            id = "SIG-2026-TR01",
            visiteId = "V-2026-001",
            producteurId = "P-101 (Kouamé N'Guessan)",
            axe = AxeSignal.TRACABILITE,
            priorite = PrioriteSignal.ELEVE,
            qualification = QualificationSignal.EN_VERIFICATION,
            statutSuivi = StatutSuivi.EN_COURS,
            regleDeclenchee = "TR01 - Écart Rendement / Superficie Suspect",
            explication = "Rendement déclaré de 1800 kg/ha supérieur au seuil maximal biologiquement crédible (1500 kg/ha). Suspicions de cacao infiltré hors périmètre certifié.",
            donneesSource = "Section C - Q02 (Superficie GPS), Section D - Q05 (Poids total livré)",
            dateCalcul = System.currentTimeMillis() - 172800000L,
            questionsSources = "Section C - Q02 (Superficie mesurée GPS) & Section D - Q05 (Poids total livré)",
            periodeTimeframe = "Grande Campagne 2025-2026 (Cumul récoltes T3 2026)",
            ageAuMomentDesFaits = "N/A (Évaluation de la capacité de production)",
            elementsDeclaresVsObserves = "Superficie mesurée GPS : 1.2 ha.\nVolume livré : 2 160 kg (Ratio de 1800 kg/ha vs norme régionale 800-1100 kg/ha).",
            donneesManquantes = "Polygone GPS révisé de la parcelle contiguë non encore importé.",
            versionMoteurRegles = "v2.4 - AFREXIA Engine (Règle TR01)",
            justificationHumaine = "Dossier ouvert pour vérification avec le géomètre de la coopérative.",
            actionsPrevues = "Re-cartographie polygonale complète de la parcelle PLT-002 avec GPS différentiel.",
            actionsRealisees = "Blocage temporaire du bordereau BL-2026-088 au magasin central.",
            responsableDesigne = "Bamba Bakary (Responsable Traçabilité & SIG)",
            echeance = "2026-09-20",
            visitesTerrainSuivi = "Visite géomètre prévue le 2026-09-15",
            obstaclesRencontres = "Couverture satellite GPS instable sous ombrage dense.",
            notesInvestigation = "Le producteur soutient avoir acquis une petite parcelle contiguë non encore déclarée.",
            indicatorsCoexistants = "Aucun autre indicateur coexistant."
        )

        val sig3 = RemediationSignalEntity(
            id = "SIG-2026-QD01",
            visiteId = "V-2026-002",
            producteurId = "P-102 (Yao Boti)",
            axe = AxeSignal.QUALITE_DONNEES,
            priorite = PrioriteSignal.MODERE,
            qualification = QualificationSignal.CONFIRME,
            statutSuivi = StatutSuivi.OUVERT,
            regleDeclenchee = "QD03 - Numéro CNI Manquant & Incohérence Âge",
            explication = "Numéro de pièce d'identité (CNI) non renseigné pour le planteur principal Yao Boti. Donnée obligatoire pour la certification d'équité.",
            donneesSource = "Section B - Q04 (Pièce d'identité CNI)",
            dateCalcul = System.currentTimeMillis() - 259200000L,
            questionsSources = "Section B - Q04 (Pièce d'identité CNI / Récépissé ONECI)",
            periodeTimeframe = "Visite Annuelle 2026",
            ageAuMomentDesFaits = "N/A (Données d'identification)",
            elementsDeclaresVsObserves = "CNI déclarée : 'EN COURS DE RENOUVELLEMENT'.\nJustificatif visuel : Aucun document scanné ou attaché.",
            donneesManquantes = "Scan du récépissé ONECI ou photo de la pièce d'identité.",
            versionMoteurRegles = "v2.4 - AFREXIA Engine (Règle QD03)",
            justificationHumaine = "Confirmé par le responsable : le planteur a déposé son dossier mais n'a pas encore reçu son récépissé officiel.",
            actionsPrevues = "Rappeler au planteur d'apporter son récépissé lors de la réunion de section du 22 septembre.",
            actionsRealisees = "Relance téléphonique effectuée le 07/09/2026.",
            responsableDesigne = "Agent CDC Traoré",
            echeance = "2026-09-30",
            visitesTerrainSuivi = "Prochaine visite lors de la collecte du 22/09",
            obstaclesRencontres = "Délais administratifs d'obtention de CNI en zone rurale.",
            notesInvestigation = "Justification motivée saisie lors du contrôle administratif.",
            indicatorsCoexistants = "Aucun"
        )

        return listOf(sig1, sig2, sig3)
    }

    fun setRole(role: RoleUtilisateur) {
        _uiState.update { it.copy(roleUtilisateur = role) }
    }

    fun selectTab(tab: AlertsTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    fun selectSignal(signal: RemediationSignalEntity) {
        _uiState.update { it.copy(selectedSignal = signal) }
    }

    fun navigateToWhySignal(signal: RemediationSignalEntity) {
        _uiState.update { it.copy(selectedSignal = signal, activeTab = AlertsTab.WHY_SIGNAL) }
    }

    fun navigateToRemediation(signal: RemediationSignalEntity) {
        _uiState.update { it.copy(selectedSignal = signal, activeTab = AlertsTab.REMEDIATION_WORKSPACE) }
    }

    fun navigateToAlertsCenter() {
        _uiState.update { it.copy(activeTab = AlertsTab.ALERTS_CENTER) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun setSelectedAxe(axe: AxeSignal?) {
        _uiState.update { it.copy(selectedAxe = axe) }
    }

    fun setSelectedPriorite(priorite: PrioriteSignal?) {
        _uiState.update { it.copy(selectedPriorite = priorite) }
    }

    fun setSelectedQualification(qualification: QualificationSignal?) {
        _uiState.update { it.copy(selectedQualification = qualification) }
    }

    fun setSelectedStatutSuivi(statut: StatutSuivi?) {
        _uiState.update { it.copy(selectedStatutSuivi = statut) }
    }

    fun clearJustificationError() {
        _uiState.update { it.copy(justificationError = null) }
    }

    fun clearSuccessMessage() {
        _uiState.update { it.copy(successMessage = null) }
    }

    /**
     * Qualification Humaine rapide avec validation stricte de motivation obligatoire.
     */
    fun updateQualification(
        signal: RemediationSignalEntity,
        newQualification: QualificationSignal,
        justificationMotivée: String
    ) {
        // Règle AFREXIA : 'CONFIRME' et 'REFUTE' exigent obligatoirement une justification motivée non vide !
        if ((newQualification == QualificationSignal.CONFIRME || newQualification == QualificationSignal.REFUTE) &&
            justificationMotivée.trim().isBlank()
        ) {
            _uiState.update {
                it.copy(
                    justificationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : Vous devez saisir une justification textuelle explicite pour passer le statut en '${newQualification.name}'."
                )
            }
            return
        }

        val updated = signal.copy(
            qualification = newQualification,
            justificationHumaine = justificationMotivée.ifBlank { signal.justificationHumaine }
        )

        saveSignalToDb(updated, "Qualification du signal mise à jour avec succès (${newQualification.name}).")
    }

    /**
     * Statut de suivi rapide avec validation de motivation pour 'RESOLU'.
     */
    fun updateStatutSuivi(
        signal: RemediationSignalEntity,
        newStatut: StatutSuivi,
        justificationMotivée: String
    ) {
        // Règle AFREXIA : 'RESOLU' exige obligatoirement une justification motivée !
        if (newStatut == StatutSuivi.RESOLU && justificationMotivée.trim().isBlank() && signal.notesInvestigation.trim().isBlank()) {
            _uiState.update {
                it.copy(
                    justificationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : Pour marquer une remédiation comme 'RÉSOLU', vous devez fournir une justification textuelle motivée des actions accomplies."
                )
            }
            return
        }

        val updated = signal.copy(
            statutSuivi = newStatut,
            notesInvestigation = if (justificationMotivée.isNotBlank()) justificationMotivée else signal.notesInvestigation
        )

        saveSignalToDb(updated, "Statut de suivi de remédiation mis à jour (${newStatut.name}).")
    }

    /**
     * Enregistre l'ensemble du workspace de remédiation (S76).
     */
    fun saveRemediationWorkspace(updatedSignal: RemediationSignalEntity) {
        // Validation des règles d'obligation de justification
        if (updatedSignal.qualification == QualificationSignal.CONFIRME || updatedSignal.qualification == QualificationSignal.REFUTE) {
            if (updatedSignal.justificationHumaine.trim().isBlank() && updatedSignal.notesInvestigation.trim().isBlank()) {
                _uiState.update {
                    it.copy(
                        justificationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : La décision 'CONFIRMÉ' ou 'RÉFUTÉ' nécessite une justification dans les notes ou la justification humaine."
                    )
                }
                return
            }
        }

        if (updatedSignal.statutSuivi == StatutSuivi.RESOLU) {
            if (updatedSignal.actionsRealisees.trim().isBlank() && updatedSignal.justificationHumaine.trim().isBlank() && updatedSignal.notesInvestigation.trim().isBlank()) {
                _uiState.update {
                    it.copy(
                        justificationError = "DÉCISION HUMAINE OBLIGATOIREMENT MOTIVÉE : Pour clôturer la remédiation ('RÉSOLU'), veuillez décrire les actions réalisées et la justification finale."
                    )
                }
                return
            }
        }

        saveSignalToDb(updatedSignal, "Plan de remédiation (S76) enregistré avec succès.")
    }

    private fun saveSignalToDb(signal: RemediationSignalEntity, messageConfirmation: String) {
        viewModelScope.launch {
            repository.saveSignal(signal)
            _uiState.update { current ->
                val list = current.signaux.filter { it.id != signal.id } + signal
                current.copy(
                    signaux = list,
                    selectedSignal = signal,
                    justificationError = null,
                    successMessage = messageConfirmation
                )
            }
        }
    }
}
