import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colors, radius, spacing, typography } from '../../theme';
import { PrimaryButton } from '../common/PrimaryButton';

export interface ShipmentDetailCardProps {
  bordereauId: string;
  shipmentStatus: string;
  sealValid: boolean;
  sealLabel?: string;
  transporteur: string;
  vehicule: string;
  chauffeur: string;
  depart: string;
  destination: string;
  onManageShipment: () => void;
  style?: StyleProp<ViewStyle>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || 'Non renseigné'}</Text>
    </View>
  );
}

export const ShipmentDetailCard: React.FC<ShipmentDetailCardProps> = ({
  bordereauId,
  shipmentStatus,
  sealValid,
  sealLabel,
  transporteur,
  vehicule,
  chauffeur,
  depart,
  destination,
  onManageShipment,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Icon source="file-document-outline" size={20} color={colors.vert} />
        <View style={styles.headerText}>
          <Text style={styles.bordereauLabel}>Bordereau</Text>
          <Text style={styles.bordereauId}>{bordereauId}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusPill}>
          <Icon source="truck" size={14} color={colors.attention} />
          <Text style={styles.statusText}>{shipmentStatus}</Text>
        </View>
        <View style={[styles.sealPill, sealValid ? styles.sealOk : styles.sealKo]}>
          <Icon
            source={sealValid ? 'lock-check-outline' : 'lock-alert-outline'}
            size={14}
            color={sealValid ? colors.vert : colors.erreur}
          />
          <Text
            style={[
              styles.sealText,
              { color: sealValid ? colors.vert : colors.erreur },
            ]}
          >
            {sealLabel || (sealValid ? 'Scellé valide' : 'Scellé non valide')}
          </Text>
        </View>
      </View>

      <Field label="Transporteur" value={transporteur} />
      <Field label="Véhicule / immatriculation" value={vehicule} />
      <Field label="Chauffeur" value={chauffeur} />

      <View style={styles.routeBlock}>
        <View style={styles.routePoint}>
          <Icon source="map-marker-outline" size={16} color={colors.vert} />
          <View style={styles.routeText}>
            <Text style={styles.fieldLabel}>Départ</Text>
            <Text style={styles.fieldValue}>{depart}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <Icon source="map-marker" size={16} color={colors.vert} />
          <View style={styles.routeText}>
            <Text style={styles.fieldLabel}>Destination</Text>
            <Text style={styles.fieldValue}>{destination}</Text>
          </View>
        </View>
      </View>

      <PrimaryButton
        title="Gérer l'expédition"
        icon="truck-delivery"
        onPress={onManageShipment}
        style={styles.cta}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.blanc,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.bordure,
    padding: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  headerText: {
    flex: 1,
  },
  bordereauLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
  },
  bordereauId: {
    ...typography.presets.titleMedium,
    color: colors.texte,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.m,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.ambreClair,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.presets.labelMedium,
    color: colors.attention,
    fontWeight: '600',
  },
  sealPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  sealOk: {
    backgroundColor: colors.vertClair,
  },
  sealKo: {
    backgroundColor: colors.errorContainer,
  },
  sealText: {
    ...typography.presets.labelMedium,
    fontWeight: '600',
  },
  field: {
    marginBottom: spacing.s,
  },
  fieldLabel: {
    ...typography.presets.labelSmall,
    color: colors.texteSecondaire,
    marginBottom: 2,
  },
  fieldValue: {
    ...typography.presets.bodyLarge,
    color: colors.texte,
    fontWeight: '500',
  },
  routeBlock: {
    backgroundColor: colors.surface2,
    borderRadius: radius.m,
    padding: spacing.s,
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
  },
  routeText: {
    flex: 1,
    minWidth: 0,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: colors.bordure,
    marginLeft: 7,
  },
  cta: {
    marginBottom: 0,
  },
});
