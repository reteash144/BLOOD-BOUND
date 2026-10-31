export class DiagnosticSystem {
  constructor(scene, pathogenData = {}) {
    this.scene = scene;
    this.pathogens = pathogenData;
    this.targetId = 'malaria';
    this.identifiedId = null;
  }

  get target() { return this.pathogens[this.targetId] ?? null; }
  get isIdentified() { return this.identifiedId === this.targetId; }
  getClues() { return [...(this.target?.clues ?? [])]; }
  getObservedSymptoms() { return [...(this.target?.observedSymptoms ?? [])]; }
  getNote() { return this.target?.diagnosticNote ?? ''; }

  identify(candidateId) {
    if (candidateId !== this.targetId) return false;
    this.identifiedId = candidateId;
    this.scene.events.emit('pathogen-identified', { id: candidateId, pathogen: this.target });
    return true;
  }
}
