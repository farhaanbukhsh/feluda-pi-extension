import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { FELUDA_LANGUAGES, FELUDA_OSI_FILTERS, FELUDA_SBOM_FORMATS } from "./types";

export const languageSchema = StringEnum(FELUDA_LANGUAGES, {
  description: "Force Feluda language detection",
});

export const osiFilterSchema = StringEnum(FELUDA_OSI_FILTERS, {
  description: "Optional OSI approval filter",
});

export const sbomFormatSchema = StringEnum(FELUDA_SBOM_FORMATS, {
  description: "SBOM format to generate",
});

export const commonProjectParams = {
  path: Type.Optional(Type.String({ description: "Project directory to analyze. Defaults to the current working directory." })),
  language: Type.Optional(languageSchema),
};

export const scanLicensesSchema = Type.Object({
  ...commonProjectParams,
  osi: Type.Optional(osiFilterSchema),
  noLocal: Type.Optional(
    Type.Boolean({
      description: "Skip local dependency metadata checks and force network lookup.",
      default: false,
    }),
  ),
});

export const checkRestrictiveSchema = Type.Object({
  ...commonProjectParams,
  noLocal: Type.Optional(
    Type.Boolean({
      description: "Skip local dependency metadata checks and force network lookup.",
      default: false,
    }),
  ),
});

export const checkCompatibilitySchema = Type.Object({
  ...commonProjectParams,
  projectLicense: Type.String({ description: "The project license to compare dependencies against, e.g. MIT or Apache-2.0." }),
  incompatibleOnly: Type.Optional(
    Type.Boolean({
      description: "Return only dependencies Feluda marks incompatible.",
      default: false,
    }),
  ),
});

export const generateSbomSchema = Type.Object({
  path: Type.Optional(Type.String({ description: "Project directory to analyze. Defaults to the current working directory." })),
  format: sbomFormatSchema,
  output: Type.Optional(Type.String({ description: "Output file path or file prefix for generated SBOM files." })),
});
