// Feature 22: Screenshot & Share — canvas capture + share card
export class ScreenshotShare {
  constructor(engine, scene) {
    this._engine = engine;
    this._scene = scene;
  }

  capture(label = 'CosmicLearn') {
    const canvas = this._engine.getRenderingCanvas();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      this._showShareCard(url, label);
    }, 'image/png');
  }

  _showShareCard(imgUrl, label) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9500;
      background:rgba(5,10,26,0.92); backdrop-filter:blur(12px);
      display:flex; align-items:center; justify-content:center; flex-direction:column; gap:20px;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(10,20,40,0.95); border:1px solid rgba(0,212,255,0.4);
      border-radius:20px; padding:24px; text-align:center; max-width:480px; width:90%;
      box-shadow:0 0 60px rgba(0,212,255,0.2);
    `;

    const title = document.createElement('p');
    title.textContent = label + ' — CosmicLearn';
    title.style.cssText = 'color:#00d4ff; font-size:0.85rem; letter-spacing:0.1em; margin-bottom:14px;';

    const img = document.createElement('img');
    img.src = imgUrl;
    img.style.cssText = 'width:100%; border-radius:10px; margin-bottom:16px;';

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:12px; justify-content:center;';

    const dlBtn = document.createElement('a');
    dlBtn.href = imgUrl;
    dlBtn.download = 'cosmiclearn-' + Date.now() + '.png';
    dlBtn.textContent = '⬇ Download';
    dlBtn.style.cssText = `
      background:linear-gradient(135deg,#0090cc,#005fa0); color:#fff; border:none;
      border-radius:10px; padding:10px 24px; font-size:0.88rem; font-weight:600;
      cursor:pointer; text-decoration:none; display:inline-block;
    `;

    const shareBtn = document.createElement('button');
    shareBtn.textContent = '↗ Share';
    shareBtn.style.cssText = `
      background:transparent; color:#00d4ff; border:1px solid rgba(0,212,255,0.4);
      border-radius:10px; padding:10px 24px; font-size:0.88rem; cursor:pointer;
    `;
    shareBtn.onclick = async () => {
      if (navigator.share) {
        const file = new File([await fetch(imgUrl).then(r=>r.blob())], 'cosmiclearn.png', {type:'image/png'});
        navigator.share({ title: 'CosmicLearn — ' + label, files: [file] }).catch(()=>{});
      }
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
      background:transparent; color:#7ba3cc; border:1px solid rgba(255,255,255,0.1);
      border-radius:10px; padding:10px 20px; font-size:0.85rem; cursor:pointer;
    `;
    closeBtn.onclick = () => { overlay.remove(); URL.revokeObjectURL(imgUrl); };

    btnRow.append(dlBtn, shareBtn, closeBtn);
    card.append(title, img, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
}
