import mime from 'mime';

// eslint-disable-next-line no-control-regex
export const removeEmptyChars = (value: string) => value.replace(/\u0000/g, '');

export const padEmptyChars = (value: string, chars: number) =>
  value.padEnd(chars, '\u0000');

export const tryOr = <T, U>(callback: () => T, defaultValue: U): T | U => {
  try {
    return callback();
  } catch (error) {
    return defaultValue;
  }
};

export const tryOrNull = <T>(cb: () => T) => tryOr(cb, null);

export const chunk = <T>(array: T[], chunkSize: number): T[][] =>
  array.reduce((accumulator, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);

    if (!accumulator[chunkIndex]) {
      accumulator[chunkIndex] = [];
    }

    accumulator[chunkIndex].push(item);

    return accumulator;
  }, [] as T[][]);

export const zipMap = <T, U, V>(
  left: T[],
  right: U[],
  fn: (t: T, u: U | null, i: number) => V
): V[] => left.map((t: T, index) => fn(t, right?.[index] ?? null, index));

export const randomStr = (
  length = 20,
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
) => {
  let result = '';
  const alphabetLength = alphabet.length;
  for (var i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabetLength));
  }

  return result;
};

export const getContentType = (fileName: string): string | null =>
  mime.getType(fileName);

export const getExtension = (fileName: string): string | null => {
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex < 0 ? null : fileName.slice(lastDotIndex + 1);
};

export type WalkOptions = {
  sortObjectKeys?: boolean;
};

export const walk = (
  parent: any,
  cb: (
    next: (child: any) => void,
    value: any,
    key: any,
    parent: any
  ) => unknown,
  options?: WalkOptions
): void => {
  const recursiveWalk = (child: any) => walk(child, cb, options);

  if (parent && Array.isArray(parent)) {
    parent.forEach((child, index) => {
      cb(recursiveWalk, child, index, parent);
    });
  } else if (parent && typeof parent === 'object') {
    const keys = Object.keys(parent);

    if (options?.sortObjectKeys ?? true) {
      keys.sort();
    }

    keys.forEach((key) => {
      const child = parent[key];
      cb(recursiveWalk, child, key, parent);
    });
  }
};

export const removeUndefinedAttributes = <
  T extends {
    [key: string]: any;
  }
>(
  object: T
): { [key in keyof T]-?: T[key] } =>
  Object.keys(object).reduce((acc, key: keyof T) => {
    if (object[key] !== undefined) {
      acc[key] = object[key];
    }
    return acc;
  }, {} as { [key in keyof T]-?: T[key] });
