/**
 * Molecular data in ball-and-stick format.
 * atoms: [ { symbol, x, y, z } ] — positions in Angstroms from center
 * bonds: [ [atomIndexA, atomIndexB, order] ] — order: 1=single, 2=double, 3=triple
 * cpkColors come from elements.js
 */

export const MOLECULES = {
  water: {
    name: 'Water',
    formula: 'H₂O',
    description: 'The molecule of life. Bent geometry (104.5°), highly polar.',
    atoms: [
      { sym: 'O', x: 0,     y: 0,     z: 0 },
      { sym: 'H', x: 0.96,  y: 0,     z: 0.37 },
      { sym: 'H', x: -0.96, y: 0,     z: 0.37 },
    ],
    bonds: [[0,1,1],[0,2,1]],
  },

  co2: {
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    description: 'Linear molecule, two double bonds. Key greenhouse gas.',
    atoms: [
      { sym: 'O', x: -1.16, y: 0, z: 0 },
      { sym: 'C', x: 0,     y: 0, z: 0 },
      { sym: 'O', x: 1.16,  y: 0, z: 0 },
    ],
    bonds: [[0,1,2],[1,2,2]],
  },

  methane: {
    name: 'Methane',
    formula: 'CH₄',
    description: 'Tetrahedral geometry (109.5°). Simplest hydrocarbon.',
    atoms: [
      { sym: 'C', x: 0,     y: 0,     z: 0 },
      { sym: 'H', x: 0.63,  y: 0.63,  z: 0.63 },
      { sym: 'H', x: -0.63, y: -0.63, z: 0.63 },
      { sym: 'H', x: -0.63, y: 0.63,  z: -0.63 },
      { sym: 'H', x: 0.63,  y: -0.63, z: -0.63 },
    ],
    bonds: [[0,1,1],[0,2,1],[0,3,1],[0,4,1]],
  },

  ammonia: {
    name: 'Ammonia',
    formula: 'NH₃',
    description: 'Trigonal pyramidal. Lone pair on nitrogen makes it a base.',
    atoms: [
      { sym: 'N', x: 0,     y: 0.12,  z: 0 },
      { sym: 'H', x: 0.94,  y: -0.36, z: 0 },
      { sym: 'H', x: -0.47, y: -0.36, z: 0.82 },
      { sym: 'H', x: -0.47, y: -0.36, z: -0.82 },
    ],
    bonds: [[0,1,1],[0,2,1],[0,3,1]],
  },

  oxygen: {
    name: 'Oxygen',
    formula: 'O₂',
    description: 'Diatomic oxygen — double bond. Paramagnetic.',
    atoms: [
      { sym: 'O', x: -0.6, y: 0, z: 0 },
      { sym: 'O', x:  0.6, y: 0, z: 0 },
    ],
    bonds: [[0,1,2]],
  },

  nitrogen: {
    name: 'Nitrogen',
    formula: 'N₂',
    description: 'Triple bond — extremely strong (946 kJ/mol).',
    atoms: [
      { sym: 'N', x: -0.55, y: 0, z: 0 },
      { sym: 'N', x:  0.55, y: 0, z: 0 },
    ],
    bonds: [[0,1,3]],
  },

  hcl: {
    name: 'Hydrogen Chloride',
    formula: 'HCl',
    description: 'Highly polar single bond. Strong acid in water.',
    atoms: [
      { sym: 'H',  x: -0.63, y: 0, z: 0 },
      { sym: 'Cl', x:  0.63, y: 0, z: 0 },
    ],
    bonds: [[0,1,1]],
  },

  benzene: {
    name: 'Benzene',
    formula: 'C₆H₆',
    description: 'Aromatic ring with delocalized π electrons. Planar hexagonal.',
    atoms: [
      { sym: 'C', x: 1.40,  y: 0,     z: 0 },
      { sym: 'C', x: 0.70,  y: 1.21,  z: 0 },
      { sym: 'C', x: -0.70, y: 1.21,  z: 0 },
      { sym: 'C', x: -1.40, y: 0,     z: 0 },
      { sym: 'C', x: -0.70, y: -1.21, z: 0 },
      { sym: 'C', x: 0.70,  y: -1.21, z: 0 },
      { sym: 'H', x: 2.48,  y: 0,     z: 0 },
      { sym: 'H', x: 1.24,  y: 2.15,  z: 0 },
      { sym: 'H', x: -1.24, y: 2.15,  z: 0 },
      { sym: 'H', x: -2.48, y: 0,     z: 0 },
      { sym: 'H', x: -1.24, y: -2.15, z: 0 },
      { sym: 'H', x: 1.24,  y: -2.15, z: 0 },
    ],
    bonds: [[0,1,1],[1,2,2],[2,3,1],[3,4,2],[4,5,1],[5,0,2],
            [0,6,1],[1,7,1],[2,8,1],[3,9,1],[4,10,1],[5,11,1]],
  },

  ethanol: {
    name: 'Ethanol',
    formula: 'C₂H₅OH',
    description: 'The alcohol in drinks. Hydroxyl group makes it miscible with water.',
    atoms: [
      { sym: 'C', x: -0.77, y: 0,    z: 0 },
      { sym: 'C', x:  0.77, y: 0,    z: 0 },
      { sym: 'O', x:  1.21, y: 1.18, z: 0 },
      { sym: 'H', x: -1.17, y: 1.03, z: 0 },
      { sym: 'H', x: -1.17, y: -0.5, z: 0.87 },
      { sym: 'H', x: -1.17, y: -0.5, z: -0.87 },
      { sym: 'H', x:  1.17, y: -0.5, z: 0.87 },
      { sym: 'H', x:  1.17, y: -0.5, z: -0.87 },
      { sym: 'H', x:  2.16, y: 1.18, z: 0 },
    ],
    bonds: [[0,1,1],[1,2,1],[0,3,1],[0,4,1],[0,5,1],[1,6,1],[1,7,1],[2,8,1]],
  },

  glucose: {
    name: 'Glucose',
    formula: 'C₆H₁₂O₆',
    description: 'The sugar that powers life. Ring form (pyranose).',
    atoms: [
      { sym: 'O', x:  0,    y: 0,    z: 0 },
      { sym: 'C', x:  1.43, y: 0,    z: 0 },
      { sym: 'C', x:  1.96, y: 1.37, z: 0 },
      { sym: 'C', x:  1.23, y: 2.38, z: 0.74 },
      { sym: 'C', x: -0.27, y: 2.20, z: 0.48 },
      { sym: 'C', x: -0.79, y: 1.08, z: -0.40 },
      { sym: 'O', x:  1.96, y: 3.57, z: 0.38 },
      { sym: 'O', x: -1.00, y: 3.28, z: 0.73 },
      { sym: 'O', x: -2.19, y: 0.90, z: -0.15 },
      { sym: 'O', x:  2.00, y: -0.70, z: -0.83 },
    ],
    bonds: [[0,1,1],[1,2,1],[2,3,1],[3,4,1],[4,5,1],[5,0,1],
            [3,6,1],[4,7,1],[5,8,1],[1,9,1]],
  },

  nacl: {
    name: 'Sodium Chloride',
    formula: 'NaCl',
    description: 'Ionic compound — table salt. Na⁺ donates electron to Cl⁻.',
    atoms: [
      { sym: 'Na', x: -1.18, y: 0, z: 0 },
      { sym: 'Cl', x:  1.18, y: 0, z: 0 },
    ],
    bonds: [[0,1,1]],
  },

  caffeine: {
    name: 'Caffeine',
    formula: 'C₈H₁₀N₄O₂',
    description: 'World\'s most popular psychoactive compound. Adenosine antagonist.',
    atoms: [
      { sym: 'N', x:  0,    y:  0,    z: 0 },
      { sym: 'C', x:  1.38, y:  0,    z: 0 },
      { sym: 'N', x:  2.11, y:  1.16, z: 0 },
      { sym: 'C', x:  1.38, y:  2.30, z: 0 },
      { sym: 'C', x:  0,    y:  2.31, z: 0 },
      { sym: 'C', x: -0.71, y:  1.13, z: 0 },
      { sym: 'N', x: -0.70, y: -1.10, z: 0 },
      { sym: 'C', x: -2.10, y: -1.13, z: 0 },
      { sym: 'N', x: -2.10, y:  1.14, z: 0 },
      { sym: 'C', x:  1.97, y: -1.19, z: 0 },
      { sym: 'O', x:  2.00, y:  3.38, z: 0 },
      { sym: 'O', x: -2.70, y: -2.17, z: 0 },
      { sym: 'C', x:  0,    y: -2.37, z: 0 },
      { sym: 'C', x: -3.41, y:  1.16, z: 0 },
    ],
    bonds: [[0,1,1],[1,2,2],[2,3,1],[3,4,2],[4,5,1],[5,0,1],
            [0,6,1],[6,7,1],[7,8,2],[8,5,1],[1,9,1],[3,10,2],
            [7,11,2],[6,12,1],[8,13,1]],
  },

  dna_base_at: {
    name: 'DNA Base Pair (A-T)',
    formula: 'Adenine–Thymine',
    description: 'Adenine (2 H-bonds) pairs with Thymine. A-T base pair from DNA.',
    atoms: [
      // Adenine
      { sym: 'N', x: -3.0,  y:  0.5,  z: 0 },
      { sym: 'C', x: -2.0,  y:  1.3,  z: 0 },
      { sym: 'N', x: -0.9,  y:  0.8,  z: 0 },
      { sym: 'C', x: -0.9,  y: -0.5,  z: 0 },
      { sym: 'C', x: -2.0,  y: -1.3,  z: 0 },
      { sym: 'N', x: -3.0,  y: -0.8,  z: 0 },
      { sym: 'N', x:  0.2,  y:  1.5,  z: 0 },
      { sym: 'C', x:  1.2,  y:  0.8,  z: 0 },
      { sym: 'N', x:  1.2,  y: -0.5,  z: 0 },
      { sym: 'N', x: -2.0,  y:  2.7,  z: 0 },
      // Thymine
      { sym: 'N', x:  2.5,  y: -0.8,  z: 0 },
      { sym: 'C', x:  3.5,  y: -0.2,  z: 0 },
      { sym: 'C', x:  3.5,  y:  1.2,  z: 0 },
      { sym: 'C', x:  2.5,  y:  1.8,  z: 0 },
      { sym: 'N', x:  2.5,  y: -2.2,  z: 0 },
      { sym: 'O', x:  4.5,  y: -0.7,  z: 0 },
      { sym: 'O', x:  2.5,  y:  3.0,  z: 0 },
    ],
    bonds: [[0,1,1],[1,2,2],[2,3,1],[3,4,2],[4,5,1],[5,0,1],
            [2,6,1],[6,7,2],[7,8,1],[8,3,1],[1,9,1],
            [10,11,1],[11,12,2],[12,13,1],[13,14,1],[14,10,1],
            [11,15,2],[13,16,2],[8,10,1]],
  },
};

// CPK color map for atom symbols
export const CPK_COLORS = {
  H:  '#ffffff', C:  '#909090', N:  '#3050f8', O:  '#ff0d0d',
  F:  '#90e050', Cl: '#1ff01f', Br: '#a62929', I:  '#940094',
  S:  '#ffff30', P:  '#ff8000', Na: '#ab5cf2', K:  '#8f40d4',
  Ca: '#3dff00', Mg: '#8aff00', Fe: '#e06633', Cu: '#c88033',
  Zn: '#7d80b0', Ag: '#c0c0c0', Au: '#ffd123', Pt: '#d0d0e0',
  default: '#ff69b4',
};

export function getMolecule(id) { return MOLECULES[id]; }
export function listMolecules() { return Object.keys(MOLECULES); }
