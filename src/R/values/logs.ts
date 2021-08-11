import path from "path";
import os from "os";

/**
 * The path to the root directory of the directory
 * structure that all log files reside.
 * @readonly
 */
export const logsBaseDirectory: string = path.join(
  os.homedir(),
  `/SIRFiles/${process.env.NODE_ENV}/logs/`
);

export default {
  logsBaseDirectory,
};
