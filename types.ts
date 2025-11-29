export enum ToolType {
  CONVERTER = 'converter',
  TABLE_EXTRACTOR = 'table_extractor',
  ID_SCANNER = 'id_scanner',
  HANDWRITING_OCR = 'handwriting_ocr',
  HANDWRITING_REMOVER = 'handwriting_remover'
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  base64: string; // Base64 string without prefix for API
  mimeType: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
  result: any | null; // Can be text, JSON, or image URL depending on tool
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface IDCardData {
  name?: string;
  idNumber?: string;
  address?: string;
  birthDate?: string;
  gender?: string;
  expiryDate?: string;
  rawText?: string;
}