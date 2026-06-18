import { PeriodicTable3D }  from './PeriodicTable3D.js';
import { MoleculeViewer }   from './MoleculeViewer.js';
import { AtomicModel }      from './AtomicModel.js';
import { BondingViz }       from './BondingViz.js';
import { OrbitalViewer }    from './OrbitalViewer.js';
import { CrystalLattice }   from './CrystalLattice.js';
import { ReactionAnimator } from './ReactionAnimator.js';
import { ReactionEnergy }   from './ReactionEnergy.js';
import { Spectroscopy }     from './Spectroscopy.js';
import { ProteinViewer }    from './ProteinViewer.js';
import { TitrationSim }     from './TitrationSim.js';

export class ChemModule {
  constructor(scene, interaction, environment) {
    this._labs = {
      periodic:   new PeriodicTable3D(scene, interaction, environment),
      molecules:  new MoleculeViewer(scene, interaction, environment),
      atomic:     new AtomicModel(scene, interaction, environment),
      bonding:    new BondingViz(scene, interaction, environment),
      orbitals:   new OrbitalViewer(scene, interaction, environment),
      crystal:    new CrystalLattice(scene, interaction, environment),
      reactions:  new ReactionAnimator(scene, interaction, environment),
      rxnEnergy:  new ReactionEnergy(scene, interaction, environment),
      spectro:    new Spectroscopy(scene, interaction, environment),
      protein:    new ProteinViewer(scene, interaction, environment),
      titration:  new TitrationSim(scene, interaction, environment),
    };
    this._active = null;
  }

  showTopic(topicId) {
    this._active?.hide();
    this._active = this._labs[topicId] || null;
    this._active?.show();
  }

  hide() {
    this._active?.hide();
    this._active = null;
  }

  update(deltaTime) {
    this._active?.update(deltaTime);
  }

  getActiveLab() {
    return this._active;
  }
}
