/**
 * Tags requests with certain values like **error-tag**.
 */
import { NextFunction, Request, Response } from "express";

export async function tagRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const pathSnippets: string[] = req.path.split("/");
  // @ts-ignore
  req["endpointPathIdentifier"] = pathSnippets[pathSnippets.length - 1];

  next();
}

export function getDay(string: any) {
  const expression = /([1-9]+)( days|h)/;
  const group = string.match(expression);

  if (group && group[2].trim() === "days") return Number.parseInt(group[1]);
  else if (group && group[2].trim() === "h")
    return Number.parseInt(group[1]) / 24;
  else return 7;
}

interface Projection {
  include?: string[];
  exclude?: string[];
}

/**
 * Filters out the attributes of an object based on the
 * given projections.
 *
 * Note: `exclude` take precedence over `include`.
 */
export const cleanseObject = function cleanseObject(
  object: object,
  projection: Projection
): object {
  let returnable: any = {};

  // handle includes
  Object.keys(object).forEach((value) => {
    if (projection.include?.includes(value)) {
      returnable[value] = (object as any)[value];
    }
  });

  // handle excludes
  if (!Object.keys(returnable).length) returnable = object;
  projection.exclude?.forEach((value) => {
    if (returnable[value] !== undefined) delete returnable[value];
  });

  return returnable;
};
