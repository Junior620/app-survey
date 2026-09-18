package com.example.app_survey.data.local

import androidx.room.TypeConverter
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.MethodeMesure
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.data.local.entity.StatutSuivi
import com.example.app_survey.data.local.entity.TypeVisite

class Converters {

    @TypeConverter
    fun fromAxeSignal(value: AxeSignal?): String? = value?.name

    @TypeConverter
    fun toAxeSignal(value: String?): AxeSignal? = value?.let {
        try { AxeSignal.valueOf(it) } catch (e: IllegalArgumentException) { AxeSignal.PROTECTION_ENFANT }
    }

    @TypeConverter
    fun fromPrioriteSignal(value: PrioriteSignal?): String? = value?.name

    @TypeConverter
    fun toPrioriteSignal(value: String?): PrioriteSignal? = value?.let {
        try { PrioriteSignal.valueOf(it) } catch (e: IllegalArgumentException) { PrioriteSignal.FAIBLE }
    }

    @TypeConverter
    fun fromQualificationSignal(value: QualificationSignal?): String? = value?.name

    @TypeConverter
    fun toQualificationSignal(value: String?): QualificationSignal? = value?.let {
        try { QualificationSignal.valueOf(it) } catch (e: IllegalArgumentException) { QualificationSignal.A_VERIFIER }
    }

    @TypeConverter
    fun fromStatutSuivi(value: StatutSuivi?): String? = value?.name

    @TypeConverter
    fun toStatutSuivi(value: String?): StatutSuivi? = value?.let {
        try { StatutSuivi.valueOf(it) } catch (e: IllegalArgumentException) { StatutSuivi.OUVERT }
    }

    @TypeConverter
    fun fromStatutLogistique(value: StatutLogistique?): String? = value?.name

    @TypeConverter
    fun toStatutLogistique(value: String?): StatutLogistique? = value?.let {
        try { StatutLogistique.valueOf(it) } catch (e: IllegalArgumentException) { StatutLogistique.EN_TRANSIT }
    }

    @TypeConverter
    fun fromMethodeMesure(value: MethodeMesure?): String? = value?.name

    @TypeConverter
    fun toMethodeMesure(value: String?): MethodeMesure? = value?.let {
        try { MethodeMesure.valueOf(it) } catch (e: IllegalArgumentException) { MethodeMesure.ESTIMATION }
    }

    @TypeConverter
    fun fromTypeVisite(value: TypeVisite?): String? = value?.name

    @TypeConverter
    fun toTypeVisite(value: String?): TypeVisite? = value?.let {
        try { TypeVisite.valueOf(it) } catch (e: IllegalArgumentException) { TypeVisite.ROUTINE }
    }
}
