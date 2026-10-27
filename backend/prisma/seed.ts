import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const unitNames = ['Electrical','Carpentry','Plumbing','Welding','Masonry','Painting','Mechanical','Utility'];
  const units: Record<string, string> = {};
  for (const name of unitNames) {
    const u = await prisma.tradeUnit.upsert({ where: { name }, update: {}, create: { name } });
    units[name] = u.id;
  }

  // category -> trade unit (your routing rules; confirm with GSO later)
  const cats: [string, string][] = [
    ['Faulty Lighting', 'Electrical'],
    ['Faulty Wiring / Outlet', 'Electrical'],
    ['Broken Fan / Aircon', 'Mechanical'],
    ['Water Leak', 'Plumbing'],
    ['Clogged Toilet / Drain', 'Plumbing'],
    ['Damaged Chair / Table', 'Carpentry'],
    ['Broken Door / Window', 'Carpentry'],
    ['Cracked Wall / Ceiling', 'Masonry'],
    ['Peeling Paint / Mold', 'Painting'],
    ['Damaged Gate / Railing', 'Welding'],
    ['Cleaning / Grounds', 'Utility'],
  ];
  for (const [name, unit] of cats) {
    await prisma.issueCategory.upsert({
      where: { name }, update: {},
      create: { name, defaultTradeUnitId: units[unit] },
    });
  }

  // sample locations: replace with real ones from the GSO
  for (const building of ['Main Building', 'Science Building']) {
    for (const floor of ['1st Floor', '2nd Floor']) {
      for (const room of ['Room 101', 'Room 102', 'Restroom']) {
        await prisma.location.upsert({
          where: { building_floor_room: { building, floor, room } },
          update: {}, create: { building, floor, room },
        });
      }
    }
  }

  const hash = await bcrypt.hash('password123', 10);
  const users: { fullName: string; email: string; role: Role; userType?: string; unit?: string }[] = [
    { fullName: 'Test Student', email: 'student@test.com', role: 'REPORTER', userType: 'student' },
    { fullName: 'Test Faculty', email: 'faculty@test.com', role: 'REPORTER', userType: 'faculty' },
    { fullName: 'GSO Coordinator', email: 'coordinator@test.com', role: 'COORDINATOR' },
    { fullName: 'Campus Admin', email: 'admin@test.com', role: 'ADMIN' },
    { fullName: 'Plumber One', email: 'plumber@test.com', role: 'TECHNICIAN', unit: 'Plumbing' },
    { fullName: 'Plumber Two', email: 'plumber2@test.com', role: 'TECHNICIAN', unit: 'Plumbing' },
    { fullName: 'Electrician One', email: 'electrician@test.com', role: 'TECHNICIAN', unit: 'Electrical' },
    { fullName: 'Electrician Two', email: 'electrician2@test.com', role: 'TECHNICIAN', unit: 'Electrical' },
    { fullName: 'Mechanic One', email: 'mechanic@test.com', role: 'TECHNICIAN', unit: 'Mechanical' },
    { fullName: 'Painter One', email: 'painter@test.com', role: 'TECHNICIAN', unit: 'Painting' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email }, update: {},
      create: {
        fullName: u.fullName, email: u.email, passwordHash: hash,
        role: u.role, userType: u.userType,
        tradeUnitId: u.unit ? units[u.unit] : null,
      },
    });
  }
  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());