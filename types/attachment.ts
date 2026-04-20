export type { Attachment, NewAttachment } from 'db/schema';

export interface AttachmentLocal {
  uri: string;
  title: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  base64: string;
  isReceipt: boolean;
}
