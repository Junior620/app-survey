package com.example.app_survey.ui.observation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.app_survey.data.local.AfrexiaDatabase
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.data.repository.AfrexiaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID

enum class ObservationTab(val code: String, val label: String) {
    S73_OBSERVATIONS("S73", "Observations Terrain"),
    S74_PREVENTION("S74", "Prévention & Canaux")
}

data class ObservationPreventionUiState(
    val activeTab: ObservationTab = ObservationTab.S73_OBSERVATIONS,
    val observations: List<ObservationTerrainEntity> = emptyList(),
    val preventions: List<PreventionEntity> = emptyList(),
    val currentObservation: ObservationTerrainEntity? = null,
    val currentPrevention: PreventionEntity? = null
)

class ObservationPreventionViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AfrexiaRepository(AfrexiaDatabase.getDatabase(application))

    private val _uiState = MutableStateFlow(ObservationPreventionUiState())
    val uiState: StateFlow<ObservationPreventionUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            repository.observeAllObservations().collect { obsList ->
                val defaultObs = if (obsList.isEmpty()) createDefaultSampleObservation() else obsList.first()
                _uiState.update { current ->
                    current.copy(
                        observations = if (obsList.isEmpty()) listOf(defaultObs) else obsList,
                        currentObservation = current.currentObservation ?: defaultObs
                    )
                }
            }
        }

        viewModelScope.launch {
            repository.observeAllPreventions().collect { prevList ->
                val defaultPrev = if (prevList.isEmpty()) createDefaultSamplePrevention() else prevList.first()
                _uiState.update { current ->
                    current.copy(
                        preventions = if (prevList.isEmpty()) listOf(defaultPrev) else prevList,
                        currentPrevention = current.currentPrevention ?: defaultPrev
                    )
                }
            }
        }
    }

    private fun createDefaultSampleObservation(): ObservationTerrainEntity {
        return ObservationTerrainEntity(
            id = "OBS-2026-001",
            visiteId = "V-2026-001",
            personneId = "P-101",
            date = "2026-09-09",
            auteur = "Agent CDC Traoré",
            enfantsVus = 1,
            tachesVues = "Désherbage et ramassage des cabosses de cacao",
            outilsVus = "Machette courte de désherbage posée au sol",
            produitsVus = "Emballage vide de pesticide phytosanitaire",
            contradictionsDeclarations = true,
            signalementJeuneEnfant = false,
            identifiantProvisoire = "IND-2026-04",
            sourceObservation = "CONSTAT_DIRECT",
            chargesVues = "Charge de cabosses (estimation ~15 kg)",
            protocoleJeuneEnfantApplique = false,
            detailsObservation = "Agent a constaté de visu l'enfant IND-2026-04 effectuant le désherbage sous le soleil direct."
        )
    }

    private fun createDefaultSamplePrevention(): PreventionEntity {
        return PreventionEntity(
            id = "PREV-2026-001",
            visiteId = "V-2026-001",
            producteurId = "P-101",
            formationsRecues = "Utilisation Équipements de Protection (EPI), Droits Fondamentaux de l'Enfant SOCODEVI",
            canauxSignalement = "Hotline Gratuite COOP-AFREXIA 0800-22-22, Délégué de Section Soubré Nord, Comité Villageois ANEPJ",
            visitesSuivi = 3,
            besoinsSensibilisation = "Fourniture de Kit de Protection EPI complet, Sensibilisation sur les alternatives au travail des enfants",
            engagementsPris = "Engagé à acheter une paire de bottes et des gants de protection; Fréquentation scolaire assurée à 100%",
            dateDerniereFormation = "2026-05-15",
            organismesFormateurs = "COOP-AFREXIA / SOCODEVI / ANEPJ"
        )
    }

    fun selectTab(tab: ObservationTab) {
        _uiState.update { it.copy(activeTab = tab) }
    }

    fun saveObservation(obs: ObservationTerrainEntity) {
        viewModelScope.launch {
            repository.saveObservation(obs)
            _uiState.update { current ->
                val list = current.observations.filter { it.id != obs.id } + obs
                current.copy(observations = list, currentObservation = obs)
            }
        }
    }

    fun savePrevention(prev: PreventionEntity) {
        viewModelScope.launch {
            repository.savePrevention(prev)
            _uiState.update { current ->
                val list = current.preventions.filter { it.id != prev.id } + prev
                current.copy(preventions = list, currentPrevention = prev)
            }
        }
    }
}
