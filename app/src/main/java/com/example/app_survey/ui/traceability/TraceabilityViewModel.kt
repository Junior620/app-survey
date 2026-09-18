package com.example.app_survey.ui.traceability

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.app_survey.data.local.AfrexiaDatabase
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.data.repository.AfrexiaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class TraceabilityTab(val code: String, val label: String) {
    S69_LIST("S69", "Liste des Lots"),
    S70_DETAIL("S70", "Détail du Lot"),
    S71_POST_HARVEST("S71", "Post-Récolte"),
    S72_MOVEMENTS("S72", "Mouvements")
}

data class TraceabilityUiState(
    val activeTab: TraceabilityTab = TraceabilityTab.S69_LIST,
    val searchQuery: String = "",
    val selectedCampagne: String = "Toutes",
    val selectedStatutLogistique: StatutLogistique? = null, // null = Tous
    val selectedLot: RecolteLotEntity? = null,
    val lots: List<RecolteLotEntity> = emptyList()
)

class TraceabilityViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AfrexiaRepository(AfrexiaDatabase.getDatabase(application))

    private val _uiState = MutableStateFlow(TraceabilityUiState())
    val uiState: StateFlow<TraceabilityUiState> = _uiState.asStateFlow()

    init {
        loadSampleLotsIfEmpty()
    }

    private fun loadSampleLotsIfEmpty() {
        viewModelScope.launch {
            repository.observeAllRecolteLots().collect { dbLots ->
                if (dbLots.isEmpty()) {
                    val defaultLots = createDefaultSampleLots()
                    defaultLots.forEach { repository.saveRecolteLot(it) }
                } else {
                    _uiState.update { current ->
                        current.copy(
                            lots = dbLots,
                            selectedLot = current.selectedLot ?: dbLots.firstOrNull()
                        )
                    }
                }
            }
        }
    }

    private fun createDefaultSampleLots(): List<RecolteLotEntity> {
        val lot1 = RecolteLotEntity(
            id = "LOT-2026-A101",
            visiteId = "V-2026-001",
            producteurId = "P-101",
            codeLot = "LOT-2026-A101",
            periode = "Octobre 2025 - Janvier 2026",
            origines = "Kouamé N'Guessan (PLT-001, PLT-002)",
            quantiteKg = 1250.0,
            fermentation = "Caisses en bois ANEPJ (6 jours)",
            sechage = "Claies en bois suspendues",
            sacs = 19,
            peseeSource = "Bascule coopérative Soubré",
            statutLogistique = StatutLogistique.EN_TRANSIT,
            campagne = "Grande Campagne 2025-2026",
            contributionsDetail = "Kouamé N'Guessan (Parcelle PLT-001): 850 kg (68%) | Kouamé N'Guessan (Parcelle PLT-002): 400 kg (32%)",
            parentLotCode = "LOT-PARENT-AFR-09",
            childLotsCodes = "LOT-2026-A101-SUB1 (700kg), LOT-2026-A101-SUB2 (550kg)",
            documentsJoints = "Bordereau #BL-2026-088.pdf, Certificat Origine AFREXIA-2026.pdf",
            fermentationMethode = "Caisses en bois étagées (3 retournements)",
            fermentationDureeJours = 6,
            fermentationStatut = "Terminé",
            sechageMethode = "Claies en bois suspendues",
            sechageHumiditePct = 7.2,
            sechageStatut = "Terminé",
            peseeSourceDetails = "Pèse-sac électronique coopérative homologué",
            peseeNetKg = 1250.0,
            mouvementCollecteur = "Collecteur Bakayoko",
            mouvementTransporteur = "Transports Cacao N'Zi (Camion CI-4491-BG)",
            mouvementReceptionnaire = "Magasinier Yao Soubré",
            mouvementLieuOrigine = "Champ Soubré - Secteur Nord",
            mouvementLieuDestination = "Magasin Central COOP Soubré",
            mouvementBordereau = "BL-2026-088",
            mouvementDateExpedition = "2026-09-08 08:30",
            mouvementDateReception = null
        )

        val lot2 = RecolteLotEntity(
            id = "LOT-2026-B205",
            visiteId = "V-2026-002",
            producteurId = "P-102",
            codeLot = "LOT-2026-B205",
            periode = "Février 2026 - Mars 2026",
            origines = "Yao Boti (PLT-004), Konan Kra (PLT-009)",
            quantiteKg = 2100.0,
            fermentation = "Bâche plastique micro-perforée",
            sechage = "Aire cimentée propre",
            sacs = 32,
            peseeSource = "Pont-bascule Magasin Central",
            statutLogistique = StatutLogistique.MAGASIN,
            campagne = "Grande Campagne 2025-2026",
            contributionsDetail = "Yao Boti (Parcelle PLT-004): 1300 kg (62%) | Konan Kra (Parcelle PLT-009): 800 kg (38%)",
            parentLotCode = null,
            childLotsCodes = "AUCUN",
            documentsJoints = "Bordereau #BL-2026-112.pdf, Fiche Pesée Net #FP-3301.pdf",
            fermentationMethode = "Caisses en bois",
            fermentationDureeJours = 6,
            fermentationStatut = "Terminé",
            sechageMethode = "Aires cimentées sous abri",
            sechageHumiditePct = 6.9,
            sechageStatut = "Terminé",
            peseeSourceDetails = "Pont-bascule certifié Port San Pedro",
            peseeNetKg = 2100.0,
            mouvementCollecteur = "Collecteur Traoré",
            mouvementTransporteur = "Transports Express CI (Camion CI-9912-EE)",
            mouvementReceptionnaire = "Magasinier Koffi",
            mouvementLieuOrigine = "Magasin Section Meagui",
            mouvementLieuDestination = "Magasin Central COOP San Pedro",
            mouvementBordereau = "BL-2026-112",
            mouvementDateExpedition = "2026-09-05 14:00",
            mouvementDateReception = "2026-09-06 09:15"
        )

        val lot3 = RecolteLotEntity(
            id = "LOT-2026-C309",
            visiteId = "V-2026-003",
            producteurId = "P-103",
            codeLot = "LOT-2026-C309",
            periode = "Mai 2026 - Juillet 2026",
            origines = "Soro Zié (PLT-012)",
            quantiteKg = 800.0,
            fermentation = "Caisses en bois",
            sechage = "Claies suspendues",
            sacs = 12,
            peseeSource = "Pèse-sac portable agent",
            statutLogistique = StatutLogistique.EXPEDIE,
            campagne = "Petite Campagne 2026",
            contributionsDetail = "Soro Zié (Parcelle PLT-012): 800 kg (100%)",
            parentLotCode = null,
            childLotsCodes = "AUCUN",
            documentsJoints = "Bordereau #BL-2026-150.pdf, Certificat Export San Pedro.pdf",
            fermentationMethode = "Caisses en bois (6 jours)",
            fermentationDureeJours = 6,
            fermentationStatut = "Terminé",
            sechageMethode = "Claies en bois",
            sechageHumiditePct = 7.0,
            sechageStatut = "Terminé",
            peseeSourceDetails = "Pèse-sac certifié",
            peseeNetKg = 800.0,
            mouvementCollecteur = "Collecteur Bakayoko",
            mouvementTransporteur = "SOTRA-CACAO (Camion CI-1029-XX)",
            mouvementReceptionnaire = "Terminal Export San Pedro",
            mouvementLieuOrigine = "Magasin Central COOP Soubré",
            mouvementLieuDestination = "Port de San Pedro - Quai Export",
            mouvementBordereau = "BL-2026-150",
            mouvementDateExpedition = "2026-09-01 07:00",
            mouvementDateReception = "2026-09-02 16:30"
        )

        return listOf(lot1, lot2, lot3)
    }

    fun selectTab(tab: TraceabilityTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    fun selectLot(lot: RecolteLotEntity) {
        _uiState.update { it.copy(selectedLot = lot, activeTab = TraceabilityTab.S70_DETAIL) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun setSelectedCampagne(campagne: String) {
        _uiState.update { it.copy(selectedCampagne = campagne) }
    }

    fun setSelectedStatutLogistique(statut: StatutLogistique?) {
        _uiState.update { it.copy(selectedStatutLogistique = statut) }
    }

    fun saveLot(lot: RecolteLotEntity) {
        viewModelScope.launch {
            repository.saveRecolteLot(lot)
            _uiState.update { current ->
                val updatedList = current.lots.filter { it.id != lot.id } + lot
                current.copy(
                    lots = updatedList,
                    selectedLot = lot
                )
            }
        }
    }

    fun confirmReception(lot: RecolteLotEntity, dateReception: String) {
        val updatedLot = lot.copy(
            statutLogistique = StatutLogistique.MAGASIN,
            mouvementDateReception = dateReception
        )
        saveLot(updatedLot)
    }
}
