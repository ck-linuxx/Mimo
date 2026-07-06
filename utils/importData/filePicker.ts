import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

type PickedTextFile = { uri: string; name: string; content: string; format: 'ofx' | 'csv' | 'json' };
type PickedDbFile = { uri: string; name: string; format: 'db' };

export async function pickImportFile(): Promise<PickedTextFile | PickedDbFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const name = asset.name ?? '';
  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.db')) return { uri: asset.uri, name, format: 'db' };

  const content = await FileSystem.readAsStringAsync(asset.uri);

  const isOFX =
    lowerName.endsWith('.ofx') || content.includes('OFXHEADER') || content.includes('<OFX>');

  if (isOFX) return { uri: asset.uri, name, content, format: 'ofx' };
  if (lowerName.endsWith('.csv')) return { uri: asset.uri, name, content, format: 'csv' };
  if (lowerName.endsWith('.json')) return { uri: asset.uri, name, content, format: 'json' };

  throw new Error('Formato inválido: use arquivos .ofx, .csv, .json ou .db');
}
