export class MedicineSystem {
  constructor(scene, medicines = []) {
    this.scene = scene;
    this.medicines = medicines;
    this.selectedId = medicines[0]?.id ?? null;
    this.cooldowns = new Map();
  }

  get selected() { return this.medicines.find((item) => item.id === this.selectedId) ?? null; }
  getById(id) { return this.medicines.find((item) => item.id === id) ?? null; }
  remaining(id) { return Math.max(0, this.cooldowns.get(id) ?? 0); }

  canUse(id) {
    const medicine = this.getById(id);
    if (!medicine || this.remaining(id) > 0) return false;
    if (medicine.requiresDiagnosis && !this.scene.diagnosisComplete) return false;
    return true;
  }

  useSelected() {
    const medicine = this.selected;
    if (!medicine) return this.scene.ui.toast('NO TREATMENT SELECTED');
    if (!this.canUse(medicine.id)) {
      if (medicine.requiresDiagnosis && !this.scene.diagnosisComplete) return this.scene.ui.toast('IDENTIFY MALARIA BEFORE TARGETED TREATMENT');
      return this.scene.ui.toast('TREATMENT RECHARGING');
    }
    const player = this.scene.player;
    if (medicine.id === 'artemether-lumefantrine') {
      if (!this.scene.boss || this.scene.boss.dead) return this.scene.ui.toast('NO MALARIA TARGET IN RANGE');
      this.scene.boss.takeDamage(115, -this.scene.boss.facing * 250, 900, true);
      this.scene.boss.weakenedUntil = this.scene.time.now + 9000;
      this.scene.statusSystem.reduce('anaemia', 1);
      this.scene.ui.toast('TARGETED ANTIPARASITIC EFFECT // BOSS WEAKENED');
    } else if (medicine.id === 'paracetamol') {
      const cleared = this.scene.statusSystem.reduce('fever', 2);
      player.statusReliefFlash = 800;
      this.scene.ui.toast(cleared ? 'FEVER PENALTY REDUCED' : 'NO FEVER PENALTY TO MANAGE');
    } else if (medicine.id === 'ors') {
      player.stamina = Math.min(player.maxStamina, player.stamina + 65);
      this.scene.statusSystem.reduce('dehydration', 2);
      player.statusReliefFlash = 800;
      this.scene.ui.toast('HYDRATION SUPPORT // STAMINA RESTORED');
    }
    this.cooldowns.set(medicine.id, medicine.cooldown);
    this.scene.events.emit('medicine-used', medicine.id);
    return true;
  }

  update(delta) {
    for (const [id, remaining] of this.cooldowns) {
      const next = remaining - delta;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }
  }
}
