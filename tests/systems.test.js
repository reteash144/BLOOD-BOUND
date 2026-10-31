import test from 'node:test';
import assert from 'node:assert/strict';
import { StatusSystem } from '../js/systems/StatusSystem.js';
import { DiagnosticSystem } from '../js/systems/DiagnosticSystem.js';
import { MedicineSystem } from '../js/systems/MedicineSystem.js';

const symptomDefinitions = [
  { id: 'fever', name: 'FEVER', consequence: 'Slower movement', managedBy: 'paracetamol' },
  { id: 'anaemia', name: 'ANAEMIA', consequence: 'Reduced maximum health', managedBy: 'parasite control' },
  { id: 'dehydration', name: 'DEHYDRATION', consequence: 'Stamina penalties', managedBy: 'ors' }
];

test('status effects merge severity, reduce, and expire', () => {
  const events = [];
  const scene = { events: { emit: (...args) => events.push(args) } };
  const statuses = new StatusSystem(scene, symptomDefinitions);
  statuses.add('fever', 1000, 1);
  statuses.add('fever', 500, 2);
  assert.equal(statuses.severity('fever'), 2);
  statuses.reduce('fever', 1);
  assert.equal(statuses.severity('fever'), 1);
  statuses.update(1100);
  assert.equal(statuses.has('fever'), false);
  assert.ok(events.length >= 3);
});

test('diagnostic system unlocks only the configured pathogen', () => {
  const emitted = [];
  const scene = { events: { emit: (...args) => emitted.push(args) } };
  const diagnostics = new DiagnosticSystem(scene, { malaria: { name: 'Malaria', clues: ['erythrocyte invasion'] } });
  assert.equal(diagnostics.identify('dengue'), false);
  assert.equal(diagnostics.isIdentified, false);
  assert.equal(diagnostics.identify('malaria'), true);
  assert.equal(diagnostics.isIdentified, true);
  assert.equal(emitted.length, 1);
});

test('medicine effects preserve treatment roles and require diagnosis for targeted therapy', () => {
  const statusEvents = [];
  const scene = {
    diagnosisComplete: false,
    time: { now: 100 },
    events: { emit: (...args) => statusEvents.push(args) },
    ui: { toast: () => {} },
    player: { stamina: 20, maxStamina: 100 },
    boss: { dead: false, damage: 0, takeDamage(amount) { this.damage += amount; this.weakened = true; } },
    statusSystem: new StatusSystem({ events: { emit: (...args) => statusEvents.push(args) } }, symptomDefinitions),
    closeMedicine() { this.closed = true; }
  };
  const data = [
    { id: 'artemether-lumefantrine', name: 'Artemether–lumefantrine', requiresDiagnosis: true, cooldown: 1000 },
    { id: 'paracetamol', name: 'Paracetamol', requiresDiagnosis: false, cooldown: 1000 },
    { id: 'ors', name: 'ORS', requiresDiagnosis: false, cooldown: 1000 }
  ];
  const medicine = new MedicineSystem(scene, data);
  scene.statusSystem.add('anaemia', 5000, 1);
  assert.equal(medicine.canUse('artemether-lumefantrine'), false);
  scene.diagnosisComplete = true;
  assert.equal(medicine.canUse('artemether-lumefantrine'), true);
  assert.equal(medicine.useSelected(), true);
  assert.ok(scene.boss.damage > 0);
  assert.equal(scene.statusSystem.has('anaemia'), false);

  medicine.selectedId = 'paracetamol';
  scene.statusSystem.add('fever', 5000, 2);
  medicine.useSelected();
  assert.equal(scene.statusSystem.has('fever'), false);

  medicine.selectedId = 'ors';
  scene.statusSystem.add('dehydration', 5000, 2);
  medicine.useSelected();
  assert.equal(scene.player.stamina, 85);
  assert.equal(scene.statusSystem.has('dehydration'), false);
});
