import os from "os";
import path from "path";

/**
 * Values representing the types of entities that require resources
 * @readonly
 */
export enum entities {
  CONSUMER = "CONSUMER",
}

/**
 * Values representing the mime types of files that
 * are allowed to be uploaded to the system.
 * @readonly
 */
export enum allowedMimeTypes {
  JPEG = "image/jpeg",
  JPG = "image/jpg",
  PNG = "image/png",
}

/**
 * Values representing paths that each allowed
 * mimetype corresponds to.
 * @readonly
 */
export enum allowedPaths {
  IMAGES = "IMAGES",
  DOCUMENTS = "DOCUMENTS",
}

/**
 * Values representing the limits to the sizes
 * of files based on their types.
 * @readonly
 */
export enum fileSizeLimits {
  MAX_FILE_SIZE = 10 * 1024 * 1024, // 10MB
}

/**
 * The path to the root directory of the directory
 * structure that all files are uploaded to.
 * @readonly
 */
export const uploadsBaseDirectory: string = path.join(
  os.homedir(),
  `/SIRFiles/${process.env.NODE_ENV}/uploads/`
);

export default {
  uploadsBaseDirectory,
  fileSizeLimits,
  allowedPaths,
  allowedMimeTypes,
  entities,
};
