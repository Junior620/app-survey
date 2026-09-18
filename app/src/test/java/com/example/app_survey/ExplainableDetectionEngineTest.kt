package com.example.app_survey

import com.example.app_survey.data.local.VisiteFullData
import com.example.app_survey.data.local.entity.ActiviteEnfantEntity
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.MethodeMesure
import com.example.app_survey.data.local.entity.ObservationTerrainEntity
import com.example.app_survey.data.local.entity.PlantationEntity
import com.example.app_survey.data.local.entity.PreventionEntity
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.ProducteurEntity
import com.example.app_survey.data.local.entity.RecolteLotEntity
import com.example.app_survey.data.local.entity.ScolarisationEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.data.local.entity.TypeVisite
import com.example.app_survey.data.local.entity.VisiteEntity
import com.example.app_survey.engine.ExplainableDetectionEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ExplainableDetectionEngineTest {

    private lateinit var engine: ExplainableDetectionEngine

    @Before
    fun setUp() {
        engine = ExplainableDetectionEngine()
    }

    @Test
    fun testConsentementRefuse_returnsNonEvalueForArray() {
        val visite = VisiteEntity(
            id = "V001",
            date = "2026-09-09",
            agent = "Agent 007",
            localisation = "Soubré",
            cooperative = "COOP-CA",
            producteurId = "P001",
            typeVisite = TypeVisite.ROUTINE,
            consentementObtenu = false
        )
        val fullData = VisiteFullData(visite = visite, producteur = null)

        val signaux = engine.evaluateVisite(fullData)

        assertEquals(3, signaux.size)
        assertTrue(signaux.all { it.priorite == PrioriteSignal.NON_EVALUE })
    }

    @Test
    fun testProtectionEnfant_ImmediateDanger_returnsCritique() {
        val visite = VisiteEntity(
            id = "V002",
            date = "2026-09-09",
            agent = "Agent Test",
            localisation = "Gagnoa",
            cooperative = "COOP-TEST",
            producteurId = "P002",
            typeVisite = TypeVisite.SIGNALEMENT,
            consentementObtenu = true
        )
        val producteur = ProducteurEntity(
            id = "P002",
            nom = "Kouassi Yao",
            sexe = "M",
            dateNaissanceOrIntervalleAge = "1980-01-01",
            telephone = "0707070707",
            cni = "CI123456789",
            menage = 5,
            travailleursExt = 0
        )
        val observation = ObservationTerrainEntity(
            id = "OBS001",
            visiteId = "V002",
            personneId = "P002",
            date = "2026-09-09",
            auteur = "Agent Test",
            enfantsVus = 2,
            tachesVues = "Epandage pesticides",
            outilsVus = "Pulverisateur",
            produitsVus = "Pesticide organophosphoré",
            contradictionsDeclarations = true,
            signalementJeuneEnfant = true
        )

        val fullData = VisiteFullData(
            visite = visite,
            producteur = producteur,
            observationsTerrain = listOf(observation)
        )

        val signaux = engine.evaluateVisite(fullData)
        val signalProtection = signaux.first { it.axe == AxeSignal.PROTECTION_ENFANT }

        assertEquals(PrioriteSignal.CRITIQUE, signalProtection.priorite)
        assertTrue(signalProtection.explication.contains("DANGER GRAVE ET IMMÉDIAT"))
    }

    @Test
    fun testProtectionEnfant_DangerousTasks_returnsEleve() {
        val visite = VisiteEntity("V003", "2026-09-09", "Agent", "Daloa", "COOP", "P003", TypeVisite.ROUTINE, true)
        val producteur = ProducteurEntity("P003", "Koffi", "M", "1975", "01010101", "CI999", 4, 1)
        val activite = ActiviteEnfantEntity(
            id = "ACT001",
            visiteId = "V003",
            enfantId = "ENF001",
            participation12m = true,
            dernierEpisode = "Hier",
            tachesDangereuses = "machette,port_charges_lourdes",
            frequence = "HEBDOMADAIRE",
            encours = false
        )

        val fullData = VisiteFullData(
            visite = visite,
            producteur = producteur,
            activitesEnfants = listOf(activite)
        )

        val signaux = engine.evaluateVisite(fullData)
        val signalProtection = signaux.first { it.axe == AxeSignal.PROTECTION_ENFANT }

        assertEquals(PrioriteSignal.ELEVE, signalProtection.priorite)
        assertTrue(signalProtection.explication.contains("PRÉSENCE DE TÂCHES DANGEREUSES"))
    }

    @Test
    fun testProtectionEnfant_Conforme_returnsFaibleWithExactText() {
        val visite = VisiteEntity("V004", "2026-09-09", "Agent", "San Pedro", "COOP", "P004", TypeVisite.ROUTINE, true)
        val producteur = ProducteurEntity("P004", "Aka", "M", "1988", "05050505", "CI888", 3, 2)
        val scolarisation = ScolarisationEntity(
            id = "SCOL001",
            visiteId = "V004",
            producteurId = "P004",
            enfantId = "ENF002",
            nomEnfant = "Aka Junior",
            age = 10,
            lien = "ENFANT",
            inscrit = true,
            frequentation = "REGULIERE",
            absences30j = 0,
            motifs = ""
        )
        val prevention = PreventionEntity(
            id = "PREV001",
            visiteId = "V004",
            producteurId = "P004",
            formationsRecues = "Protection de l'enfant 2025",
            canauxSignalement = "Appel local",
            visitesSuivi = 2
        )
        val lot = RecolteLotEntity("L001", "V004", "P004", "LOT-001", "P1", "Parcelle A", 300.0, "OPTIMALE", "SOLEIL", 5, "MAGASIN", StatutLogistique.MAGASIN)
        val plantation = PlantationEntity("PL001", "P004", 2.0, 2.0, MethodeMesure.GPS, "4.8, -6.6", 2015, 1000.0, "Banane")

        val fullData = VisiteFullData(
            visite = visite,
            producteur = producteur,
            plantations = listOf(plantation),
            recolteLots = listOf(lot),
            scolarisations = listOf(scolarisation),
            preventions = listOf(prevention)
        )

        val signaux = engine.evaluateVisite(fullData)
        val signalProtection = signaux.first { it.axe == AxeSignal.PROTECTION_ENFANT }

        assertEquals(PrioriteSignal.FAIBLE, signalProtection.priorite)
        assertEquals("Aucun signal détecté pour cette visite", signalProtection.explication)
    }

    @Test
    fun testTracabilite_MissingOrigin_returnsAnomaly() {
        val visite = VisiteEntity("V005", "2026-09-09", "Agent", "Abengourou", "COOP", "P005", TypeVisite.ROUTINE, true)
        val lotSansOrigine = RecolteLotEntity("L002", "V005", "P005", "LOT-999", "P1", "", 1200.0, "MOYENNE", "FOUR", 20, "BORD_CHAMP", StatutLogistique.EN_TRANSIT)

        val fullData = VisiteFullData(
            visite = visite,
            producteur = null,
            recolteLots = listOf(lotSansOrigine)
        )

        val signaux = engine.evaluateVisite(fullData)
        val signalTracabilite = signaux.first { it.axe == AxeSignal.TRACABILITE }

        assertTrue(signalTracabilite.priorite == PrioriteSignal.ELEVE || signalTracabilite.priorite == PrioriteSignal.CRITIQUE)
        assertTrue(signalTracabilite.explication.contains("Origine de la plantation manquante"))
    }

    @Test
    fun testQualiteDonnees_Contradictions_returnsCritique() {
        val visite = VisiteEntity("V006", "2026-09-09", "Agent", "Agboville", "COOP", "P006", TypeVisite.ROUTINE, true)
        val producteur = ProducteurEntity("P006", "Bamba", "M", "1990", "02020202", "CI777", 4, 0)
        val observation = ObservationTerrainEntity(
            id = "OBS002",
            visiteId = "V006",
            personneId = "P006",
            date = "2026-09-09",
            auteur = "Agent",
            enfantsVus = 1,
            tachesVues = "Désherbage",
            outilsVus = "Machette",
            produitsVus = "",
            contradictionsDeclarations = true,
            signalementJeuneEnfant = false
        )

        val fullData = VisiteFullData(
            visite = visite,
            producteur = producteur,
            observationsTerrain = listOf(observation)
        )

        val signaux = engine.evaluateVisite(fullData)
        val signalQualite = signaux.first { it.axe == AxeSignal.QUALITE_DONNEES }

        assertEquals(PrioriteSignal.CRITIQUE, signalQualite.priorite)
        assertTrue(signalQualite.explication.contains("CONTRADICTIONS ENREGISTRÉES ENTRE DÉCLARATION ET OBSERVATION TERRAIN"))
    }
}
