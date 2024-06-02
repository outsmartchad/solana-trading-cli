import { utf8 } from '@metaplex-foundation/umi-serializers';
import { generateRandomString } from './utils';

/**
 * A generic definition of a File represented as a buffer with
 * extra metadata such as a file name, content type, and tags.
 *
 * @category Storage
 */
export type GenericFile = {
  readonly buffer: Uint8Array;
  readonly fileName: string;
  readonly displayName: string;
  readonly uniqueName: string;
  readonly contentType: string | null;
  readonly extension: string | null;
  readonly tags: GenericFileTag[];
};

/**
 * Represent a custom tag that can be attached to a file.
 * @category Storage
 */
export type GenericFileTag = { name: string; value: string };

/**
 * Alias for the native File interface from the browser.
 * @category Storage
 */
export type BrowserFile = File;

/**
 * Represents the options that can be provided when creating a {@link GenericFile}.
 * @category Storage
 */
export type GenericFileOptions = {
  displayName?: string;
  uniqueName?: string;
  contentType?: string;
  extension?: string;
  tags?: { name: string; value: string }[];
};

/**
 * Creates a new {@link GenericFile} from a buffer and a file name.
 * @category Storage
 */
export const createGenericFile = (
  content: string | Uint8Array,
  fileName: string,
  options: GenericFileOptions = {}
): GenericFile => ({
  buffer: typeof content === 'string' ? utf8.serialize(content) : content,
  fileName,
  displayName: options.displayName ?? fileName,
  uniqueName: options.uniqueName ?? generateRandomString(),
  contentType: options.contentType ?? null,
  extension: options.extension ?? getExtension(fileName),
  tags: options.tags ?? [],
});

/**
 * Creates a new {@link GenericFile} from a {@link BrowserFile}.
 * @category Storage
 */
export const createGenericFileFromBrowserFile = async (
  browserFile: BrowserFile,
  options: GenericFileOptions = {}
): Promise<GenericFile> =>
  createGenericFile(
    new Uint8Array(await browserFile.arrayBuffer()),
    browserFile.name,
    options
  );

/**
 * Creates a new {@link GenericFile} from a JSON object.
 * @category Storage
 */
export const createGenericFileFromJson = <T>(
  json: T,
  fileName = 'inline.json',
  options: GenericFileOptions = {}
): GenericFile =>
  createGenericFile(JSON.stringify(json), fileName, {
    contentType: 'application/json',
    ...options,
  });

/**
 * Creates a new {@link BrowserFile} from a {@link GenericFile}.
 * @category Storage
 */
export const createBrowserFileFromGenericFile = (
  file: GenericFile
): BrowserFile => new File([file.buffer as BlobPart], file.fileName);

/**
 * Returns the content of a {@link GenericFile} as a parsed JSON object.
 * @category Storage
 */
export const parseJsonFromGenericFile = <T>(file: GenericFile): T =>
  JSON.parse(new TextDecoder().decode(file.buffer));

/**
 * Returns the total size of a list of {@link GenericFile} in bytes.
 * @category Storage
 */
export const getBytesFromGenericFiles = (...files: GenericFile[]): number =>
  files.reduce((acc, file) => acc + file.buffer.byteLength, 0);

/**
 * Whether the given value is a {@link GenericFile}.
 * @category Storage
 */
export const isGenericFile = (file: any): file is GenericFile =>
  file != null &&
  typeof file === 'object' &&
  'buffer' in file &&
  'fileName' in file &&
  'displayName' in file &&
  'uniqueName' in file &&
  'contentType' in file &&
  'extension' in file &&
  'tags' in file;

/**
 * Returns the extension of a file name.
 * @category Storage
 */
const getExtension = (fileName: string): string | null => {
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex < 0 ? null : fileName.slice(lastDotIndex + 1);
};
