package com.example.app_survey.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.example.app_survey.data.local.dao.ActiviteEnfantDao
import com.example.app_survey.data.local.dao.DraftDao
import com.example.app_survey.data.local.dao.EnfantDao
import com.example.app_survey.data.local.dao.ObservationTerrainDao
import com.example.app_survey.data.local.dao.PlantationDao
import com.example.app_survey.data.local.dao.PreventionDao
import com.example.app_survey.data.local.dao.ProducteurDao
import com.example.app_survey.data.local.dao.RecolteLotDao
import com.example.app_survey.data.local.dao.RemediationSignalDao
import com.example.app_survey.data.local.dao.ScolarisationDao
import com.example.app_survey.data.local.dao.VisiteDao
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

@Database(
    entities = [
        VisiteEntity::class,
        ProducteurEntity::class,
        EnfantEntity::class,
        PlantationEntity::class,
        RecolteLotEntity::class,
        ScolarisationEntity::class,
        ActiviteEnfantEntity::class,
        ObservationTerrainEntity::class,
        PreventionEntity::class,
        RemediationSignalEntity::class,
        DraftEntity::class
    ],
    version = 4,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AfrexiaDatabase : RoomDatabase() {

    abstract fun visiteDao(): VisiteDao
    abstract fun producteurDao(): ProducteurDao
    abstract fun enfantDao(): EnfantDao
    abstract fun plantationDao(): PlantationDao
    abstract fun recolteLotDao(): RecolteLotDao
    abstract fun scolarisationDao(): ScolarisationDao
    abstract fun activiteEnfantDao(): ActiviteEnfantDao
    abstract fun observationTerrainDao(): ObservationTerrainDao
    abstract fun preventionDao(): PreventionDao
    abstract fun remediationSignalDao(): RemediationSignalDao
    abstract fun draftDao(): DraftDao

    companion object {
        @Volatile
        private var INSTANCE: AfrexiaDatabase? = null

        fun getDatabase(context: Context): AfrexiaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AfrexiaDatabase::class.java,
                    "afrexia_terrain.db"
                )
                .fallbackToDestructiveMigration(true)
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
