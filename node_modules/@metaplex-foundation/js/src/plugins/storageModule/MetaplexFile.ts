import { Buffer } from 'buffer';
import { getContentType, getExtension, randomStr } from '@/utils';
import { InvalidJsonVariableError } from '@/errors';

export type MetaplexFile = {
  readonly buffer: Buffer;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: MetaplexFileTag[];
};

export type MetaplexFileContent = string | Buffer | Uint8Array | ArrayBuffer;

export type MetaplexFileTag = { name: string; value: string };

export type MetaplexFileOptions = {
  displayName?: string;
  uniqueName?: string;
  contentType?: string;
  extension?: string;
  tags?: { name: string; value: string }[];
};

export const toMetaplexFile = (
  content: MetaplexFileContent,
  fileName: string,
  options: MetaplexFileOptions = {}
): MetaplexFile => ({
  buffer: parseMetaplexFileContent(content),
  fileName,
  displayName: options.displayName ?? fileName,
  uniqueName: options.uniqueName ?? randomStr(),
  contentType: options.contentType ?? getContentType(fileName),
  extension: options.extension ?? getExtension(fileName),
  tags: options.tags ?? [],
});

export const toMetaplexFileFromBrowser = async (
  file: File,
  options: MetaplexFileOptions = {}
): Promise<MetaplexFile> => {
  const buffer = await file.arrayBuffer();

  return toMetaplexFile(buffer, file.name, options);
};

export const toMetaplexFileFromJson = <T extends object = object>(
  json: T,
  fileName = 'inline.json',
  options: MetaplexFileOptions = {}
): MetaplexFile => {
  let jsonString;

  try {
    jsonString = JSON.stringify(json);
  } catch (error) {
    throw new InvalidJsonVariableError(error as Error);
  }

  return toMetaplexFile(jsonString, fileName, options);
};

export const parseMetaplexFileContent = (
  content: MetaplexFileContent
): Buffer => {
  if (content instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(content));
  }

  return Buffer.from(content);
};

export const getBytesFromMetaplexFiles = (...files: MetaplexFile[]): number =>
  files.reduce((acc, file) => acc + file.buffer.byteLength, 0);

export const getBrowserFileFromMetaplexFile = (file: MetaplexFile): File =>
  new File([file.buffer as BlobPart], file.fileName);

export const isMetaplexFile = (
  metaplexFile: any
): metaplexFile is MetaplexFile => {
  return (
    metaplexFile != null &&
    typeof metaplexFile === 'object' &&
    'buffer' in metaplexFile &&
    'fileName' in metaplexFile &&
    'displayName' in metaplexFile &&
    'uniqueName' in metaplexFile &&
    'contentType' in metaplexFile &&
    'extension' in metaplexFile &&
    'tags' in metaplexFile
  );
};
