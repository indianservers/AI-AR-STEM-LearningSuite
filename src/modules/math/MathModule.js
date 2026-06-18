import { FunctionPlotter3D }  from './FunctionPlotter3D.js';
import { GraphPlotter2D }    from './GraphPlotter2D.js';
import { GeometryLab }       from './GeometryLab.js';
import { CalculusViz }       from './CalculusViz.js';
import { VectorLab }         from './VectorLab.js';
import { TrigCircle }        from './TrigCircle.js';
import { ComplexPlane }      from './ComplexPlane.js';
import { LinearAlgebraLab }  from './LinearAlgebraLab.js';
import { FractalExplorer }   from './FractalExplorer.js';

export class MathModule {
  constructor(scene, interaction, environment) {
    this._labs = {
      function3d: new FunctionPlotter3D(scene, interaction, environment),
      graph2d:    new GraphPlotter2D(scene, interaction, environment),
      geometry:   new GeometryLab(scene, interaction, environment),
      calculus:   new CalculusViz(scene, interaction, environment),
      vectors:    new VectorLab(scene, interaction, environment),
      trig:       new TrigCircle(scene, interaction, environment),
      complex:    new ComplexPlane(scene, interaction, environment),
      linearalg:  new LinearAlgebraLab(scene, interaction, environment),
      fractal:    new FractalExplorer(scene, interaction, environment),
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
