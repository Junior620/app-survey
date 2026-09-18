package com.example.app_survey.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
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
import kotlinx.coroutines.flow.Flow

@Dao
interface EnfantDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEnfant(enfant: EnfantEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEnfants(enfants: List<EnfantEntity>)

    @Query("SELECT * FROM enfants WHERE producteurId = :producteurId")
    suspend fun getEnfantsByProducteur(producteurId: String): List<EnfantEntity>

    @Query("SELECT * FROM enfants WHERE visiteId = :visiteId")
    suspend fun getEnfantsByVisite(visiteId: String): List<EnfantEntity>
}

@Dao
interface DraftDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveDraft(draft: DraftEntity)

    @Query("SELECT * FROM visite_brouillons ORDER BY horodatage DESC LIMIT 1")
    suspend fun getLatestDraft(): DraftEntity?

    @Query("SELECT * FROM visite_brouillons WHERE visiteId = :visiteId")
    suspend fun getDraftByVisite(visiteId: String): DraftEntity?

    @Query("DELETE FROM visite_brouillons WHERE visiteId = :visiteId")
    suspend fun deleteDraft(visiteId: String)
}

@Dao
interface VisiteDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertVisite(visite: VisiteEntity)

    @Query("SELECT * FROM visites WHERE id = :id")
    suspend fun getVisiteById(id: String): VisiteEntity?

    @Query("SELECT * FROM visites ORDER BY date DESC")
    fun getAllVisites(): Flow<List<VisiteEntity>>

    @Query("SELECT * FROM visites WHERE producteurId = :producteurId")
    suspend fun getVisitesByProducteur(producteurId: String): List<VisiteEntity>
}

@Dao
interface ProducteurDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducteur(producteur: ProducteurEntity)

    @Query("SELECT * FROM producteurs WHERE id = :id")
    suspend fun getProducteurById(id: String): ProducteurEntity?

    @Query("SELECT * FROM producteurs ORDER BY nom ASC")
    fun getAllProducteurs(): Flow<List<ProducteurEntity>>
}

@Dao
interface PlantationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlantation(plantation: PlantationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPlantations(plantations: List<PlantationEntity>)

    @Query("SELECT * FROM plantations WHERE producteurId = :producteurId")
    suspend fun getPlantationsByProducteur(producteurId: String): List<PlantationEntity>
}

@Dao
interface RecolteLotDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecolteLot(recolteLot: RecolteLotEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecolteLots(recolteLots: List<RecolteLotEntity>)

    @Query("SELECT * FROM recolte_lots WHERE visiteId = :visiteId")
    suspend fun getRecolteLotsByVisite(visiteId: String): List<RecolteLotEntity>

    @Query("SELECT * FROM recolte_lots WHERE producteurId = :producteurId")
    suspend fun getRecolteLotsByProducteur(producteurId: String): List<RecolteLotEntity>

    @Query("SELECT * FROM recolte_lots ORDER BY id DESC")
    fun getAllRecolteLots(): Flow<List<RecolteLotEntity>>

    @Query("SELECT * FROM recolte_lots WHERE id = :id")
    suspend fun getLotById(id: String): RecolteLotEntity?
}

@Dao
interface ScolarisationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScolarisation(scolarisation: ScolarisationEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScolarisations(scolarisations: List<ScolarisationEntity>)

    @Query("SELECT * FROM scolarisations WHERE visiteId = :visiteId")
    suspend fun getScolarisationsByVisite(visiteId: String): List<ScolarisationEntity>

    @Query("SELECT * FROM scolarisations WHERE producteurId = :producteurId")
    suspend fun getScolarisationsByProducteur(producteurId: String): List<ScolarisationEntity>
}

@Dao
interface ActiviteEnfantDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActiviteEnfant(activiteEnfant: ActiviteEnfantEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActivitesEnfants(activitesEnfants: List<ActiviteEnfantEntity>)

    @Query("SELECT * FROM activites_enfants WHERE visiteId = :visiteId")
    suspend fun getActivitesEnfantsByVisite(visiteId: String): List<ActiviteEnfantEntity>
}

@Dao
interface ObservationTerrainDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertObservationTerrain(observation: ObservationTerrainEntity)

    @Query("SELECT * FROM observations_terrain WHERE visiteId = :visiteId")
    suspend fun getObservationsByVisite(visiteId: String): List<ObservationTerrainEntity>

    @Query("SELECT * FROM observations_terrain ORDER BY date DESC")
    fun getAllObservations(): Flow<List<ObservationTerrainEntity>>
}

@Dao
interface PreventionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrevention(prevention: PreventionEntity)

    @Query("SELECT * FROM preventions WHERE visiteId = :visiteId")
    suspend fun getPreventionsByVisite(visiteId: String): List<PreventionEntity>

    @Query("SELECT * FROM preventions WHERE producteurId = :producteurId")
    suspend fun getPreventionsByProducteur(producteurId: String): List<PreventionEntity>

    @Query("SELECT * FROM preventions ORDER BY id DESC")
    fun getAllPreventions(): Flow<List<PreventionEntity>>
}

@Dao
interface RemediationSignalDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSignal(signal: RemediationSignalEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSignaux(signaux: List<RemediationSignalEntity>)

    @Update
    suspend fun updateSignal(signal: RemediationSignalEntity)

    @Query("SELECT * FROM remediation_signaux WHERE visiteId = :visiteId")
    suspend fun getSignauxByVisite(visiteId: String): List<RemediationSignalEntity>

    @Query("SELECT * FROM remediation_signaux WHERE visiteId = :visiteId")
    fun observeSignauxByVisite(visiteId: String): Flow<List<RemediationSignalEntity>>

    @Query("SELECT * FROM remediation_signaux WHERE id = :id")
    suspend fun getSignalById(id: String): RemediationSignalEntity?

    @Query("SELECT * FROM remediation_signaux WHERE id = :id")
    fun observeSignalById(id: String): Flow<RemediationSignalEntity?>

    @Query("SELECT * FROM remediation_signaux WHERE producteurId = :producteurId")
    suspend fun getSignauxByProducteur(producteurId: String): List<RemediationSignalEntity>

    @Query("SELECT * FROM remediation_signaux ORDER BY dateCalcul DESC")
    fun getAllSignauxFlow(): Flow<List<RemediationSignalEntity>>

    @Query("SELECT * FROM remediation_signaux ORDER BY dateCalcul DESC")
    suspend fun getAllSignaux(): List<RemediationSignalEntity>

    @Query("DELETE FROM remediation_signaux WHERE visiteId = :visiteId")
    suspend fun deleteSignauxByVisite(visiteId: String)
}
