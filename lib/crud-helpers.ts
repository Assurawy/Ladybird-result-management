import "server-only";
import { prisma } from "./prisma";

// Only for models with no required nested writes — Subject/AssessmentScheme/
// GradingScheme/ReportTemplate/User have their own bespoke route handlers
// because they need to write join rows / hash passwords / etc.
type SimpleModel = "section" | "department" | "classArm" | "commentTemplate" | "skillDomain";

export function simpleCrud(modelName: SimpleModel, orderBy: Record<string, "asc" | "desc"> = { id: "asc" }) {
  const model = (prisma as any)[modelName];
  return {
    list: (where?: any) => model.findMany({ where, orderBy }),
    create: (data: any) => model.create({ data }),
    update: (id: string, data: any) => model.update({ where: { id }, data }),
    remove: (id: string) => model.delete({ where: { id } }),
  };
}
