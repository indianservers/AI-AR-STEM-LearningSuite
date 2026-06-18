import { NewtonLab }          from './NewtonLab.js';
import { GravityLab }         from './GravityLab.js';
import { ProjectileLab }      from './ProjectileLab.js';
import { WaveLab }            from './WaveLab.js';
import { OpticsLab }          from './OpticsLab.js';
import { PendulumLab }        from './PendulumLab.js';
import { EMFieldLab }         from './EMFieldLab.js';
import { FluidSim }           from './FluidSim.js';
import { RelativityViz }      from './RelativityViz.js';
import { CircuitBuilder }     from './CircuitBuilder.js';
import { ThermalSim }         from './ThermalSim.js';
import { QuantumCollapse }    from './QuantumCollapse.js';
import { BlackHoleLensing }   from './BlackHoleLensing.js';
import { NeuronSimulator }    from './NeuronSimulator.js';
import { KeplerOrbitDesigner } from './KeplerOrbitDesigner.js';
import { NavierStokesSmoke }  from './NavierStokesSmoke.js';

export class PhysicsModule {
  constructor(scene, interaction, environment) {
    this._labs = {
      newton:     new NewtonLab(scene, interaction, environment),
      gravity:    new GravityLab(scene, interaction, environment),
      projectile: new ProjectileLab(scene, interaction, environment),
      waves:      new WaveLab(scene, interaction, environment),
      optics:     new OpticsLab(scene, interaction, environment),
      pendulum:   new PendulumLab(scene, interaction, environment),
      emfield:    new EMFieldLab(scene, interaction, environment),
      fluid:      new FluidSim(scene, interaction, environment),
      relativity: new RelativityViz(scene, interaction, environment),
      circuit:    new CircuitBuilder(scene, interaction, environment),
      thermal:    new ThermalSim(scene, interaction, environment),
      quantum:    new QuantumCollapse(scene, interaction, environment),
      blackhole:  new BlackHoleLensing(scene, interaction, environment),
      neuron:     new NeuronSimulator(scene, interaction, environment),
      kepler:     new KeplerOrbitDesigner(scene, interaction, environment),
      smoke:      new NavierStokesSmoke(scene, interaction, environment),
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
