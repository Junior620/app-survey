package com.example.app_survey.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Section A : Visite Terrain
 */
@Entity(
    tableName = "visites",
    indices = [Index(value = ["producteurId"])]
)
data class VisiteEntity(
    @PrimaryKey val id: String,
    val date: String,
    val agent: String,
    val localisation: String,
    val cooperative: String,
    val producteurId: String,
    val typeVisite: TypeVisite,
    val consentementObtenu: Boolean
)

/**
 * Section B : Producteur (Planteur)
 */
@Entity(tableName = "producteurs")
data class ProducteurEntity(
    @PrimaryKey val id: String,
    val nom: String,
    val sexe: String,
    val dateNaissanceOrIntervalleAge: String,
    val telephone: String,
    val cni: String,
    val menage: Int,
    val travailleursExt: Int
)

/**
 * Section B - Liste Unique des Enfants du Ménage (S26-S28)
 */
@Entity(
    tableName = "enfants",
    indices = [Index(value = ["producteurId"]), Index(value = ["visiteId"])]
)
data class EnfantEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val nom: String,
    val sexe: String,
    val typeAge: TypeAge,
    val dateNaissance: String? = null,
    val intervalleAge: String? = null,
    val ageEstime: Int,
    val ageAuMomentDesFaits: Int,
    val lienParente: String
)

/**
 * Saisie Hors-Ligne & Reprise : Entity Brouillon Horodaté
 */
@Entity(tableName = "visite_brouillons")
data class DraftEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val activeSection: String,
    val horodatage: Long,
    val jsonContent: String
)


/**
 * Section C : Plantation
 */
@Entity(
    tableName = "plantations",
    indices = [Index(value = ["producteurId"])]
)
data class PlantationEntity(
    @PrimaryKey val id: String,
    val producteurId: String,
    val superficieDeclaree: Double,
    val superficieMesuree: Double,
    val methodeMesure: MethodeMesure,
    val coordsGps: String,
    val anneeCreation: Int,
    val productionEstimee: Double,
    val autresCultures: String
)

/**
 * Section D : Récolte / Lot de Cacao
 */
@Entity(
    tableName = "recolte_lots",
    indices = [Index(value = ["visiteId"]), Index(value = ["producteurId"])]
)
data class RecolteLotEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val codeLot: String,
    val periode: String,
    val origines: String,
    val quantiteKg: Double,
    val fermentation: String,
    val sechage: String,
    val sacs: Int,
    val peseeSource: String,
    val statutLogistique: StatutLogistique,
    val campagne: String = "Grande Campagne 2025-2026",
    val contributionsDetail: String = "",
    val parentLotCode: String? = null,
    val childLotsCodes: String = "",
    val documentsJoints: String = "",
    val fermentationMethode: String = "Caisses en bois",
    val fermentationDureeJours: Int = 6,
    val fermentationStatut: String = "Terminé",
    val sechageMethode: String = "Claies en bois suspendues",
    val sechageHumiditePct: Double = 7.2,
    val sechageStatut: String = "Terminé",
    val peseeSourceDetails: String = "Bascule coopérative étalonnée",
    val peseeNetKg: Double = quantiteKg,
    val mouvementCollecteur: String = "Agent Collecte Coulibaly",
    val mouvementTransporteur: String = "Transports Cacao CI (Véhicule AB-1234)",
    val mouvementReceptionnaire: String = "Magasinier Bamba",
    val mouvementLieuOrigine: String = "Soubré - Secteur Nord",
    val mouvementLieuDestination: String = "Magasin Central COOP Soubré",
    val mouvementBordereau: String = "BL-2026-088",
    val mouvementDateExpedition: String = "2026-09-08",
    val mouvementDateReception: String? = null
)

/**
 * Section E : Scolarisation des Enfants du Ménage
 */
@Entity(
    tableName = "scolarisations",
    indices = [Index(value = ["visiteId"]), Index(value = ["producteurId"]), Index(value = ["enfantId"])]
)
data class ScolarisationEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val enfantId: String,
    val nomEnfant: String,
    val age: Int,
    val lien: String,
    val inscrit: Boolean,
    val frequentation: String,
    val absences30j: Int,
    val motifs: String
)

/**
 * Section F : Activité et Travail de l'Enfant
 */
@Entity(
    tableName = "activites_enfants",
    indices = [Index(value = ["visiteId"]), Index(value = ["enfantId"])]
)
data class ActiviteEnfantEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val enfantId: String,
    val participation12m: Boolean,
    val dernierEpisode: String,
    val tachesDangereuses: String, // ex: "machette,pesticides,port_charges"
    val frequence: String,
    val encours: Boolean
)

/**
 * Section G : Observation Directe sur le Terrain
 */
@Entity(
    tableName = "observations_terrain",
    indices = [Index(value = ["visiteId"])]
)
data class ObservationTerrainEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val personneId: String,
    val date: String,
    val auteur: String,
    val enfantsVus: Int,
    val tachesVues: String,
    val outilsVus: String,
    val produitsVus: String,
    val contradictionsDeclarations: Boolean,
    val signalementJeuneEnfant: Boolean,
    val identifiantProvisoire: String = "IND-2026-01",
    val sourceObservation: String = "CONSTAT_DIRECT",
    val chargesVues: String = "",
    val protocoleJeuneEnfantApplique: Boolean = false,
    val detailsObservation: String = ""
)

/**
 * Section H : Prévention & Sensibilisation
 */
@Entity(
    tableName = "preventions",
    indices = [Index(value = ["visiteId"]), Index(value = ["producteurId"])]
)
data class PreventionEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val formationsRecues: String,
    val canauxSignalement: String,
    val visitesSuivi: Int,
    val besoinsSensibilisation: String = "",
    val engagementsPris: String = "",
    val dateDerniereFormation: String = "2026-05-10",
    val organismesFormateurs: String = "COOP-AFREXIA / ANEPJ"
)

/**
 * Section I : Remédiation / Signaux de Détection
 */
@Entity(
    tableName = "remediation_signaux",
    indices = [Index(value = ["visiteId"]), Index(value = ["producteurId"])]
)
data class RemediationSignalEntity(
    @PrimaryKey val id: String,
    val visiteId: String,
    val producteurId: String,
    val axe: AxeSignal,
    val priorite: PrioriteSignal,
    val qualification: QualificationSignal = QualificationSignal.A_VERIFIER,
    val statutSuivi: StatutSuivi = StatutSuivi.OUVERT,
    val regleDeclenchee: String,
    val explication: String,
    val donneesSource: String,
    val dateCalcul: Long,
    // Champs étendus pour S75 (Explication), S76 (Remédiation) et S52-S57 (Gestion des Alertes)
    val questionsSources: String = "",
    val periodeTimeframe: String = "",
    val ageAuMomentDesFaits: String = "",
    val elementsDeclaresVsObserves: String = "",
    val donneesManquantes: String = "",
    val versionMoteurRegles: String = "v2.4 - AFREXIA Engine",
    val justificationHumaine: String = "",
    val actionsPrevues: String = "",
    val actionsRealisees: String = "",
    val responsableDesigne: String = "",
    val echeance: String = "",
    val visitesTerrainSuivi: String = "",
    val obstaclesRencontres: String = "",
    val notesInvestigation: String = "",
    val indicatorsCoexistants: String = ""
)
