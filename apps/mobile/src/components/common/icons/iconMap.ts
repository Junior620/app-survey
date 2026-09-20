/**
 * Semantic → Material Community Icons (Paper / @expo/vector-icons).
 * Single icon family for the whole app.
 */

export const iconMap = {
  // Navigation & chrome
  home: 'home-outline',
  back: 'arrow-left',
  previous: 'chevron-left',
  next: 'chevron-right',
  close: 'close',
  search: 'magnify',
  settings: 'cog-outline',
  profile: 'account-circle-outline',
  logout: 'logout',
  help: 'help-circle-outline',
  info: 'information-outline',
  warning: 'alert',
  error: 'alert-circle-outline',
  success: 'check-circle-outline',
  check: 'check',
  cancel: 'cancel',
  more: 'dots-vertical',
  expand: 'chevron-down',
  language: 'translate',
  globe: 'earth',

  // Actions
  add: 'plus',
  edit: 'pencil-outline',
  view: 'eye-outline',
  delete: 'trash-can-outline',
  save: 'content-save-outline',
  saveLocal: 'content-save',
  camera: 'camera',
  qrcode: 'qrcode',
  document: 'file-document-outline',
  clipboard: 'clipboard-text-outline',
  calendar: 'calendar',
  lock: 'lock-outline',
  shield: 'shield-check-outline',
  handshake: 'handshake-outline',
  lightbulb: 'lightbulb-outline',
  email: 'email-outline',
  refresh: 'refresh',
  download: 'download',

  // Sync / connectivity
  sync: 'sync',
  cloudUpload: 'cloud-upload-outline',
  cloudOffline: 'cloud-off-outline',
  offline: 'wifi-off',
  pending: 'progress-clock',

  // Domain
  visit: 'clipboard-text-outline',
  questionnaire: 'file-document-outline',
  lot: 'package-variant',
  lotClosed: 'package-variant-closed',
  producer: 'account',
  parcel: 'map-marker',
  map: 'map-outline',
  tree: 'tree',
  sprout: 'sprout',
  transport: 'truck',
  scale: 'scale',
  bag: 'bag-personal',
  humidity: 'water-outline',
  medal: 'medal-outline',
  branch: 'source-branch',
  timeline: 'timeline-clock',
  observation: 'eye-outline',
  speech: 'message-text-outline',
  alertBell: 'bell-outline',
  remediation: 'shield-outline',
  folder: 'folder-outline',
  school: 'school-outline',
  phone: 'cellphone',
  building: 'office-building-outline',
  chart: 'chart-bar',
  star: 'star-outline',
  tag: 'tag-outline',
  broadcast: 'broadcast',
  flash: 'flash',
  cloud: 'cloud-outline',

  priorityHigh: 'alert-octagon-outline',
  priorityMedium: 'alert-outline',
  priorityLow: 'circle-outline',
  radioOn: 'radiobox-marked',
  radioOff: 'radiobox-blank',
  checkboxOn: 'checkbox-marked-outline',
  checkboxOff: 'checkbox-blank-outline',
} as const;

export type SemanticIconName = keyof typeof iconMap;
export type MciIconName = (typeof iconMap)[SemanticIconName];

export function resolveIcon(name: SemanticIconName): MciIconName {
  return iconMap[name];
}
