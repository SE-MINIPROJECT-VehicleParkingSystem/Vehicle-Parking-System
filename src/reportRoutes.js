import { Router } from "express";
import { collectReport, formatReportCsv, parseReportRange } from "./reports.js";

export function createReportRouter(models) {
  const router = Router();

  async function getReport(request, response, next, csv = false) {
    try {
      const range = parseReportRange(request.query);
      const report = await collectReport(models, range);
      if (csv) {
        response.type("text/csv");
        response.attachment("parking-report.csv");
        return response.send(formatReportCsv(report));
      }
      response.json(report);
    } catch (error) {
      if (error instanceof TypeError) {
        return response.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  router.get("/reports", (request, response, next) => getReport(request, response, next));
  router.get("/reports.csv", (request, response, next) => getReport(request, response, next, true));
  return router;
}