// server/routes.ts - Correcciones necesarias

import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { login, register, isAuthenticated } from "./auth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import {
  insertIncidentSchema,
  insertActionPlanSchema,
  insertIncidentParticipantSchema,
  Center,
} from "@shared/schema";
import { z } from "zod";
import { hashPassword } from './auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

interface RequestWithFile extends Express.Request {
  file?: Express.Multer.File;
  user?: any;
  body: any;
}
// Configuración de multer para uploads

const multerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes - JWT instead of Replit
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await login(email, password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = await register(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

// Agregar después de las rutas de auth existentes
app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      location: user.location
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

  app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

  // Object storage endpoints
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    // FIX: Usar req.user.id en lugar de req.user.claims.sub
    const userId = (req as any).user.id;
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

app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const stats = await storage.getDashboardStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

  // Center stats for manager dashboard
 app.get('/api/dashboard/center-stats/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    const centerId = req.params.centerId;
    // FIX: usar req.user.id en lugar de req.user.claims.sub  
    const userId = req.user.id;
    const centerStats = await storage.getCenterStats(centerId, userId);
    res.json(centerStats);
  } catch (error) {
    console.error("Error fetching center stats:", error);
    res.status(500).json({ message: "Failed to fetch center stats" });
  }
});

  // Get user's own incidents
app.get('/api/incidents/my', isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const incidents = await storage.getIncidentsByReporter(userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching user incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

  // Get incidents by center (for managers)
app.get('/api/incidents/center/:centerId?', isAuthenticated, async (req: any, res) => {
  try {
    const centerId = req.params.centerId;
    const userId = req.user.id;
    // Nuevo: parámetros de paginación
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const incidents = await storage.getIncidentsByCenter(centerId, userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching center incidents:", error);
    res.status(500).json({ message: "Failed to fetch center incidents" });
  }
});

  // Get user's managed center
app.get('/api/centers/my', isAuthenticated, async (req: any, res) => {
  try {
    // FIX: usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;
    const center = await storage.getCenterByManager(userId);
    res.json(center);
  } catch (error) {
    console.error("Error fetching managed center:", error);
    res.status(500).json({ message: "Failed to fetch center" });
  }
});

  // Incidents endpoints
// Reemplaza tu handler actual de /api/incidents por este:
app.get("/api/incidents", isAuthenticated, async (req: any, res) => {
  try {
    const {
      centerId = "",
      typeId = "",
      startDate = "", // yyyy-MM-dd
      endDate = "",   // yyyy-MM-dd
      sortBy = "createdAt", // "createdAt" | "center" | "type"
      sortDir = "desc",     // "asc" | "desc"
      limit = "100",
      offset = "0",
    } = req.query as Record<string, string>;

    // Mapeo a la firma que ya usas en /api/incidents/filtered
    // (getIncidentsWithAdvancedFilters)
    const filters: any = {};

    if (centerId) filters.centerId = centerId;
    if (typeId)   filters.typeId = typeId;

    if (startDate) filters.dateFrom = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      filters.dateTo = end;
    }

    // Unifica el nombre de campo de ordenación con tu storage:
    // "createdAt" -> "date" (como usas en /filtered)
    filters.sortBy = (sortBy === "createdAt") ? "date" : sortBy;
    filters.sortOrder = (sortDir === "asc") ? "asc" : "desc";

    const incidents = await storage.getIncidentsWithAdvancedFilters(
      filters,
      parseInt(limit, 10),
      parseInt(offset, 10)
    );

    res.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});



  app.get('/api/incidents/assigned', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const incidents = await storage.getIncidentsByAssignee(userId);
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching assigned incidents:", error);
    res.status(500).json({ message: "Failed to fetch assigned incidents" });
  }
});

  app.post("/api/incidents", isAuthenticated, async (req: any, res) => {
    try {
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
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
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      
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
  app.post("/api/incidents/:id/action-plans", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // FIX: Usar req.user.id en lugar de req.user.claims.sub
      const userId = req.user.id;
      
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

  // Evidence upload endpoint - FIX IMPORTANTE
  app.put("/api/evidence-files", isAuthenticated, async (req: any, res) => {
    if (!req.body.evidenceFileURL) {
      return res.status(400).json({ error: "evidenceFileURL is required" });
    }

    // FIX: Usar req.user.id en lugar de req.user.claims.sub
    const userId = req.user.id;

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
  // Agregar estas rutas en server/routes.ts después de la línea con los endpoints de centers

  // Crear centro (POST)
  app.post("/api/centers", isAuthenticated, async (req: any, res) => {
    try {
      const { name, code, address, managerId } = req.body;
      
      // Validar datos requeridos
      if (!name || !code || !address) {
        return res.status(400).json({ 
          message: "Nombre, código y dirección son requeridos" 
        });
      }

      // Verificar si el código ya existe
      const existingCenter = await storage.getCenterByCode(code);
      if (existingCenter) {
        return res.status(400).json({ 
          message: "El código de centro ya existe" 
        });
      }

      const centerData = {
        name,
        code: code.toUpperCase(),
        address,
        managerId: managerId || null
      };

      const newCenter = await storage.createCenter(centerData);
      res.status(201).json(newCenter);
    } catch (error) {
      console.error("Error creating center:", error);
      res.status(500).json({ message: "Error al crear el centro" });
    }
  });

  // Obtener usuarios (para el select de managers)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    
    // Solo admins o el mismo usuario pueden ver detalles
    if (requestingUserRole !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});

app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    
    // Solo admins pueden editar usuarios
    if (requestingUserRole !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    const updates = req.body;
    
    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    const updatedUser = await storage.updateUser(id, updates);
    
    // No devolver la contraseña
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
});

app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const requestingUserRole = req.user.role;
    const requestingUserId = req.user.id;
    
    // Solo admins pueden eliminar usuarios
    if (requestingUserRole !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    // No permitir que se eliminen a sí mismos
    if (requestingUserId === id) {
      return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
    }

    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar si el usuario tiene incidencias asociadas
    const userIncidents = await storage.getIncidentsByReporter(id);
    const assignedIncidents = await storage.getIncidentsByAssignee(id);
    
    if (userIncidents.length > 0 || assignedIncidents.length > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar el usuario porque tiene incidencias asociadas" 
      });
    }

    await storage.deleteUser(id);
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
});

  // Agregar estos endpoints al final de server/routes.ts, antes de "const httpServer = createServer(app);"

  // Obtener todos los usuarios (para gestión de usuarios)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Crear nuevo usuario
app.post("/api/users", isAuthenticated, async (req: any, res) => {
  try {
    const userData = req.body;
    
    const existingUser = await storage.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(400).json({ 
        message: "El email ya está en uso" 
      });
    }

    const { hashPassword } = await import('./auth.js');
    const hashedPassword = await hashPassword(userData.password);
    const userDataWithHashedPassword = {
      ...userData,
      password: hashedPassword,
      centerId: userData.centerId || null
    };

    const newUser = await storage.createUser(userDataWithHashedPassword);
    
    const { password, ...userResponse } = newUser;
    res.status(201).json(userResponse);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Error al crear el usuario" });
  }
});

// Actualizar usuario
app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Si se actualiza el email, verificar que no esté en uso
    if (updates.email) {
      const existingUser = await storage.getUserByEmail(updates.email);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ 
          message: "El email ya está en uso" 
        });
      }
    }
    
    // Si se actualiza la contraseña, hashearla
    if (updates.password) {
      const { hashPassword } = await import('./auth.js');
      updates.password = await hashPassword(updates.password);
    }
    
    const updatedUser = await storage.updateUser(id, updates);
    
    // No devolver la contraseña
    const { password, ...userResponse } = updatedUser;
    res.json(userResponse);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
});

// Obtener usuario específico
app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // No devolver la contraseña
    const { password, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
});


// Obtener todos los departamentos
app.get("/api/departments", isAuthenticated, async (req, res) => {
  try {
    // Por ahora usamos los departments del campo department de users como referencia
    // Más adelante se puede crear una tabla separada para departments
    const departments = await storage.getDepartments();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
});

// Crear departamento
app.post("/api/departments", isAuthenticated, async (req: any, res) => {
  try {
    const { name, code, description, headUserId } = req.body;
    
    // Validar datos requeridos
    if (!name || !code) {
      return res.status(400).json({ 
        message: "Nombre y código son requeridos" 
      });
    }

    // Verificar si el código ya existe
    const existingDept = await storage.getDepartmentByCode(code);
    if (existingDept) {
      return res.status(400).json({ 
        message: "El código de departamento ya existe" 
      });
    }

    const departmentData = {
      name,
      code: code.toUpperCase(),
      description: description || null,
      headUserId: headUserId || null
    };

    const newDepartment = await storage.createDepartment(departmentData);
    res.status(201).json(newDepartment);
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ message: "Error al crear el departamento" });
  }
});

// Actualizar departamento
app.put("/api/departments/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedDepartment = await storage.updateDepartment(id, updates);
    res.json(updatedDepartment);
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ message: "Error al actualizar el departamento" });
  }
});

// Eliminar departamento
app.delete("/api/departments/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay usuarios asignados al departamento
    const usersInDepartment = await storage.getUsersByDepartment(id);
    if (usersInDepartment.length > 0) {
      return res.status(400).json({ 
        message: "No se puede eliminar el departamento porque tiene usuarios asignados" 
      });
    }

    await storage.deleteDepartment(id);
    res.json({ message: "Departamento eliminado correctamente" });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ message: "Error al eliminar departamento" });
  }
});

// =================== CENTROS/TIENDAS MEJORADOS ===================

// Obtener centros/tiendas con filtro por tipo
app.get('/api/centers', isAuthenticated, async (req: any, res) => {
  try {
    const { type } = req.query; // 'store' | 'center' | undefined (todos)
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Tipar explícitamente la variable centers
    let centers: Center[] = [];
    
    if (user.role === 'admin') {
      centers = await storage.getAllCenters(type);
    } else if (user.role === 'manager' && user.centerId) {
      const userCenter = await storage.getCenter(user.centerId);
      centers = userCenter ? [userCenter] : [];
    }
    
    res.json(centers);
  } catch (error) {
    console.error("Error fetching centers:", error);
    res.status(500).json({ message: "Failed to fetch centers" });
  }
});

// Crear centro/tienda
app.post("/api/centers", isAuthenticated, async (req: any, res) => {
  try {
    const { name, code, address, managerId, type } = req.body;
    
    // Validar datos requeridos
    if (!name || !code || !address) {
      return res.status(400).json({ 
        message: "Nombre, código y dirección son requeridos" 
      });
    }

    // Validar formato del código según el tipo
    const codeUpper = code.toUpperCase();
    if (type === 'store' && !codeUpper.startsWith('T')) {
      return res.status(400).json({ 
        message: "El código de tienda debe iniciar con 'T' (ej: T01, T02)" 
      });
    }
    if (type === 'center' && !codeUpper.startsWith('TCD')) {
      return res.status(400).json({ 
        message: "El código de centro debe iniciar con 'TCD' (ej: TCD11, TCD12)" 
      });
    }

    // Verificar si el código ya existe
    const existingCenter = await storage.getCenterByCode(codeUpper);
    if (existingCenter) {
      return res.status(400).json({ 
        message: "El código ya existe" 
      });
    }

    const centerData = {
      name,
      code: codeUpper,
      address,
      managerId: managerId || null
    };

    const newCenter = await storage.createCenter(centerData);
    res.status(201).json(newCenter);
  } catch (error) {
    console.error("Error creating center:", error);
    res.status(500).json({ message: "Error al crear el centro/tienda" });
  }
});

// Actualizar centro/tienda
app.put("/api/centers/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Si se actualiza el código, validar formato
    if (updates.code) {
      const codeUpper = updates.code.toUpperCase();
      updates.code = codeUpper;
      
      // Verificar si el nuevo código ya existe (excluyendo el centro actual)
      const existingCenter = await storage.getCenterByCode(codeUpper);
      if (existingCenter && existingCenter.id !== id) {
        return res.status(400).json({ 
          message: "El código ya existe" 
        });
      }
    }
    
    const updatedCenter = await storage.updateCenter(id, updates);
    res.json(updatedCenter);
  } catch (error) {
    console.error("Error updating center:", error);
    res.status(500).json({ message: "Error al actualizar el centro/tienda" });
  }
});

// Endpoint para subir archivos
app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: RequestWithFile, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo' });
    }

    const { incidentId } = req.body;
    if (!incidentId) {
      return res.status(400).json({ message: 'ID de incidencia requerido' });
    }

    // Construir URL del archivo
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Guardar referencia del archivo en la base de datos si tienes tabla de attachments
    // await storage.createAttachment({
    //   incidentId,
    //   filename: req.file.filename,
    //   originalName: req.file.originalname,
    //   mimetype: req.file.mimetype,
    //   size: req.file.size,
    //   url: fileUrl
    // });

    res.json({
      message: 'Archivo subido exitosamente',
      url: fileUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Obtener usuarios de prueba (para página TestUsers)
  app.get("/api/test-users", async (req, res) => {
    try {
      const testUsers = await storage.getTestUsers();
      res.json(testUsers);
    } catch (error) {
      console.error("Error fetching test users:", error);
      res.status(500).json({ message: "Failed to fetch test users" });
    }
  });

  app.delete('/api/centers/:id', isAuthenticated, async (req, res) => {
  try {
    await storage.deleteCenter(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar centro" });
  }
});

// server/routes.ts - Agregar estos endpoints después de los existentes

// Endpoint para estadísticas globales (Admin)
app.get('/api/dashboard/global-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Verificar que el usuario sea admin
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const globalStats = await storage.getGlobalStats();
    res.json(globalStats);
  } catch (error) {
    console.error("Error fetching global stats:", error);
    res.status(500).json({ message: "Failed to fetch global stats" });
  }
});

app.get('/api/dashboard/center-type-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const stats = await storage.getCenterTypeStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching center type stats:", error);
    res.status(500).json({ message: "Failed to fetch center type stats" });
  }
});

// Estadísticas de departamentos
app.get('/api/dashboard/department-stats', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const stats = await storage.getDepartmentStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching department stats:", error);
    res.status(500).json({ message: "Failed to fetch department stats" });
  }
});

// Endpoint para obtener incidencias con filtros avanzados

app.get('/api/incidents/filtered', isAuthenticated, async (req: any, res) => {
  try {
    const { 
      status, 
      priority, 
      centerId, 
      search,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    const filters: any = {};
    
    // Aplicar filtros básicos
    if (status && status !== 'critical') filters.status = status;
    if (priority || status === 'critical') {
      filters.priority = status === 'critical' ? 'critical' : priority;
    }
    if (centerId) filters.centerId = centerId;
    
    // Aplicar filtros de búsqueda y fecha
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Final del día
      filters.dateTo = endDate;
    }
    
    // Configurar ordenamiento
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;


if (!user) {
  return res.status(404).json({ message: "User not found" });
}

// Para managers, limitar a su centro si no son admin
if (user.role === 'manager' && user.centerId && !filters.centerId) {
  filters.centerId = user.centerId;
}

    const incidents = await storage.getIncidentsWithAdvancedFilters(filters, parseInt(limit), parseInt(offset));
    res.json(incidents);
  } catch (error) {
    console.error("Error fetching filtered incidents:", error);
    res.status(500).json({ message: "Failed to fetch incidents" });
  }
});

// Endpoint para obtener lista de centros
app.get('/api/centers', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let centers: { id: string; name: string; createdAt: Date | null; code: string; address: string | null; managerId: string | null; }[];
    if (user.role === 'admin') {
      centers = await storage.getAllCenters();
    } else if (user.role === 'manager' && user.centerId) {
  const userCenter = await storage.getCenter(user.centerId);
  centers = userCenter ? [userCenter] : [];
    } else {
      centers = [];
    }
    
    res.json(centers);
  } catch (error) {
    console.error("Error fetching centers:", error);
    res.status(500).json({ message: "Failed to fetch centers" });
  }
});

// Endpoint para estadísticas de tendencias
app.get('/api/dashboard/trends', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    const trends = await storage.getTrendData();
    res.json(trends);
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({ message: "Failed to fetch trends" });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}