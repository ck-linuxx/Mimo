/**
 * Shim para expo-media-library/ExpoMediaLibraryNext.
 *
 * O expo-media-library@57.0.4 renomeou o módulo nativo para 'ExpoMediaLibraryNext',
 * mas essa versão pode não estar disponível no Expo Go SDK 57 (registrada como 'ExpoMediaLibrary').
 *
 * Este shim tenta os dois nomes e retorna {} como fallback seguro.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

const ExpoMediaLibraryNext =
  requireOptionalNativeModule('ExpoMediaLibraryNext') ??
  requireOptionalNativeModule('ExpoMediaLibrary') ??
  {};

export default ExpoMediaLibraryNext;
