package com.example.app_survey.data.repository

import com.example.app_survey.data.local.AfrexiaDatabase
import com.example.app_survey.data.local.VisiteFullData
import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.DraftEntity
import com.example.app_survey.data.local.entity.EnfantEntity
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.data.local.entity.VisiteEntity
import com.example.app_survey.engine.ExplainableDetectionEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext

class AfrexiaRepository(
    private val database: AfrexiaDatabase,
    private val detectionEngine: ExplainableDetectionEngine = ExplainableDetectionEngine()
) {

    private val visiteDao = database.visiteDao()
    private val producteurDao = database.producteurDao()
    private val enfantDao = database.enfantDao()
    private val plantationDao = database.plantationDao()
    private val recolteLotDao = database.recolteLotDao()
    private val scolarisationDao = database.scolarisationDao()
    private val activiteEnfantDao = database.activiteEnfantDao()
    private val observationTerrainDao = database.observationTerrainDao()
    private val preventionDao = database.preventionDao()
    private val signalDao = database.remediationSignalDao()
    private val draftDao = database.draftDao()

    fun observeAllVisites(): Flow<List<VisiteEntity>> = visiteDao.getAllVisites()

    fun observeAllProducteurs(): Flow<List<ProducteurEntity>> = producteurDao.getAllProducteurs()

    fun observeAllRecolteLots(): Flow<List<RecolteLotEntity>> = recolteLotDao.getAllRecolteLots()

    fun observeAllObservations(): Flow<List<ObservationTerrainEntity>> = observationTerrainDao.getAllObservations()

    fun observeAllPreventions(): Flow<List<PreventionEntity>> = preventionDao.getAllPreventions()

    fun observeSignauxByVisite(visiteId: String): Flow<List<RemediationSignalEntity>> =
        signalDao.observeSignauxByVisite(visiteId)

    fun observeAllSignaux(): Flow<List<RemediationSignalEntity>> =
        signalDao.getAllSignauxFlow()

    suspend fun getSignalById(id: String): RemediationSignalEntity? = withContext(Dispatchers.IO) {
        signalDao.getSignalById(id)
    }

    suspend fun saveSignal(signal: RemediationSignalEntity) = withContext(Dispatchers.IO) {
        signalDao.insertSignal(signal)
    }

    suspend fun saveRecolteLot(lot: RecolteLotEntity) = withContext(Dispatchers.IO) {
        recolteLotDao.insertRecolteLot(lot)
    }

    suspend fun saveObservation(observation: ObservationTerrainEntity) = withContext(Dispatchers.IO) {
        observationTerrainDao.insertObservationTerrain(observation)
    }

    suspend fun savePrevention(prevention: PreventionEntity) = withContext(Dispatchers.IO) {
        preventionDao.insertPrevention(prevention)
    }

    suspend fun saveDraft(draft: DraftEntity) = withContext(Dispatchers.IO) {
        draftDao.saveDraft(draft)
    }

    suspend fun getLatestDraft(): DraftEntity? = withContext(Dispatchers.IO) {
        draftDao.getLatestDraft()
    }

    suspend fun deleteDraft(visiteId: String) = withContext(Dispatchers.IO) {
        draftDao.deleteDraft(visiteId)
    }

    suspend fun getFullVisiteData(visiteId: String): VisiteFullData = withContext(Dispatchers.IO) {
        val visite = visiteDao.getVisiteById(visiteId)
        val producteurId = visite?.producteurId ?: ""
        val producteur = if (producteurId.isNotBlank()) producteurDao.getProducteurById(producteurId) else null
        val enfants = if (producteurId.isNotBlank()) enfantDao.getEnfantsByProducteur(producteurId) else emptyList()
        val plantations = if (producteurId.isNotBlank()) plantationDao.getPlantationsByProducteur(producteurId) else emptyList()
        val lots = recolteLotDao.getRecolteLotsByVisite(visiteId)
        val scolarisations = scolarisationDao.getScolarisationsByVisite(visiteId)
        val activites = activiteEnfantDao.getActivitesEnfantsByVisite(visiteId)
        val observations = observationTerrainDao.getObservationsByVisite(visiteId)
        val preventions = preventionDao.getPreventionsByVisite(visiteId)

        VisiteFullData(
            visite = visite,
            producteur = producteur,
            enfants = enfants,
            plantations = plantations,
            recolteLots = lots,
            scolarisations = scolarisations,
            activitesEnfants = activites,
            observationsTerrain = observations,
            preventions = preventions
        )
    }

    /**
     * Enregistre les données d'une visite complète et exécute automatiquement le Moteur de Détection à 3 Axes.
     */
    suspend fun saveVisiteAndEvaluate(data: VisiteFullData): List<RemediationSignalEntity> = withContext(Dispatchers.IO) {
        data.visite?.let { visiteDao.insertVisite(it) }
        data.producteur?.let { producteurDao.insertProducteur(it) }
        if (data.enfants.isNotEmpty()) enfantDao.insertEnfants(data.enfants)
        if (data.plantations.isNotEmpty()) plantationDao.insertPlantations(data.plantations)
        if (data.recolteLots.isNotEmpty()) recolteLotDao.insertRecolteLots(data.recolteLots)
        if (data.scolarisations.isNotEmpty()) scolarisationDao.insertScolarisations(data.scolarisations)
        if (data.activitesEnfants.isNotEmpty()) activiteEnfantDao.insertActivitesEnfants(data.activitesEnfants)
        data.observationsTerrain.forEach { observationTerrainDao.insertObservationTerrain(it) }
        data.preventions.forEach { preventionDao.insertPrevention(it) }

        // Supprimer le brouillon si la visite est finalisée
        data.visite?.id?.let { draftDao.deleteDraft(it) }

        // Calculer les 3 signaux via ExplainableDetectionEngine
        val signaux = detectionEngine.evaluateVisite(data)

        // Sauvegarder dans Room DB
        data.visite?.id?.let { vId ->
            signalDao.deleteSignauxByVisite(vId)
        }
        signalDao.insertSignaux(signaux)

        signaux
    }

    suspend fun updateSignalStatus(
        signal: RemediationSignalEntity
    ) = withContext(Dispatchers.IO) {
        signalDao.updateSignal(signal)
    }
}
