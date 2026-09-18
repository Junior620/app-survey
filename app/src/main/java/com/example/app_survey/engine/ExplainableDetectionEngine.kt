package com.example.app_survey.engine

import com.example.app_survey.data.local.VisiteFullData
import com.example.app_survey.data.local.entity.AxeSignal
import com.example.app_survey.data.local.entity.PrioriteSignal
import com.example.app_survey.data.local.entity.QualificationSignal
import com.example.app_survey.data.local.entity.RemediationSignalEntity
import com.example.app_survey.data.local.entity.StatutLogistique
import com.example.app_survey.data.local.entity.StatutSuivi
import java.util.Locale
import java.util.UUID
import kotlin.math.abs

/**
 * Moteur de Détection Explicable à 3 Axes AFREXIA.
 *
 * Évalue l'ensemble des données collectées lors d'une visite terrain (Sections A à H)
 * et génère des signaux explicables sans score opaque.
 *
 * Axes d'évaluation :
 * 1. Protection de l'enfant
 * 2. Traçabilité
 * 3. Qualité des données
 */
class ExplainableDetectionEngine {

    /**
     * Analyse une visite complète et retourne les signaux pour les 3 axes.
     */
    fun evaluateVisite(data: VisiteFullData): List<RemediationSignalEntity> {
        val visiteId = data.visite?.id ?: "UNKNOWN_VISITE"
        val producteurId = data.producteur?.id ?: data.visite?.producteurId ?: "UNKNOWN_PROD"
        val now = System.currentTimeMillis()

        val signalProtection = evaluateProtectionEnfant(data, visiteId, producteurId, now)
        val signalTracabilite = evaluateTracabilite(data, visiteId, producteurId, now)
        val signalQualite = evaluateQualiteDonnees(data, visiteId, producteurId, now)

        return listOf(signalProtection, signalTracabilite, signalQualite)
    }

    // =========================================================================
    // AXE 1 : PROTECTION DE L'ENFANT
    // =========================================================================
    private fun evaluateProtectionEnfant(
        data: VisiteFullData,
        visiteId: String,
        producteurId: String,
        timestamp: Long
    ): RemediationSignalEntity {
        val visite = data.visite

        // 1. Consentement refusé -> NON_EVALUE
        if (visite != null && !visite.consentementObtenu) {
            return buildSignal(
                visiteId = visiteId,
                producteurId = producteurId,
                axe = AxeSignal.PROTECTION_ENFANT,
                priorite = PrioriteSignal.NON_EVALUE,
                regle = "CONSENTEMENT_REFUSE",
                explication = """
                    Pourquoi ce signal ?
                    • Raison : L'entretien/visite a été effectué(e) sans consentement obtenu ou le consentement a été refusé.
                    • Conséquence : Aucune évaluation de la protection de l'enfant ne peut être réalisée pour cette visite.
                    • Action requise : Obtenir un consentement préalable éclairé avant tout nouvel entretien.
                """.trimIndent(),
                donneesSource = "Section A: consentementObtenu = false",
                timestamp = timestamp
            )
        }

        // 2. Données essentielles manquantes -> NON_EVALUABLE
        val totalEnfantsMenage = data.producteur?.menage ?: 0
        val scolarisations = data.scolarisations
        val activites = data.activitesEnfants
        val observations = data.observationsTerrain

        if (totalEnfantsMenage > 0 && scolarisations.isEmpty() && activites.isEmpty() && observations.isEmpty()) {
            return buildSignal(
                visiteId = visiteId,
                producteurId = producteurId,
                axe = AxeSignal.PROTECTION_ENFANT,
                priorite = PrioriteSignal.NON_EVALUABLE,
                regle = "DONNEES_ENFANTS_MANQUANTES",
                explication = """
                    Pourquoi ce signal ?
                    • Raison : Le ménage compte $totalEnfantsMenage membres mais aucune donnée de scolarisation, d'activité ou d'observation terrain n'a été renseignée.
                    • Conséquence : Évaluation impossible par manque d'informations requises.
                    • Action requise : Compléter les sections E (Scolarisation) et F (Activités) lors d'une visite complémentaire.
                """.trimIndent(),
                donneesSource = "Section B: menage = $totalEnfantsMenage | Sections E/F/G vides",
                timestamp = timestamp
            )
        }

        // Analyse des risques et dangers
        val dangersGravesImmediats = mutableListOf<String>()
        val tachesDangereusesDetectees = mutableListOf<String>()
        val entravesScolarite = mutableListOf<String>()
        val besoinsScolairesOuPrevention = mutableListOf<String>()

        // Check Observations Terrain (Section G)
        observations.forEach { obs ->
            if (obs.signalementJeuneEnfant) {
                dangersGravesImmediats.add("Observation terrain : Jeune enfant (< 12 ans) aperçu réalisant des travaux agricoles sur la parcelle.")
            }
            if (obs.outilsVus.contains("pulverisateur", ignoreCase = true) || obs.produitsVus.contains("pesticide", ignoreCase = true)) {
                if (obs.enfantsVus > 0) {
                    dangersGravesImmediats.add("Observation terrain : Manipulation ou présence de produits phytosanitaires / pulvérisateur à proximité d'enfants (${obs.enfantsVus} vu(s)).")
                }
            }
            if (obs.tachesVues.isNotBlank()) {
                tachesDangereusesDetectees.add("Observation terrain : Tâches constatées de visu (${obs.tachesVues}).")
            }
        }

        // Check Activités Enfants (Section F)
        activites.forEach { act ->
            val taches = act.tachesDangereuses.lowercase()
            val isDanger = taches.contains("machette") || taches.contains("pesticide") ||
                    taches.contains("chimique") || taches.contains("charge") ||
                    taches.contains("defrichage") || taches.contains("nuit")

            // On vérifie l'âge si disponible via scolarisation
            val enfantScol = scolarisations.find { it.enfantId == act.enfantId }
            val ageEnfant = enfantScol?.age ?: 99

            if (act.encours && (isDanger || ageEnfant < 12)) {
                dangersGravesImmediats.add("Enfant #${act.enfantId} (${if (ageEnfant < 99) "$ageEnfant ans" else "âge inconnu"}) : Travail dangereux EN COURS ($taches).")
            } else if (isDanger || act.participation12m) {
                tachesDangereusesDetectees.add("Enfant #${act.enfantId} : Participation à des travaux à risque ($taches - fréquence: ${act.frequence}).")
            }
        }

        // Check Scolarisation (Section E)
        scolarisations.forEach { scol ->
            if (!scol.inscrit) {
                besoinsScolairesOuPrevention.add("Enfant #${scol.enfantId} (${scol.nomEnfant}, ${scol.age} ans) non inscrit à l'école.")
            } else if (scol.frequentation == "ABANDON" || scol.absences30j > 5 || scol.frequentation == "IRREGULIERE") {
                entravesScolarite.add("Enfant #${scol.enfantId} (${scol.nomEnfant}) : Absences répétées (${scol.absences30j} jours / 30) - Statut: ${scol.frequentation}.")
            }
        }

        // Check Prévention (Section H)
        val preventions = data.preventions
        if (preventions.isEmpty() || preventions.all { it.visitesSuivi == 0 || it.formationsRecues.isBlank() }) {
            besoinsScolairesOuPrevention.add("Sensibilisation : Aucun suivi préventif ou formation reçue par le producteur enregistré.")
        }

        // Détermination de la Priorité Axe 1
        return when {
            dangersGravesImmediats.isNotEmpty() -> {
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.PROTECTION_ENFANT,
                    priorite = PrioriteSignal.CRITIQUE,
                    regle = "DANGER_GRAVE_IMMEDIAT",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : DANGER GRAVE ET IMMÉDIAT DÉTECTÉ pour la sécurité de l'enfant.
                        • Motifs constatés :
                          ${dangersGravesImmediats.joinToString("\n  ")}
                        • Action de remédiation : Intervention urgente nécessaire. Retrait immédiat de l'enfant des travaux dangereux et orientation vers les services de protection sociale.
                    """.trimIndent(),
                    donneesSource = dangersGravesImmediats.joinToString(" | "),
                    timestamp = timestamp
                )
            }
            tachesDangereusesDetectees.isNotEmpty() || entravesScolarite.isNotEmpty() -> {
                val details = (tachesDangereusesDetectees + entravesScolarite).joinToString("\n  ")
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.PROTECTION_ENFANT,
                    priorite = PrioriteSignal.ELEVE,
                    regle = "TACHES_DANGEREUSES_OU_ENTRAVE_SCOLAIRE",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : PRÉSENCE DE TÂCHES DANGEREUSES OU ENTRAVE GRAVE À LA SCOLARISATION.
                        • Motifs constatés :
                          $details
                        • Action de remédiation : Plan de remédiation ciblé, fourniture de kits scolaires et sensibilisation renforcée du ménage.
                    """.trimIndent(),
                    donneesSource = (tachesDangereusesDetectees + entravesScolarite).joinToString(" | "),
                    timestamp = timestamp
                )
            }
            besoinsScolairesOuPrevention.isNotEmpty() -> {
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.PROTECTION_ENFANT,
                    priorite = PrioriteSignal.MODERE,
                    regle = "BESOIN_SCOLAIRE_OU_PREVENTION",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : Besoin de scolarisation ou de suivi préventif identifié sans danger immédiat.
                        • Motifs constatés :
                          ${besoinsScolairesOuPrevention.joinToString("\n  ")}
                        • Action de remédiation : Inscription scolaire accompagnement administratif et planification de séances de prévention.
                    """.trimIndent(),
                    donneesSource = besoinsScolairesOuPrevention.joinToString(" | "),
                    timestamp = timestamp
                )
            }
            else -> {
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.PROTECTION_ENFANT,
                    priorite = PrioriteSignal.FAIBLE,
                    regle = "AUCUN_RISQUE_PROTECTION_ENFANT",
                    explication = "Aucun signal détecté pour cette visite",
                    donneesSource = "Conforme - Toutes les vérifications sont positives",
                    timestamp = timestamp
                )
            }
        }
    }

    // =========================================================================
    // AXE 2 : TRAÇABILITÉ
    // =========================================================================
    private fun evaluateTracabilite(
        data: VisiteFullData,
        visiteId: String,
        producteurId: String,
        timestamp: Long
    ): RemediationSignalEntity {
        val visite = data.visite
        if (visite != null && !visite.consentementObtenu) {
            return buildSignal(
                visiteId = visiteId,
                producteurId = producteurId,
                axe = AxeSignal.TRACABILITE,
                priorite = PrioriteSignal.NON_EVALUE,
                regle = "CONSENTEMENT_REFUSE",
                explication = "Évaluation de la traçabilité impossible : entretien non consenti.",
                donneesSource = "Section A: consentementObtenu = false",
                timestamp = timestamp
            )
        }

        val lots = data.recolteLots
        val plantations = data.plantations

        if (lots.isEmpty()) {
            return buildSignal(
                visiteId = visiteId,
                producteurId = producteurId,
                axe = AxeSignal.TRACABILITE,
                priorite = PrioriteSignal.NON_EVALUABLE,
                regle = "LOTS_NON_RENSEIGNES",
                explication = """
                    Pourquoi ce signal ?
                    • Raison : Aucun lot de récolte ou données de stockage n'a été enregistré pour cette visite.
                    • Conséquence : Traçabilité du cacao non évaluable.
                    • Action requise : Renseigner la Section D lors de la pesée ou de la livraison au magasin.
                """.trimIndent(),
                donneesSource = "Section D: Aucune entrée",
                timestamp = timestamp
            )
        }

        val anomaliesOrigines = mutableListOf<String>()
        val anomaliesRendement = mutableListOf<String>()
        val anomaliesLogistique = mutableListOf<String>()

        // Vérification de la surface totale
        val superficieTotale = plantations.sumOf {
            if (it.superficieMesuree > 0.0) it.superficieMesuree else it.superficieDeclaree
        }

        // Rendement théorique max cacao ~ 1200 kg / ha
        val quantiteTotaleKg = lots.sumOf { it.quantiteKg }
        val rendementRationnelMax = if (superficieTotale > 0.0) superficieTotale * 1500.0 else 3000.0

        if (superficieTotale > 0.0 && quantiteTotaleKg > rendementRationnelMax) {
            val ratio = String.format(Locale.FRANCE, "%.1f", quantiteTotaleKg / superficieTotale)
            anomaliesRendement.add("Incohérence Poids/Superficie : Récolte déclarée de ${quantiteTotaleKg}kg sur ${superficieTotale}ha (rendement de ${ratio}kg/ha supérieur au seuil critique de 1500kg/ha). Risque de cacao infiltré d'origine externe.")
        }

        lots.forEach { lot ->
            if (lot.origines.isBlank()) {
                anomaliesOrigines.add("Lot #${lot.codeLot} : Origine de la plantation manquante ou non renseignée.")
            } else if (lot.origines.contains(",") && !lot.origines.contains("parcelle", ignoreCase = true)) {
                anomaliesOrigines.add("Lot #${lot.codeLot} : Mélange de parcelles non documenté (${lot.origines}).")
            }

            if (lot.statutLogistique == StatutLogistique.EN_TRANSIT) {
                anomaliesLogistique.add("Lot #${lot.codeLot} : Statut logistique 'EN TRANSIT' prolongé ou non clôturé au magasin.")
            }
        }

        return when {
            anomaliesRendement.isNotEmpty() || anomaliesOrigines.count { it.contains("manquante") } > 1 -> {
                val details = (anomaliesRendement + anomaliesOrigines + anomaliesLogistique).joinToString("\n  ")
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.TRACABILITE,
                    priorite = PrioriteSignal.CRITIQUE,
                    regle = "ANOMALIE_TRAÇABILITE_CRITIQUE",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : RUPTURE OU ANOMALIE MAJEURE DE TRAÇABILITÉ (Mélange / Rendement suspect).
                        • Motifs constatés :
                          $details
                        • Action de remédiation : Bloquer le lot concerné pour audit physique et vérification cartographique des parcelles.
                    """.trimIndent(),
                    donneesSource = (anomaliesRendement + anomaliesOrigines).joinToString(" | "),
                    timestamp = timestamp
                )
            }
            anomaliesOrigines.isNotEmpty() || anomaliesLogistique.isNotEmpty() -> {
                val details = (anomaliesOrigines + anomaliesLogistique).joinToString("\n  ")
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.TRACABILITE,
                    priorite = PrioriteSignal.ELEVE,
                    regle = "MANQUE_DOCUMENTATION_ORIGINE_LOGISTIQUE",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : Informations d'origine partielles ou statut logistique en attente.
                        • Motifs constatés :
                          $details
                        • Action de remédiation : Mettre à jour le registre d'origine et valider la fiche de livraison en magasin.
                    """.trimIndent(),
                    donneesSource = (anomaliesOrigines + anomaliesLogistique).joinToString(" | "),
                    timestamp = timestamp
                )
            }
            else -> {
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.TRACABILITE,
                    priorite = PrioriteSignal.FAIBLE,
                    regle = "TRACABILITE_CONFORME",
                    explication = "Aucun signal détecté pour cette visite (Traçabilité et origines conformes)",
                    donneesSource = "Conforme - Lots tracés et rendements cohérents",
                    timestamp = timestamp
                )
            }
        }
    }

    // =========================================================================
    // AXE 3 : QUALITÉ DES DONNÉES
    // =========================================================================
    private fun evaluateQualiteDonnees(
        data: VisiteFullData,
        visiteId: String,
        producteurId: String,
        timestamp: Long
    ): RemediationSignalEntity {
        val visite = data.visite
        if (visite != null && !visite.consentementObtenu) {
            return buildSignal(
                visiteId = visiteId,
                producteurId = producteurId,
                axe = AxeSignal.QUALITE_DONNEES,
                priorite = PrioriteSignal.NON_EVALUE,
                regle = "CONSENTEMENT_REFUSE",
                explication = "Évaluation de la qualité des données impossible : entretien non consenti.",
                donneesSource = "Section A: consentementObtenu = false",
                timestamp = timestamp
            )
        }

        val producteur = data.producteur
        val plantations = data.plantations
        val observations = data.observationsTerrain

        val contradictions = mutableListOf<String>()
        val donneesInconnues = mutableListOf<String>()
        val incoherencesAges = mutableListOf<String>()

        // Check Producteur (Section B)
        if (producteur == null) {
            donneesInconnues.add("Profil producteur inexistant ou non associé.")
        } else {
            if (producteur.cni.isBlank() || producteur.cni.equals("INCONNU", ignoreCase = true)) {
                donneesInconnues.add("Section B : Numéro CNI / Pièce d'identité manquant.")
            }
            if (producteur.telephone.isBlank()) {
                donneesInconnues.add("Section B : Numéro de téléphone manquant.")
            }
        }

        // Check Contradictions Déclarations vs Observations (Section G)
        observations.forEach { obs ->
            if (obs.contradictionsDeclarations) {
                contradictions.add("Observation terrain vs Déclarations : L'agent a noté des contradictions directes sur le terrain (ex: présence d'enfants travaillant alors que déclaré sans activité).")
            }
        }

        // Check Plantations GPS vs Déclaré (Section C)
        plantations.forEach { plt ->
            if (plt.coordsGps.isBlank()) {
                donneesInconnues.add("Plantation #${plt.id} : Coordonnées GPS manquantes.")
            }
            if (plt.superficieDeclaree > 0.0 && plt.superficieMesuree > 0.0) {
                val ecart = abs(plt.superficieDeclaree - plt.superficieMesuree) / plt.superficieDeclaree
                if (ecart > 0.4) {
                    val pct = String.format(Locale.FRANCE, "%.0f", ecart * 100)
                    contradictions.add("Plantation #${plt.id} : Écart majeur ($pct%) entre superficie déclarée (${plt.superficieDeclaree}ha) et superficie mesurée GPS (${plt.superficieMesuree}ha).")
                }
            }
        }

        // Check Incohérence d'Ages dans la Scolarisation (Section E)
        data.scolarisations.forEach { scol ->
            if (scol.age !in 3..20) {
                incoherencesAges.add("Scolarisation : Âge suspect de ${scol.nomEnfant} (${scol.age} ans).")
            }
        }

        return when {
            contradictions.isNotEmpty() -> {
                val details = contradictions.joinToString("\n  ")
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.QUALITE_DONNEES,
                    priorite = PrioriteSignal.CRITIQUE,
                    regle = "CONTRADICTION_DECLARATION_OBSERVATION",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : CONTRADICTIONS ENREGISTRÉES ENTRE DÉCLARATION ET OBSERVATION TERRAIN.
                        • Motifs constatés :
                          $details
                        • Action de remédiation : Re-visite de contrôle qualité par un superviseur terrain pour clarification.
                    """.trimIndent(),
                    donneesSource = contradictions.joinToString(" | "),
                    timestamp = timestamp
                )
            }
            donneesInconnues.isNotEmpty() || incoherencesAges.isNotEmpty() -> {
                val details = (donneesInconnues + incoherencesAges).joinToString("\n  ")
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.QUALITE_DONNEES,
                    priorite = PrioriteSignal.ELEVE,
                    regle = "DONNEES_MANQUANTES_OU_INCOHERENCES_MINEURES",
                    explication = """
                        Pourquoi ce signal ?
                        • Synthèse : Champs essentiels manquants ou incohérences de saisie.
                        • Motifs constatés :
                          $details
                        • Action de remédiation : Mettre à jour la fiche producteur/plantation avec les justificatifs manquants (CNI, GPS).
                    """.trimIndent(),
                    donneesSource = (donneesInconnues + incoherencesAges).joinToString(" | "),
                    timestamp = timestamp
                )
            }
            else -> {
                buildSignal(
                    visiteId = visiteId,
                    producteurId = producteurId,
                    axe = AxeSignal.QUALITE_DONNEES,
                    priorite = PrioriteSignal.FAIBLE,
                    regle = "QUALITE_DONNEES_CONFORME",
                    explication = "Aucun signal détecté pour cette visite (Données complètes et vérifiées)",
                    donneesSource = "Conforme - Pas de contradiction ni de champ obligatoire manquant",
                    timestamp = timestamp
                )
            }
        }
    }

    private fun buildSignal(
        visiteId: String,
        producteurId: String,
        axe: AxeSignal,
        priorite: PrioriteSignal,
        regle: String,
        explication: String,
        donneesSource: String,
        timestamp: Long,
        questionsSources: String = "",
        periodeTimeframe: String = "",
        ageAuMomentDesFaits: String = "",
        elementsDeclaresVsObserves: String = "",
        donneesManquantes: String = "",
        versionMoteurRegles: String = "v2.4 - AFREXIA Engine",
        indicatorsCoexistants: String = ""
    ): RemediationSignalEntity {
        return RemediationSignalEntity(
            id = UUID.randomUUID().toString(),
            visiteId = visiteId,
            producteurId = producteurId,
            axe = axe,
            priorite = priorite,
            qualification = QualificationSignal.A_VERIFIER,
            statutSuivi = StatutSuivi.OUVERT,
            regleDeclenchee = regle,
            explication = explication,
            donneesSource = donneesSource,
            dateCalcul = timestamp,
            questionsSources = questionsSources,
            periodeTimeframe = periodeTimeframe,
            ageAuMomentDesFaits = ageAuMomentDesFaits,
            elementsDeclaresVsObserves = elementsDeclaresVsObserves,
            donneesManquantes = donneesManquantes,
            versionMoteurRegles = versionMoteurRegles,
            indicatorsCoexistants = indicatorsCoexistants
        )
    }
}
