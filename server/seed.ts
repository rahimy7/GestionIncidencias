// server/sample-data.ts
import { db } from './db';
import { 
  users, centers, incidentTypes, incidents, 
  incidentParticipants, actionPlans, incidentHistory 
} from '@shared/schema';
import { hashPassword } from './auth';
import { eq } from 'drizzle-orm';

async function createSampleData() {
  try {
    console.log('🚀 Creando datos de muestra...');

    // 1. Verificar usuarios existentes
    const existingUsers = await db.select().from(users);
    let testUsers = existingUsers.filter(u => u.email.includes('@test.com'));

    if (testUsers.length === 0) {
      console.log('👥 Creando usuarios...');
      const defaultPassword = await hashPassword('password123');
      
      testUsers = await db.insert(users).values([
        {
          email: 'admin@test.com',
          password: defaultPassword,
          firstName: 'María',
          lastName: 'Rodríguez',
          role: 'admin',
          department: 'Administración',
          location: 'Santo Domingo'
        },
        {
          email: 'manager1@test.com',
          password: defaultPassword,
          firstName: 'Carlos',
          lastName: 'González',
          role: 'manager',
          department: 'Operaciones',
          location: 'Santo Domingo'
        },
        {
          email: 'user1@test.com',
          password: defaultPassword,
          firstName: 'Pedro',
          lastName: 'Sánchez',
          role: 'user',
          department: 'Producción',
          location: 'Santo Domingo'
        },
        {
          email: 'user2@test.com',
          password: defaultPassword,
          firstName: 'Laura',
          lastName: 'Fernández',
          role: 'user',
          department: 'Calidad',
          location: 'Santiago'
        }
      ]).returning();
    }

    // 2. Crear centros
    console.log('🏢 Creando centros...');
    const existingCenters = await db.select().from(centers);
    let testCenters = existingCenters;

    if (testCenters.length === 0) {
      testCenters = await db.insert(centers).values([
        {
          name: 'Centro Principal',
          code: 'CP001',
          address: 'Av. Principal 123, Santo Domingo',
          managerId: testUsers.find(u => u.role === 'manager')?.id || null
        },
        {
          name: 'Sucursal Norte',
          code: 'SN002', 
          address: 'Calle Norte 456, Santiago',
          managerId: testUsers.find(u => u.role === 'manager')?.id || null
        }
      ]).returning();
    }

    // 3. Crear tipos de incidentes
    console.log('📋 Creando tipos de incidentes...');
    const existingTypes = await db.select().from(incidentTypes);
    let testTypes = existingTypes;

    if (testTypes.length === 0) {
      testTypes = await db.insert(incidentTypes).values([
        {
          name: 'Accidente Laboral',
          description: 'Incidentes relacionados con accidentes de trabajo'
        },
        {
          name: 'Equipo Dañado',
          description: 'Daños o mal funcionamiento de equipos'
        },
        {
          name: 'Seguridad',
          description: 'Problemas de seguridad en las instalaciones'
        },
        {
          name: 'Calidad',
          description: 'No conformidades de calidad'
        }
      ]).returning();
    }

    // 4. Crear incidentes de muestra
    console.log('📝 Creando incidentes...');
    const sampleIncidents = await db.insert(incidents).values([
      {
        incidentNumber: 'INC-2025-001',
        title: 'Derrame de químicos en área de producción',
        description: 'Se detectó un derrame de químicos en el área de producción línea 2. Se evacuó el área inmediatamente.',
        status: 'in_progress',
        priority: 'high',
        reporterId: testUsers.find(u => u.role === 'user')?.id || testUsers[0].id,
        centerId: testCenters[0].id,
        typeId: testTypes.find(t => t.name === 'Seguridad')?.id || testTypes[0].id,
        assigneeId: testUsers.find(u => u.role === 'manager')?.id || testUsers[0].id,
        rootCause: 'Válvula defectuosa en tanque de almacenamiento',
        evidenceFiles: ['/objects/sample1.jpg', '/objects/sample2.jpg']
      },
      {
        incidentNumber: 'INC-2025-002',
        title: 'Máquina empacadora fuera de servicio',
        description: 'La máquina empacadora #3 presenta fallas en el motor principal y no puede operar.',
        status: 'reported',
        priority: 'medium',
        reporterId: testUsers.find(u => u.email === 'user2@test.com')?.id || testUsers[0].id,
        centerId: testCenters[1].id,
        typeId: testTypes.find(t => t.name === 'Equipo Dañado')?.id || testTypes[0].id,
        assigneeId: testUsers.find(u => u.role === 'manager')?.id || testUsers[0].id,
        evidenceFiles: ['/objects/machine1.jpg']
      },
      {
        incidentNumber: 'INC-2025-003',
        title: 'Producto defectuoso en lote #445',
        description: 'Se encontraron productos con defectos de calidad en el lote #445 de producción.',
        status: 'completed',
        priority: 'low',
        reporterId: testUsers.find(u => u.email === 'user2@test.com')?.id || testUsers[0].id,
        centerId: testCenters[0].id,
        typeId: testTypes.find(t => t.name === 'Calidad')?.id || testTypes[0].id,
        assigneeId: testUsers.find(u => u.role === 'manager')?.id || testUsers[0].id,
        rootCause: 'Calibración incorrecta de equipos de medición',
        actualResolutionDate: new Date('2025-08-28'),
        evidenceFiles: ['/objects/quality1.jpg', '/objects/quality2.jpg']
      },
      {
        incidentNumber: 'INC-2025-004',
        title: 'Caída de empleado en almacén',
        description: 'Un empleado se resbaló y cayó en el área de almacén debido a piso mojado.',
        status: 'pending_approval',
        priority: 'critical',
        reporterId: testUsers.find(u => u.role === 'user')?.id || testUsers[0].id,
        centerId: testCenters[0].id,
        typeId: testTypes.find(t => t.name === 'Accidente Laboral')?.id || testTypes[0].id,
        assigneeId: testUsers.find(u => u.role === 'manager')?.id || testUsers[0].id,
        rootCause: 'Falta de señalización de piso mojado',
        evidenceFiles: ['/objects/accident1.jpg']
      }
    ]).returning();

    // 5. Crear participantes
    console.log('👥 Agregando participantes...');
    for (const incident of sampleIncidents) {
      await db.insert(incidentParticipants).values([
        {
          incidentId: incident.id,
          userId: incident.reporterId,
          role: 'reporter'
        },
        {
          incidentId: incident.id,
          userId: incident.assigneeId || testUsers[0].id,
          role: 'responsible'
        }
      ]);
    }

    // 6. Crear planes de acción
    console.log('📋 Creando planes de acción...');
    for (const incident of sampleIncidents) {
      if (incident.status === 'in_progress' || incident.status === 'pending_approval') {
        await db.insert(actionPlans).values([
          {
            incidentId: incident.id,
            title: 'Reparación inmediata',
            description: 'Realizar las reparaciones necesarias para resolver el incidente',
            status: incident.status === 'pending_approval' ? 'completed' : 'in_progress',
            assigneeId: incident.assigneeId || testUsers[0].id,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
            completedAt: incident.status === 'pending_approval' ? new Date() : null
          },
          {
            incidentId: incident.id,
            title: 'Capacitación del personal',
            description: 'Capacitar al personal sobre prevención de incidentes similares',
            status: 'pending',
            assigneeId: testUsers.find(u => u.role === 'user')?.id || testUsers[0].id,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // +14 días
          }
        ]);
      }
    }

    // 7. Crear historial
    console.log('📈 Creando historial...');
    for (const incident of sampleIncidents) {
      await db.insert(incidentHistory).values([
        {
          incidentId: incident.id,
          userId: incident.reporterId,
          action: 'created',
          description: 'Incidente reportado',
          metadata: { status: 'reported' }
        },
        {
          incidentId: incident.id,
          userId: incident.assigneeId || testUsers[0].id,
          action: 'assigned',
          description: 'Incidente asignado para investigación',
          metadata: { 
            status: 'assigned',
            assignedTo: incident.assigneeId 
          }
        }
      ]);

      if (incident.status === 'completed') {
        await db.insert(incidentHistory).values({
          incidentId: incident.id,
          userId: incident.assigneeId || testUsers[0].id,
          action: 'completed',
          description: 'Incidente resuelto completamente',
          metadata: { 
            status: 'completed',
            resolution: incident.rootCause 
          }
        });
      }
    }

    console.log('✅ Datos de muestra creados exitosamente!');
    console.log(`👥 Usuarios: ${testUsers.length}`);
    console.log(`🏢 Centros: ${testCenters.length}`);
    console.log(`📋 Tipos: ${testTypes.length}`);
    console.log(`📝 Incidentes: ${sampleIncidents.length}`);

    console.log('\n🔑 Credenciales de acceso:');
    console.log('admin@test.com / password123 (Administrador)');
    console.log('manager1@test.com / password123 (Manager)');
    console.log('user1@test.com / password123 (Usuario)');
    console.log('user2@test.com / password123 (Usuario)');

  } catch (error) {
    console.error('❌ Error creando datos:', error);
  } finally {
    process.exit(0);
  }
}

createSampleData();