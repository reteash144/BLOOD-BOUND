export class HUD {
  constructor() {
    if (HUD.instance) return HUD.instance;
    this.el = (id) => document.getElementById(id);
    this.toastTimer = null;
    let showControls = false;
    try { showControls = localStorage.getItem('bloodbound-show-controls') === 'true'; } catch { /* Storage is optional. */ }
    this.el('help-panel').classList.toggle('hidden', !showControls);
    this.el('help-toggle').addEventListener('click', () => {
      const panel = this.el('help-panel');
      panel.classList.toggle('hidden');
      try { localStorage.setItem('bloodbound-show-controls', String(!panel.classList.contains('hidden'))); } catch { /* Storage is optional. */ }
    });
    this.el('help-close').addEventListener('click', () => {
      this.el('help-panel').classList.add('hidden');
      try { localStorage.setItem('bloodbound-show-controls', 'false'); } catch { /* Storage is optional. */ }
    });
    HUD.instance = this;
  }

  showHud(visible = true) {
    this.el('hud').classList.toggle('hidden', !visible);
    this.el('help-toggle').classList.toggle('hidden', !visible);
    if (!visible) this.el('help-panel').classList.add('hidden');
    else {
      try { this.el('help-panel').classList.toggle('hidden', localStorage.getItem('bloodbound-show-controls') !== 'true'); } catch { this.el('help-panel').classList.add('hidden'); }
    }
  }

  updatePlayer(player) {
    this.setMeter('health', player.health / player.maxHealth, Math.ceil(player.health));
    this.setMeter('stamina', player.stamina / player.maxStamina, Math.ceil(player.stamina));
    this.setMeter('energy', player.energy / 100, Math.ceil(player.energy));
  }

  setMeter(name, fraction, value) {
    const fill = this.el(`${name}-fill`);
    const label = this.el(`${name}-value`);
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`;
    if (label) label.textContent = String(value);
  }

  updateBoss(boss) {
    this.el('boss-name').textContent = boss?.name ?? 'MALARIA';
    this.el('boss-fill').style.width = `${boss ? Math.max(0, boss.health / boss.maxHealth * 100) : 0}%`;
    this.el('boss-phase').textContent = boss ? `PHASE ${boss.phase}` : 'NOT DETECTED';
  }

  setObjective(text) { this.el('objective-text').textContent = text; }

  updateSymptoms(statuses) {
    const root = this.el('symptom-list');
    root.replaceChildren();
    if (!statuses.length) {
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = 'NONE DETECTED';
      root.append(span);
      return;
    }
    for (const status of statuses) {
      const chip = document.createElement('span');
      chip.className = 'symptom-chip';
      chip.textContent = `${status.name} ×${status.severity}`;
      chip.title = status.consequence;
      root.append(chip);
    }
  }

  toast(message) {
    const toast = this.el('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }

  showPause() { this.el('pause-menu').classList.remove('hidden'); }
  hidePause() { this.el('pause-menu').classList.add('hidden'); }

  openMedicine(medicines, selectedId, onSelect, onDeploy, onClose, canUse, cooldown) {
    const panel = this.el('medicine-panel');
    const root = this.el('medicine-options');
    root.replaceChildren();
    for (const medicine of medicines) {
      const button = document.createElement('button');
      button.className = `medicine-option ${medicine.id === selectedId ? 'selected' : ''}`;
      button.type = 'button';
      const title = document.createElement('strong');
      title.textContent = medicine.name;
      const category = document.createElement('small');
      category.textContent = medicine.category;
      button.append(title, category);
      button.addEventListener('click', () => {
        onSelect(medicine.id);
        this.openMedicine(medicines, medicine.id, onSelect, onDeploy, onClose, canUse, cooldown);
      });
      root.append(button);
    }
    const selected = medicines.find((item) => item.id === selectedId);
    const detail = this.el('medicine-detail');
    if (selected) {
      const eligible = canUse(selected.id);
      const remaining = cooldown(selected.id);
      detail.textContent = `${selected.role} ${selected.gameEffect} ${eligible ? 'READY FOR DEPLOYMENT.' : remaining > 0 ? `RECHARGE: ${Math.ceil(remaining / 1000)}s.` : 'REQUIRES MALARIA IDENTIFICATION.'}`;
    }
    this.el('deploy-medicine').onclick = onDeploy;
    this.el('close-medicine').onclick = onClose;
    panel.classList.remove('hidden');
  }

  closeMedicine() { this.el('medicine-panel').classList.add('hidden'); }

  openDiagnostic(onChoose, diagnosticData = {}) {
    const panel = this.el('diagnostic-panel');
    const symptoms = this.el('diagnostic-symptoms');
    symptoms.replaceChildren();
    (diagnosticData.symptoms ?? ['Fever-like episodes', 'Reduced stamina', 'Red-cell rupture signatures']).forEach((label) => {
      const li = document.createElement('li'); li.textContent = label; symptoms.append(li);
    });
    const clueList = panel.querySelector('.diagnostic-grid > div:nth-child(2) ul');
    clueList.replaceChildren();
    (diagnosticData.clues ?? []).forEach((label) => {
      const li = document.createElement('li'); li.textContent = label; clueList.append(li);
    });
    const note = panel.querySelector('.panel-subtitle');
    if (diagnosticData.note) note.textContent = diagnosticData.note;
    const feedback = this.el('diagnostic-feedback');
    feedback.textContent = 'Select the most likely pathogen from the available clues.';
    panel.querySelectorAll('[data-diagnosis]').forEach((button) => {
      button.disabled = false;
      button.onclick = () => {
        const correct = onChoose(button.dataset.diagnosis);
        if (correct) {
          feedback.textContent = 'MALARIA IDENTIFIED. Targeted antimalarial mechanic unlocked.';
          feedback.style.color = '#91e1bd';
          panel.querySelectorAll('[data-diagnosis]').forEach((item) => item.disabled = true);
          setTimeout(() => panel.classList.add('hidden'), 1050);
        } else {
          feedback.textContent = 'INCORRECT CLASSIFICATION. Reassess the pathogen clues.';
          feedback.style.color = '#ff8798';
        }
      };
    });
    panel.classList.remove('hidden');
  }

  closeDiagnostic() { this.el('diagnostic-panel').classList.add('hidden'); }

  showEnd(won, stats, onRestart, onMenu) {
    this.el('end-screen').classList.remove('hidden');
    this.el('end-eyebrow').textContent = won ? 'MISSION REPORT // PATHOGEN CONTAINED' : 'MISSION REPORT // OPERATIVE LOST';
    this.el('end-title').textContent = won ? 'BLOODSTREAM SECURED' : 'MISSION FAILED';
    this.el('end-copy').textContent = won
      ? 'The Blood Reaver is neutralized. The host survives this simulation.'
      : 'The operative has fallen. The pathogen remains active.';
    this.el('end-stats').textContent = `ELAPSED ${stats.elapsed}s   //   ENEMIES DEFEATED ${stats.kills}   //   DAMAGE TAKEN ${Math.round(stats.damage)}`;
    this.el('restart-end-button').onclick = onRestart;
    this.el('menu-end-button').onclick = onMenu;
  }

  hideEnd() { this.el('end-screen').classList.add('hidden'); }
}
