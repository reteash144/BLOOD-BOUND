export class StatusSystem {
  constructor(scene, definitions = []) {
    this.scene = scene;
    this.definitions = new Map(definitions.map((entry) => [entry.id, entry]));
    this.active = new Map();
  }

  add(id, duration, severity = 1) {
    const definition = this.definitions.get(id);
    if (!definition) return;
    const current = this.active.get(id);
    this.active.set(id, {
      id,
      name: definition.name,
      remaining: Math.max(duration, current?.remaining ?? 0),
      severity: Math.max(severity, current?.severity ?? 0),
      consequence: definition.consequence,
      managedBy: definition.managedBy
    });
    this.scene.events.emit('status-changed', this.list());
  }

  reduce(id, amount = 1) {
    const status = this.active.get(id);
    if (!status) return false;
    status.severity = Math.max(0, status.severity - amount);
    if (status.severity === 0) this.active.delete(id);
    this.scene.events.emit('status-changed', this.list());
    return true;
  }

  clear(id) {
    const changed = this.active.delete(id);
    if (changed) this.scene.events.emit('status-changed', this.list());
    return changed;
  }

  has(id) { return this.active.has(id); }
  severity(id) { return this.active.get(id)?.severity ?? 0; }
  list() { return [...this.active.values()].map((item) => ({ ...item })); }

  update(delta) {
    let changed = false;
    for (const [id, status] of this.active) {
      status.remaining -= delta;
      if (status.remaining <= 0) {
        this.active.delete(id);
        changed = true;
      }
    }
    if (changed) this.scene.events.emit('status-changed', this.list());
  }
}
