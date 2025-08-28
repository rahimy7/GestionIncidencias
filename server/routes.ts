import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  insertIncidentSchema,
  insertActionPlanSchema,
  insertIncidentParticipantSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage endpoints for protected file uploading
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Centers endpoints
  app.get("/api/centers", isAuthenticated, async (req, res) => {
    try {
      const centers = await storage.getCenters();
      res.json(centers);
    } catch (error) {
      console.error("Error fetching centers:", error);
      res.status(500).json({ message: "Failed to fetch centers" });
    }
  });

  // Incident types endpoints
  app.get("/api/incident-types", isAuthenticated, async (req, res) => {
    try {
      const types = await storage.getIncidentTypes();
      res.json(types);
    } catch (error) {
      console.error("Error fetching incident types:", error);
      res.status(500).json({ message: "Failed to fetch incident types" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Incidents endpoints
  app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      const { status, priority, centerId, assigneeId, reporterId } = req.query;
      const userId = req.user.claims.sub;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (centerId) filters.centerId = centerId;
      if (assigneeId) filters.assigneeId = assigneeId;
      if (reporterId) filters.reporterId = reporterId;

      const incidents = await storage.getIncidents(filters);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  app.get("/api/incidents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const incident = await storage.getIncidentById(id);
      
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ message: "Failed to fetch incident" });
    }
  });

  app.post("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertIncidentSchema.parse({
        ...req.body,
        reporterId: userId,
      });

      const incident = await storage.createIncident(validatedData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.put("/api/incidents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has permission to update this incident
      const incident = await storage.getIncidentById(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      const updates = req.body;
      const updatedIncident = await storage.updateIncident(id, updates);

      // Add history entry for the update
      await storage.addIncidentHistory({
        incidentId: id,
        userId: userId,
        action: "updated",
        description: "Incidencia actualizada",
        metadata: updates,
      });

      res.json(updatedIncident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Action plans endpoints
  app.get("/api/incidents/:id/action-plans", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const actionPlans = await storage.getActionPlansByIncident(id);
      res.json(actionPlans);
    } catch (error) {
      console.error("Error fetching action plans:", error);
      res.status(500).json({ message: "Failed to fetch action plans" });
    }
  });

  app.post("/api/incidents/:id/action-plans", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const validatedData = insertActionPlanSchema.parse({
        ...req.body,
        incidentId: id,
      });

      const actionPlan = await storage.createActionPlan(validatedData);
      res.status(201).json(actionPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating action plan:", error);
      res.status(500).json({ message: "Failed to create action plan" });
    }
  });

  app.put("/api/action-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedActionPlan = await storage.updateActionPlan(id, updates);
      res.json(updatedActionPlan);
    } catch (error) {
      console.error("Error updating action plan:", error);
      res.status(500).json({ message: "Failed to update action plan" });
    }
  });

  // Participants endpoints
  app.post("/api/incidents/:id/participants", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertIncidentParticipantSchema.parse({
        ...req.body,
        incidentId: id,
      });

      const participant = await storage.addIncidentParticipant(validatedData);
      res.status(201).json(participant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error adding participant:", error);
      res.status(500).json({ message: "Failed to add participant" });
    }
  });

  app.delete("/api/incidents/:incidentId/participants/:userId", isAuthenticated, async (req, res) => {
    try {
      const { incidentId, userId } = req.params;
      await storage.removeIncidentParticipant(incidentId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // Evidence upload endpoint
  app.put("/api/evidence-files", isAuthenticated, async (req: any, res) => {
    if (!req.body.evidenceFileURL) {
      return res.status(400).json({ error: "evidenceFileURL is required" });
    }

    const userId = req.user.claims.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.evidenceFileURL,
        {
          owner: userId,
          visibility: "private",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting evidence file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
