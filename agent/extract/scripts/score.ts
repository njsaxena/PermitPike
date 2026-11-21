import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { CONFIRM_BELOW, CRITICAL_FIELDS, ExtractionJob, evidenceSchema, type FieldReading } from "../evidence";
import { extractWithEvidence, SUPPORTED_FILES } from "../index";

const samplesDir = fileURLToPath(new URL("../samples/", import.meta.url));
const answerValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type AnswerValue = z.infer<typeof answerValue>;

const AnswerKey = z.array(z.strictObject({
  file: z.string().min(1),
  jobType: ExtractionJob,
  clean: z.boolean(),
  modelNumber: z.string().trim().min(1).optional(),
  expected: z.record(z.string(), answerValue),
})).min(1);

const relativeToleranceFields = new Set([
  "heatPump.coolingBTU",
  "heatPump.heatingBTU",
  "existingLoad.measuredPeakDemandKW",
  "battery.continuousOutputW",
]);
const criticalFields = new Set<string>(CRITICAL_FIELDS);

export function assessReading(path: string, expected: AnswerValue, reading: FieldReading | undefined) {
  const actual = reading?.value;
  const flagged = reading !== undefined && reading.confidence < CONFIRM_BELOW;
  if (typeof actual === "number" && typeof expected === "number" && relativeToleranceFields.has(path)) {
    const tolerance = Math.abs(expected) * 0.02;
    const rounding = Math.abs(expected) * Number.EPSILON;
    return { matches: Math.abs(actual - expected) <= tolerance + rounding, flagged };
  }
  if (typeof actual === "string" && typeof expected === "string") {
    return { matches: actual.trim().toLowerCase() === expected.trim().toLowerCase(), flagged };
  }
  return { matches: actual === expected, flagged };
}

function supportedFile(file: string): boolean {
  return Object.hasOwn(SUPPORTED_FILES, extname(file).toLowerCase());
}

async function loadAnswers() {
  const source = await readFile(join(samplesDir, "answers.json"), "utf8");
  const answers = AnswerKey.parse(JSON.parse(source));
  const entries = await readdir(samplesDir, { withFileTypes: true });
  const files = new Set(entries.filter((entry) => entry.isFile() && supportedFile(entry.name)).map((entry) => entry.name));
  const labeled = new Set<string>();

  for (const { file, jobType, expected } of answers) {
    if (!files.has(file)) throw new Error(`No supported sample file named ${file} in the samples directory.`);
    if (labeled.has(file)) throw new Error(`Multiple answers for ${file}.`);
    labeled.add(file);

    const paths = Object.keys(expected);
    if (paths.length === 0) throw new Error(`No expected fields for ${file}.`);
    const knownFields = evidenceSchema(jobType).shape;
    for (const path of paths) {
      if (!Object.hasOwn(knownFields, path)) throw new Error(`Unknown ${jobType} field ${path} in ${file}.`);
    }
  }

  const unlabeled = [...files].filter((file) => !labeled.has(file)).sort();
  if (unlabeled.length) throw new Error(`Add answers for ${unlabeled.join(", ")} before scoring.`);
  return answers;
}

type FieldTotals = {
  correct: number;
  "correct null": number;
  wrong: number;
  flagged: number;
  "wrong unflagged": number;
};

async function score(refresh: boolean): Promise<boolean> {
  const answers = await loadAnswers();
  const totals = new Map<string, FieldTotals>();
  const failures: string[] = [];
  let scored = 0;

  for (const { file, jobType, expected, clean, modelNumber } of answers) {
    try {
      const { fields, model } = await extractWithEvidence(join(samplesDir, file), jobType, { modelNumber, refresh });
      console.log(`Scored ${file} (${model})`);
      scored++;

      for (const [path, value] of Object.entries(expected)) {
        const reading = fields[path];
        const { matches, flagged } = assessReading(path, value, reading);
        const counts = totals.get(path) ?? { correct: 0, "correct null": 0, wrong: 0, flagged: 0, "wrong unflagged": 0 };
        if (flagged) counts.flagged++;

        if (matches) {
          counts[value === null ? "correct null" : "correct"]++;
        } else {
          counts.wrong++;
          const detail = `${file} ${path} expected ${JSON.stringify(value)}, got ${JSON.stringify(reading?.value) ?? "no reading"}`;
          if (!flagged) {
            counts["wrong unflagged"]++;
            failures.push(`WRONG WITHOUT FLAG — ${detail}`);
          }
          if (clean && criticalFields.has(path)) failures.push(`CLEAN CRITICAL MISS — ${detail}`);
        }

        totals.set(path, counts);
      }
    } catch (error) {
      failures.push(`COULD NOT SCORE ${file} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const rows = [...totals].sort(([left], [right]) => left.localeCompare(right));
  if (rows.length) console.table(Object.fromEntries(rows));
  console.log(`${scored}/${answers.length} samples scored.`);
  failures.forEach((failure) => console.error(failure));
  return failures.length === 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--refresh")) {
    console.error("Usage: pnpm --filter @permitpike/agent score [--refresh]");
    process.exitCode = 1;
  } else {
    try {
      const passed = await score(args.includes("--refresh"));
      if (!passed) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
